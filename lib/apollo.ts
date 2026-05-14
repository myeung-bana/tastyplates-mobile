import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { nhost } from './nhost'

const httpLink = new HttpLink({
  uri: nhost.graphql.httpUrl,
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})
