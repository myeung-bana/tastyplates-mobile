import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UploadState {
  status: UploadStatus
  progress: number
  message: string
  error: string | null
  isVisible: boolean
}

export interface UploadContextValue extends UploadState {
  startUpload: (totalFiles: number, customMessage?: string) => void
  updateProgress: (completed: number, total: number) => void
  completeUpload: () => void
  resetUpload: () => void
  setCustomMessage: (message: string) => void
}

const initialState: UploadState = {
  status: 'idle',
  progress: 0,
  message: 'Uploading...',
  error: null,
  isVisible: false,
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState)

  const startUpload = useCallback((totalFiles: number, customMessage?: string) => {
    const defaultMessage =
      totalFiles > 1 ? `Uploading ${totalFiles} images...` : 'Uploading image...'
    setState({
      status: 'uploading',
      progress: 0,
      message: customMessage ?? defaultMessage,
      error: null,
      isVisible: true,
    })
  }, [])

  const updateProgress = useCallback((completed: number, total: number) => {
    const uploadProgress = total > 0 ? Math.round((completed / total) * 90) : 0
    setState((prev) => ({
      ...prev,
      progress: uploadProgress,
      message: total > 1 ? `Uploading image ${completed}/${total}...` : prev.message,
    }))
  }, [])

  const setCustomMessage = useCallback((message: string) => {
    setState((prev) => ({ ...prev, message }))
  }, [])

  const completeUpload = useCallback(() => {
    setState((prev) => ({
      ...prev,
      message: 'Publishing review...',
      progress: 95,
    }))
    globalThis.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        progress: 100,
        message: 'Review published!',
        status: 'success',
      }))
      globalThis.setTimeout(() => {
        setState(initialState)
      }, 2000)
    }, 500)
  }, [])

  const resetUpload = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <UploadContext.Provider
      value={{
        ...state,
        startUpload,
        updateProgress,
        completeUpload,
        resetUpload,
        setCustomMessage,
      }}
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
