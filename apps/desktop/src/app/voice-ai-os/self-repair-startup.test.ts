import { describe, expect, it } from 'vitest'

import { $systemHealth } from '@/store/self-repair-engine'

describe('SamOS self-repair startup is truthful', () => {
  it('does not report a healthy Windows PC before any diagnostics', () => {
    const state = $systemHealth.get()
    expect(state.lastScanTime).toBeNull()
    expect(state.overallStatus).toBe('NOT_CHECKED')
    expect(state.checks.every(check => check.status === 'not_checked')).toBe(true)
  })
})
