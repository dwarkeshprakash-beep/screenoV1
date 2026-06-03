// frontend/src/hooks/useProctoring.js
// Monitors for integrity violations (tab switch, fullscreen exit).

import { useEffect } from 'react'
import * as api from '../services/api'

/**
 * @param {number} interviewId
 * @param {Function} onViolation - called with event type string
 */
function useProctoring(interviewId, onViolation) {
  useEffect(() => {
    if (!interviewId) return

    function handleVisibilityChange() {
      if (document.hidden) {
        api.logProctoringEvent(interviewId, {
          type: 'tab_switch',
          severity: 'medium',
          occurred: new Date().toISOString(),
        }).catch(err => console.error('logProctoringEvent failed:', err))

        if (onViolation) onViolation('tab_switch')
      }
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        api.logProctoringEvent(interviewId, {
          type: 'fullscreen_exit',
          severity: 'low',
          occurred: new Date().toISOString(),
        }).catch(err => console.error('logProctoringEvent failed:', err))
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [interviewId, onViolation])
}

export default useProctoring
