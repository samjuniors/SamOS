import { beforeEach, describe, expect, it, vi } from 'vitest'

import { decideAndExecuteAgentAction } from '@/store/agent-decision-engine'
import {
  $companyAgents,
  $companyProfile,
  $companyTasks,
  createCompanyTask,
  updateTaskStatus
} from '@/store/company-state'
import { $activeWorkspaceTab } from '@/store/workspace-tab-state'

import { $browserCurrentUrl } from './browser-workspace'

describe('Hermes High-Agency Autonomous Decision Engine', { timeout: 30000 }, () => {
  beforeEach(() => {
    $companyProfile.set({
      id: 'comp_test',
      name: 'Dynamic Ventures Labs',
      mission: 'Autonomous operations for digital builders',
      industry: 'Software',
      monthlyBudgetUsd: 2000,
      spentBudgetUsd: 150,
      approvalThresholdUsd: 25,
      onboardingCompleted: true,
      paperclipSyncEnabled: false,
      paperclipServerUrl: 'http://localhost:3100',
      paperclipApiKey: ''
    })

    $companyAgents.set([
      {
        id: 'agent_hermes_ceo',
        name: 'Hermes',
        role: 'CEO & Chief of Staff',
        title: 'Chief Executive Officer',
        department: 'Executive',
        reportsTo: null,
        avatarColor: '#ff6a00',
        status: 'working',
        tasksCompleted: 15,
        budgetUsd: 500,
        spentUsd: 50,
        soulSnippet: 'Strategic orchestration'
      },
      {
        id: 'agent_atlas_cto',
        name: 'Atlas',
        role: 'VP of Engineering',
        title: 'Lead Architect',
        department: 'Engineering',
        reportsTo: 'agent_hermes_ceo',
        avatarColor: '#38bdf8',
        status: 'working',
        currentTaskId: 'task_audio_streaming',
        tasksCompleted: 42,
        budgetUsd: 400,
        spentUsd: 70,
        soulSnippet: 'Audio pipelines & CUA'
      }
    ])

    $companyTasks.set([
      {
        id: 'task_audio_streaming',
        title: 'Sub-200ms Duplex Audio Pipeline',
        description: 'Optimize Web Audio VAD buffer latency',
        status: 'in_progress',
        priority: 'urgent',
        assigneeAgentId: 'agent_atlas_cto',
        goalTag: 'Voice AI',
        budgetUsd: 30,
        spentUsd: 22,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now()
      }
    ])
  })

  it('dynamically constructs search URLs for natural queries rather than static pages', async () => {
    const reply = await decideAndExecuteAgentAction('Show me cool synthwave music on YouTube')

    expect(reply.toLowerCase()).toContain('synthwave')
    expect($activeWorkspaceTab.get()).toBe('browser')
    expect($browserCurrentUrl.get()).toContain('youtube.com/results?search_query=')
    expect($browserCurrentUrl.get()).toContain('synthwave')
  })

  it('dynamically extracts note content and launches Notepad via CUA', async () => {
    const launchApp = vi.fn().mockResolvedValue({ success: true })
    const typeText = vi.fn().mockResolvedValue({ success: true })
    const previousDesktop = (window as any).hermesDesktop
    ;(window as any).hermesDesktop = { cua: { launchApp, typeText } }
    try {
    const reply = await decideAndExecuteAgentAction('Write down a note: server deployment is at midnight')

    expect(reply.toLowerCase()).toMatch(/note|midnight|deployment/)
    expect($activeWorkspaceTab.get()).toBe('cua')
    expect(launchApp).toHaveBeenCalledWith('notepad.exe')
    expect(typeText).toHaveBeenCalled()
    } finally {
      ;(window as any).hermesDesktop = previousDesktop
    }
  })

  it('does not report launching an app when desktop computer-use is unavailable', async () => {
    const previousDesktop = (window as any).hermesDesktop
    ;(window as any).hermesDesktop = undefined
    try {
      const reply = await decideAndExecuteAgentAction('Open calculator')
      expect(reply).toMatch(/not connected/i)
      expect(reply).toMatch(/did not launch/i)
    } finally {
      ;(window as any).hermesDesktop = previousDesktop
    }
  })

  it('reports an explicit IPC denial without claiming a successful launch', async () => {
    const previousDesktop = (window as any).hermesDesktop
    ;(window as any).hermesDesktop = {
      cua: { launchApp: vi.fn().mockResolvedValue({ success: false, error: 'not approved' }) }
    }
    try {
      const reply = await decideAndExecuteAgentAction('Open calculator')
      expect(reply).toMatch(/could not launch/i)
      expect(reply).toMatch(/not approved/i)
    } finally {
      ;(window as any).hermesDesktop = previousDesktop
    }
  })

  it('intelligently answers status questions about specific team members', async () => {
    const reply = await decideAndExecuteAgentAction('What is Atlas working on right now?')

    expect(reply).toContain('Atlas')
    expect(reply.toLowerCase()).toMatch(/audio|pipeline/)
    expect($activeWorkspaceTab.get()).toBe('company')
  })

  it('dynamically identifies pending deliverables and signs off when requested', async () => {
    // Add an in_review task
    const reviewTask = createCompanyTask('Self-Repair Patch v2', 'Heal audio contexts', 'agent_atlas_cto', 'high')
    updateTaskStatus(reviewTask.id, 'in_review')
    reviewTask.spentUsd = 12.0
    $companyTasks.set([reviewTask, ...$companyTasks.get()])

    const reply = await decideAndExecuteAgentAction('Go ahead and sign off on that deliverable')

    expect(reply.toLowerCase()).toMatch(/signed off|approved|merged|set/)
    const finishedTask = $companyTasks.get().find(t => t.id === reviewTask.id)
    expect(finishedTask?.status).toBe('done')
  })

  it('dynamically recruits new agents with custom roles into the Org Chart', async () => {
    const reply = await decideAndExecuteAgentAction('Let us hire an expert in SEO growth and viral marketing')

    expect(reply.length).toBeGreaterThan(10)
    const agents = $companyAgents.get()

    const seoAgent = agents.find(
      a =>
        a.role.toLowerCase().includes('seo') ||
        a.role.toLowerCase().includes('growth') ||
        a.role.toLowerCase().includes('marketing') ||
        a.name.toLowerCase().includes('apollo')
    )

    expect(seoAgent).toBeDefined()
  })

  it('dynamically responds to health inquiries by triggering self-repair', async () => {
    const reply = await decideAndExecuteAgentAction('Are there any broken things or issues on my computer?')

    expect(reply).toBeDefined()
    expect(typeof reply).toBe('string')
    expect(reply.length).toBeGreaterThan(10)
  })
})
