import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type EditProfileDraftContextValue = {
  selectedPalates: Set<string>
  setSelectedPalates: (next: Set<string>) => void
  togglePalate: (key: string, max: number) => void
  /** Snapshot before opening the palate picker (for Cancel). */
  openPalatePicker: () => void
  cancelPalatePicker: () => void
}

const EditProfileDraftContext = createContext<EditProfileDraftContextValue | null>(null)

export function EditProfileDraftProvider({ children }: { children: ReactNode }): JSX.Element {
  const [selectedPalates, setSelectedPalatesState] = useState<Set<string>>(() => new Set())
  const pickerSnapshotRef = useRef<string[]>([])

  const setSelectedPalates = useCallback((next: Set<string>) => {
    setSelectedPalatesState(new Set(next))
  }, [])

  const togglePalate = useCallback((key: string, max: number) => {
    setSelectedPalatesState((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      if (next.size >= max) return prev
      next.add(key)
      return next
    })
  }, [])

  const openPalatePicker = useCallback(() => {
    pickerSnapshotRef.current = Array.from(selectedPalates)
  }, [selectedPalates])

  const cancelPalatePicker = useCallback(() => {
    setSelectedPalatesState(new Set(pickerSnapshotRef.current))
  }, [])

  const value = useMemo(
    () => ({
      selectedPalates,
      setSelectedPalates,
      togglePalate,
      openPalatePicker,
      cancelPalatePicker,
    }),
    [selectedPalates, setSelectedPalates, togglePalate, openPalatePicker, cancelPalatePicker],
  )

  return (
    <EditProfileDraftContext.Provider value={value}>{children}</EditProfileDraftContext.Provider>
  )
}

export function useEditProfileDraft(): EditProfileDraftContextValue {
  const ctx = useContext(EditProfileDraftContext)
  if (!ctx) {
    throw new Error('useEditProfileDraft must be used within EditProfileDraftProvider')
  }
  return ctx
}
