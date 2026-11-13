import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { $aiEmployees, stopSubagent, upsertAIEmployee } from '@/store/subagent-telemetry'

describe('Subagent control acknowledges real backend execution', () => {
  beforeEach(() => {
    vi.stubGlobal('hermesDesktop', undefined)
    $aiEmployees.set([])
    upsertAIEmployee({ id: 'test-worker', status: 'running' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('refuses to fabricate a successful stop with no backend bridge', async () => {
    const result = await stopSubagent('test-worker')
    expect(result.success).toBe(false)
    expect($aiEmployees.get()[0].status).toBe('running')
  })

  it('changes worker state only after a successful backend acknowledgement', async () => {
    vi.stubGlobal('hermesDesktop', { subagent: { control: async () => ({ success: true }) } })
    const result = await stopSubagent('test-worker')
    expect(result.success).toBe(true)
    expect($aiEmployees.get()[0].status).toBe('interrupted')
  })

  it('retains the active state when backend denies the request', async () => {
    vi.stubGlobal('hermesDesktop', { subagent: { control: async () => ({ success: false, error: 'Denied' }) } })
    const result = await stopSubagent('test-worker')
    expect(result.success).toBe(false)
    expect($aiEmployees.get()[0].status).toBe('running')
  })
})
