import { useEffect, useRef } from 'react'
import * as api from '../services/api'

function useProctoring(interviewId, onViolation) {
  const callbackRef = useRef(onViolation)
  const reportingRef = useRef(false)

  useEffect(() => {
    callbackRef.current = onViolation
  }, [onViolation])

  useEffect(() => {
    if (!interviewId) return

    async function reportViolation(type, severity) {
      if (reportingRef.current) return
      reportingRef.current = true
      try {
        const response = await api.logProctoringEvent(interviewId, {
          type,
          severity,
          occurred: new Date().toISOString(),
        })
        callbackRef.current?.(type, response.data || {})
      } catch (err) {
        console.error('logProctoringEvent failed:', err)
      } finally {
        reportingRef.current = false
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) void reportViolation('tab_switch', 'medium')
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        void reportViolation('fullscreen_exit', 'medium')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [interviewId])
}

export default useProctoring
