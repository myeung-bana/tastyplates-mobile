import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UploadState {
  status: UploadStatus
  progress: number
  error: string | null
}

interface UploadContextValue extends UploadState {
  startUpload: () => void
  setProgress: (progress: number) => void
  finishUpload: () => void
  failUpload: (error: string) => void
  resetUpload: () => void
}

const initialState: UploadState = {
  status: 'idle',
  progress: 0,
  error: null,
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState)

  const startUpload = useCallback(() => {
    setState({ status: 'uploading', progress: 0, error: null })
  }, [])

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress: Math.min(progress, 1) }))
  }, [])

  const finishUpload = useCallback(() => {
    setState({ status: 'success', progress: 1, error: null })
  }, [])

  const failUpload = useCallback((error: string) => {
    setState({ status: 'error', progress: 0, error })
  }, [])

  const resetUpload = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <UploadContext.Provider
      value={{ ...state, startUpload, setProgress, finishUpload, failUpload, resetUpload }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used within an UploadProvider')
  return ctx
}
