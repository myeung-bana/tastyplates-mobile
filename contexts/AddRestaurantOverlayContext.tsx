import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { AddRestaurantOverlayContent } from '@/components/studio/manage-lists/AddRestaurantOverlayContent'

export interface OpenAddRestaurantOptions {
  listUuid: string
  listTitle?: string
}

interface AddRestaurantOverlayContextValue {
  openAddRestaurant: (opts: OpenAddRestaurantOptions) => void
  closeAddRestaurant: () => void
  isOpen: boolean
}

const AddRestaurantOverlayContext = createContext<AddRestaurantOverlayContextValue | null>(null)

export function useAddRestaurantOverlay(): AddRestaurantOverlayContextValue {
  const ctx = useContext(AddRestaurantOverlayContext)
  if (!ctx) {
    throw new Error('useAddRestaurantOverlay must be used within AddRestaurantOverlayProvider')
  }
  return ctx
}

export function AddRestaurantOverlayProvider({ children }: PropsWithChildren): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [opts, setOpts] = useState<OpenAddRestaurantOptions | null>(null)

  const openAddRestaurant = useCallback((next: OpenAddRestaurantOptions) => {
    setOpts(next)
    setIsOpen(true)
  }, [])

  const closeAddRestaurant = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ openAddRestaurant, closeAddRestaurant, isOpen }),
    [openAddRestaurant, closeAddRestaurant, isOpen],
  )

  return (
    <AddRestaurantOverlayContext.Provider value={value}>
      {children}
      {isOpen && opts ? (
        <AddRestaurantOverlayContent
          listUuid={opts.listUuid}
          listTitle={opts.listTitle}
          onClose={closeAddRestaurant}
        />
      ) : null}
    </AddRestaurantOverlayContext.Provider>
  )
}
