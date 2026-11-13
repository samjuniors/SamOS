import { describe, expect, it, vi } from 'vitest'

import { $cuaActive, $cuaLastAction, initCuaIpc, recordCuaActionStart } from './cua-state'

describe('Sofia CUA ESC cancellation', () => {
  it('clears pending computer-use activity when Electron broadcasts abort', () => {
    const previous = (window as any).hermesDesktop
    let onAborted: () => void = () => {}
    const unsubscribe = vi.fn()

    ;(window as any).hermesDesktop = {
      cua: {
        onAborted: (callback: () => void) => {
          onAborted = callback
          return unsubscribe
        }
      }
    }
    try {
      const cleanup = initCuaIpc()
      recordCuaActionStart({
        sessionId: 'cua_test',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Opened Notepad'
      })
      expect($cuaActive.get()).toBe(true)
      expect($cuaLastAction.get()).not.toBeNull()

      onAborted()
      expect($cuaActive.get()).toBe(false)
      expect($cuaLastAction.get()).toBeNull()

      cleanup()
      expect(unsubscribe).toHaveBeenCalledOnce()
    } finally {
      $cuaActive.set(false)
      $cuaLastAction.set(null)
      ;(window as any).hermesDesktop = previous
    }
  })
})
