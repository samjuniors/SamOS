import { beforeEach, describe, expect, it } from 'vitest'

import {
  $companyAgents,
  $companyProfile,
  $companyTasks,
  $heartbeatLog,
  addCompanyAgent,
  approveCompanyTask,
  createCompanyTask,
  rejectCompanyTask,
  runCompanyHeartbeat,
  saveCompanyProfile,
  updateTaskStatus
} from '@/store/company-state'

describe('Paperclip-Inspired Company & Multi-Agent Org State', () => {
  beforeEach(() => {
    // Reset test profile
    $companyProfile.set({
      id: 'comp_test_1',
      name: 'Test Labs',
      mission: 'Test mission for autonomous operations',
      industry: 'Software',
      monthlyBudgetUsd: 1000,
      spentBudgetUsd: 100,
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
        tasksCompleted: 10,
        budgetUsd: 500,
        spentUsd: 50,
        soulSnippet: 'Owns P&L and ROI'
      },
      {
        id: 'agent_atlas_cto',
        name: 'Atlas',
        role: 'VP of Engineering / CTO',
        title: 'Lead Architect',
        department: 'Engineering',
        reportsTo: 'agent_hermes_ceo',
        avatarColor: '#38bdf8',
        status: 'idle',
        tasksCompleted: 20,
        budgetUsd: 300,
        spentUsd: 40,
        soulSnippet: 'Systems architect'
      }
    ])

    $companyTasks.set([])
    $heartbeatLog.set([])
  })

  it('updates company profile with budget guardrails', () => {
    saveCompanyProfile({
      name: 'SamJuniors Autonomous OS',
      monthlyBudgetUsd: 2500,
      approvalThresholdUsd: 50
    })

    const prof = $companyProfile.get()
    expect(prof.name).toBe('SamJuniors Autonomous OS')
    expect(prof.monthlyBudgetUsd).toBe(2500)
    expect(prof.approvalThresholdUsd).toBe(50)
  })

  it('creates a new company task in the Backlog', () => {
    const task = createCompanyTask(
      'Deploy CUA Set-of-Marks Vision Bridge',
      'Test Set-of-Marks coordinate mapping on active desktop windows',
      'agent_atlas_cto',
      'high',
      'Desktop Automation',
      30
    )

    expect(task.title).toBe('Deploy CUA Set-of-Marks Vision Bridge')
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('high')
    expect($companyTasks.get().length).toBe(1)
  })

  it('hires a new specialized AI agent into the Org Chart', () => {
    const hired = addCompanyAgent({
      name: 'Cipher',
      role: 'Cryptography & Security Auditor',
      title: 'Senior Security Engineer',
      department: 'Engineering',
      reportsTo: 'agent_hermes_ceo',
      avatarColor: '#10b981',
      status: 'idle',
      budgetUsd: 150,
      soulSnippet: 'Audits credentials, memory leaks, and sandbox isolation boundaries.'
    })

    expect(hired.name).toBe('Cipher')
    expect(hired.department).toBe('Engineering')
    expect($companyAgents.get().some(a => a.name === 'Cipher')).toBe(true)
  })

  it('advances in-progress tasks to in_review during autonomous heartbeat', async () => {
    const task = createCompanyTask(
      'Optimize Aoede Duplex Audio',
      'Audio streaming buffer optimization',
      'agent_atlas_cto',
      'urgent'
    )
    updateTaskStatus(task.id, 'in_progress')

    await runCompanyHeartbeat()

    const updatedTask = $companyTasks.get().find(t => t.id === task.id)
    expect(updatedTask?.status).toBe('in_review')
    expect(updatedTask?.diffPreview).toBeDefined()
    expect(updatedTask?.spentUsd).toBeGreaterThan(0)
  })

  it('founder approval gate: approving task moves to done and updates P&L', () => {
    const task = createCompanyTask(
      'Landing Page Redesign',
      '60-30-10 industrial color theme implementation',
      'agent_atlas_cto',
      'medium',
      'UI/UX',
      20
    )
    updateTaskStatus(task.id, 'in_review')
    task.spentUsd = 15.50
    $companyTasks.set([task])

    approveCompanyTask(task.id)

    const updated = $companyTasks.get().find(t => t.id === task.id)
    expect(updated?.status).toBe('done')

    // Verify P&L updated
    const profile = $companyProfile.get()
    expect(profile.spentBudgetUsd).toBe(115.50)

    // Verify agent completed count incremented
    const atlas = $companyAgents.get().find(a => a.id === 'agent_atlas_cto')
    expect(atlas?.tasksCompleted).toBe(21)
  })

  it('founder approval gate: rejecting task returns it to in_progress with steering feedback', () => {
    const task = createCompanyTask(
      'Database Schema Migration',
      'Migrate SQLite schema to SessionDB',
      'agent_atlas_cto',
      'high'
    )
    updateTaskStatus(task.id, 'in_review')
    $companyTasks.set([task])

    rejectCompanyTask(task.id, 'Add transaction rollback before merging.')

    const updated = $companyTasks.get().find(t => t.id === task.id)
    expect(updated?.status).toBe('in_progress')
    expect(updated?.founderNotes).toBe('Add transaction rollback before merging.')
    expect(updated?.diffPreview).toContain('[FOUNDER FEEDBACK]: Add transaction rollback before merging.')
  })
})
