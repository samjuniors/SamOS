import { describe, expect, it, vi } from 'vitest'

import { $voiceState, initVoiceStateIpc } from './voice-state'

describe('Sofia native ESC/barge-in IPC', () => {
  it('returns voice to idle without recursively sending a second IPC interrupt', () => {
    const previous = (window as any).hermesDesktop
    let onInterrupted: () => void = () => {}
    const unsubscribe = vi.fn()
    const nativeInterrupt = vi.fn()

    ;(window as any).hermesDesktop = {
      voice: {
        interrupt: nativeInterrupt,
        onInterrupted: (callback: () => void) => {
          onInterrupted = callback
          return unsubscribe
        }
      }
    }

    try {
      const cleanup = initVoiceStateIpc()
      $voiceState.set('SPEAKING')
      onInterrupted()
      expect($voiceState.get()).toBe('IDLE')
      expect(nativeInterrupt).not.toHaveBeenCalled()
      cleanup()
      expect(unsubscribe).toHaveBeenCalledOnce()
    } finally {
      $voiceState.set('IDLE')
      ;(window as any).hermesDesktop = previous
    }
  })
})
