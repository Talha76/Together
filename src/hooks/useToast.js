import { useState, useCallback, useRef } from 'react'

let toastId = 0

export function useToast(maxToasts = 3) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismissToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId
    setToasts((prev) => {
      const next = [...prev, { id, message, type }]
      return next.length > maxToasts ? next.slice(-maxToasts) : next
    })
    timersRef.current[id] = setTimeout(() => dismissToast(id), duration)
    return id
  }, [maxToasts, dismissToast])

  return { toasts, showToast, dismissToast }
}
