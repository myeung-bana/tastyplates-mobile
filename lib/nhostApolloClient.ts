import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  split,
  type NormalizedCacheObject,
  type RequestHandler,
  type WatchQueryFetchPolicy,
} from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import type { NhostClient } from '@nhost/nhost-js'
import { jwtDecode } from 'jwt-decode'
import { createClient as createGraphqlWsClient } from 'graphql-ws'

type TokenState = {
  value: string | null
  expiresAt?: Date | null
} | null

function createRestartableWsClient(options: Parameters<typeof createGraphqlWsClient>[0]) {
  let restartRequested = false
  let restart = () => {
    restartRequested = true
  }

  let connectionOpen = false
  let socket: WebSocket
  let timedOut: ReturnType<typeof setTimeout>

  const client = createGraphqlWsClient({
    ...options,
    on: {
      ...options.on,
      error: (error) => {
        console.error(error)
        options.on?.error?.(error)
        restart()
      },
      ping: (received) => {
        if (!received) {
          timedOut = setTimeout(() => {
            client.terminate()
            restart()
          }, 5000)
        }
      },
      pong: (received) => {
        if (received) clearTimeout(timedOut)
      },
      opened: (openedSocket) => {
        socket = openedSocket as WebSocket
        options.on?.opened?.(openedSocket)
        connectionOpen = true
        restart = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(4205, 'Client Restart')
          } else {
            restartRequested = true
          }
        }
        if (restartRequested) {
          restartRequested = false
          restart()
        }
      },
      closed: (event) => {
        options.on?.closed?.(event)
        connectionOpen = false
      },
    },
  })

  return {
    ...client,
    restart: () => restart(),
    isOpen: () => connectionOpen,
  }
}

export type CreateNhostApolloClientOptions = {
  nhost: NhostClient
  graphqlUrl?: string
  headers?: Record<string, string>
  publicRole?: string
  fetchPolicy?: WatchQueryFetchPolicy
  cache?: InMemoryCache
  onError?: RequestHandler
  link?: ApolloLink
  generateLinks?: (links: (ApolloLink | RequestHandler)[]) => (ApolloLink | RequestHandler)[]
}

/**
 * Nhost Apollo client — same behavior as `@nhost/apollo` but uses Apollo 3.14+
 * `devtools.enabled` instead of deprecated `connectToDevTools`.
 */
export function createNhostApolloClient({
  nhost,
  graphqlUrl,
  headers = {},
  publicRole = 'public',
  fetchPolicy,
  cache = new InMemoryCache(),
  onError,
  link: customLink,
  generateLinks,
}: CreateNhostApolloClientOptions): ApolloClient<NormalizedCacheObject> {
  const isBrowser = typeof window !== 'undefined'
  const httpUrl = graphqlUrl ?? nhost.graphql.httpUrl
  if (!httpUrl) {
    throw new Error("Can't initialize the Apollo Client: no backend URL has been provided")
  }

  const authInterpreter = nhost.auth.client.interpreter
  let accessToken: TokenState = null

  const tokenStillValid = () => {
    if (!accessToken?.value) return false
    const skewMs = 3_000
    return jwtDecode<{ exp: number }>(accessToken.value).exp * 1000 > Date.now() - skewMs
  }

  const sessionFresh = () =>
    Boolean(accessToken?.value) &&
    Boolean(accessToken?.expiresAt) &&
    (accessToken?.expiresAt ?? new Date(0)) > new Date() &&
    tokenStillValid()

  const waitForSession = async (): Promise<void> => {
    if (sessionFresh()) return
    const poll = async (): Promise<void> => {
      if (sessionFresh()) return
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 100)
      })
      return poll()
    }
    await poll()
  }

  const buildAuthHeaders = async (): Promise<Record<string, string>> => {
    await waitForSession()
    const next: Record<string, string> = {
      ...headers,
      'Sec-WebSocket-Protocol': 'graphql-ws',
    }
    if (accessToken?.value) {
      next.authorization = `Bearer ${accessToken.value}`
    } else {
      next.role = publicRole
    }
    return next
  }

  const wsClient = isBrowser
    ? createRestartableWsClient({
        url: httpUrl.startsWith('https')
          ? httpUrl.replace(/^https/, 'wss')
          : httpUrl.replace(/^http/, 'ws'),
        shouldRetry: () => true,
        retryAttempts: 100,
        retryWait: async (retries) =>
          new Promise((resolve) =>
            setTimeout(resolve, 1000 * 2 ** retries + Math.floor(Math.random() * 3000)),
          ),
        connectionParams: async () => ({
          headers: {
            ...headers,
            ...(await buildAuthHeaders()),
          },
        }),
      })
    : null

  const wsLink = wsClient ? new GraphQLWsLink(wsClient) : null
  const authLink = setContext(async (_, { headers: ctxHeaders }) => ({
    headers: {
      ...ctxHeaders,
      ...(await buildAuthHeaders()),
    },
  }))
  const httpLink = authLink.concat(new HttpLink({ uri: httpUrl }))
  const splitLink = wsLink
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query)
          const { kind, operation } = definition as {
            kind: string
            operation?: string
          }
          return kind === 'OperationDefinition' && operation === 'subscription'
        },
        wsLink,
        httpLink,
      )
    : httpLink

  const links: (ApolloLink | RequestHandler)[] = []
  if (onError) links.push(onError)
  if (customLink) links.push(customLink)
  links.push(splitLink)

  const client = new ApolloClient({
    cache,
    ssrMode: !isBrowser,
    defaultOptions: fetchPolicy
      ? {
          watchQuery: { fetchPolicy },
        }
      : undefined,
    devtools: { enabled: isBrowser && process.env.NODE_ENV === 'development' },
    link: ApolloLink.from(generateLinks ? generateLinks(links) : links),
  })

  authInterpreter?.onTransition(async (_state, event) => {
    if (!['SIGNOUT', 'SIGNED_IN', 'TOKEN_CHANGED'].includes(event.type)) return

    if (
      event.type === 'SIGNOUT' ||
      (event.type === 'TOKEN_CHANGED' && _state.context.accessToken.value === null)
    ) {
      accessToken = null
      try {
        await client.resetStore()
      } catch (error) {
        console.error('Error resetting Apollo client cache')
        console.error(error)
      }
      return
    }

    accessToken = {
      value: _state.context.accessToken.value,
      expiresAt: _state.context.accessToken.expiresAt,
    }
    if (!isBrowser || !wsClient?.isOpen()) return
    wsClient.restart()
  })

  return client
}
