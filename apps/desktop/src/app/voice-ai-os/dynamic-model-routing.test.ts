import { beforeEach, describe, expect, it } from 'vitest'

import {
  $aiProviderConfig,
  selectDynamicModelForTask,
  setAiProviderConfig
} from '@/store/ai-provider-config'
import {
  $companyAgents,
  createCompanyTask
} from '@/store/company-state'

describe('Dynamic Smart Model Routing & Multi-Provider System', () => {
  beforeEach(() => {
    setAiProviderConfig({
      mode: 'cloud',
      cloudProvider: 'nous',
      cloudModel: 'Hermes-3-Llama-3.1-70B',
      routingStrategy: 'dynamic_smart',
      tier1FreeModel: 'gemini-3.1-flash-lite',
      tier2BalancedModel: 'Hermes-3-Llama-3.1-70B',
      tier3UrgentModel: 'gemini-3.1-pro'
    })
  })

  it('routes routine, low-priority tasks to Tier 1 Free models', () => {
    const selection = selectDynamicModelForTask({
      priority: 'low',
      taskType: 'routine'
    })

    expect(selection.tier).toBe('tier1_free')
    expect(selection.model).toBe('gemini-3.1-flash-lite')
    expect(selection.reason).toContain('Tier 1 Free/Fast')
  })

  it('allocates medium and high complexity coding tasks to Tier 2 Workhorse models (Hermes 3)', () => {
    const selection = selectDynamicModelForTask({
      priority: 'high',
      taskType: 'coding'
    })

    expect(selection.tier).toBe('tier2_balanced')
    expect(selection.model).toBe('Hermes-3-Llama-3.1-70B')
    expect(selection.provider).toBe('nous')
  })

  it('auto-escalates urgent or mission-critical architecture tasks to Tier 3 Frontier models', () => {
    const selection = selectDynamicModelForTask({
      priority: 'urgent',
      taskType: 'architecture'
    })

    expect(selection.tier).toBe('tier3_urgent')
    expect(selection.model).toBe('gemini-3.1-pro')
    expect(selection.reason).toContain('Auto-escalated to Tier 3 Frontier')
  })

  it('honors 100% Free Only routing strategy across all tasks to prevent API bills', () => {
    setAiProviderConfig({ routingStrategy: 'free_only' })

    const selection = selectDynamicModelForTask({
      priority: 'urgent',
      taskType: 'architecture'
    })

    expect(selection.tier).toBe('tier1_free')
    expect(selection.model).toBe('gemini-3.1-flash-lite')
    expect(selection.reason).toContain('Free Tier model selected')
  })

  it('honors Performance Frontier strategy when requested by founder', () => {
    setAiProviderConfig({ routingStrategy: 'performance' })

    const selection = selectDynamicModelForTask({
      priority: 'low',
      taskType: 'routine'
    })

    expect(selection.tier).toBe('tier3_urgent')
    expect(selection.model).toBe('gemini-3.1-pro')
  })

  it('respects manual model overrides configured on individual agents', () => {
    const selection = selectDynamicModelForTask({
      priority: 'low',
      agentPreference: 'Hermes-3-Llama-3.1-405B'
    })

    expect(selection.model).toBe('Hermes-3-Llama-3.1-405B')
    expect(selection.provider).toBe('nous')
    expect(selection.reason).toContain('Manual override')
  })

  it('attaches resolved model to created company tasks for full visibility', () => {
    // 1. Task assigned to CEO (auto) -> auto-escalates to Tier 3 Frontier on urgent
    const urgentTask = createCompanyTask(
      'Audit System Memory Bounds',
      'Examine heap memory leak boundaries',
      'agent_hermes_ceo',
      'urgent'
    )
    expect(urgentTask.allocatedModel).toBeDefined()
    expect(urgentTask.allocatedModel).toContain('Tier 3 Frontier')

    // 2. Task assigned to Aegis -> respects Aegis manual model preference (deepseek-reasoner)
    const aegisTask = createCompanyTask(
      'Penetration Testing Sandbox',
      'Test sandbox escape vectors',
      'agent_aegis_qa',
      'high'
    )
    expect(aegisTask.allocatedModel).toBe('deepseek-reasoner')
  })
})
