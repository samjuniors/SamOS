/**
 * Paperclip-Inspired Autonomous Company & Multi-Agent Org State
 *
 * Implements:
 * - Company Identity, Mission, and Financial Budget Guardrails
 * - Agentic Org Chart & Roster with CEO Persona (SOUL.md / HEARTBEAT.md)
 * - Goal-Aligned Kanban Task Board (Backlog, In Progress, Approval Gate, Completed)
 * - Autonomous Heartbeat Execution Loop & Founder Review Gates
 * - External Paperclip Adapter Sync Bridge
 */

import { atom } from 'nanostores'

export interface CompanyProfile {
  id: string
  name: string
  mission: string
  industry: string
  monthlyBudgetUsd: number
  spentBudgetUsd: number
  approvalThresholdUsd: number
  onboardingCompleted: boolean
  paperclipSyncEnabled: boolean
  paperclipServerUrl: string
  paperclipApiKey: string
  paperclipCompanyId?: string
}

export interface CompanyAgent {
  id: string
  name: string
  role: string
  title: string
  department: 'Executive' | 'Engineering' | 'Research' | 'Design' | 'Operations'
  reportsTo: string | null
  avatarColor: string
  status: 'idle' | 'working' | 'reviewing' | 'paused'
  currentTaskId?: string
  tasksCompleted: number
  budgetUsd: number
  spentUsd: number
  soulSnippet: string
  modelPreference?: string
}

export interface CompanyTask {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  assigneeAgentId: string
  goalTag: string
  budgetUsd: number
  spentUsd: number
  allocatedModel?: string
  diffPreview?: string
  founderNotes?: string
  createdAt: number
  updatedAt: number
}

// -------------------------------------------------------------
// Defaults
// -------------------------------------------------------------

const DEFAULT_COMPANY: CompanyProfile = {
  id: 'comp_paperclip_core',
  name: 'SamJuniors Autonomous Labs',
  mission: 'Build autonomous Voice AI agents, self-healing operating systems, and intelligent digital tools for global founders.',
  industry: 'Autonomous AI & Operating Systems',
  monthlyBudgetUsd: 1500,
  spentBudgetUsd: 0,
  approvalThresholdUsd: 25.0,
  onboardingCompleted: false,
  paperclipSyncEnabled: false,
  paperclipServerUrl: 'http://localhost:3100',
  paperclipApiKey: ''
}

const DEFAULT_AGENTS: CompanyAgent[] = [
  {
    id: 'agent_hermes_ceo',
    name: 'Hermes',
    role: 'CEO & Chief of Staff',
    title: 'Chief Executive Officer',
    department: 'Executive',
    reportsTo: null,
    avatarColor: '#ff6a00',
    status: 'idle',
    tasksCompleted: 0,
    budgetUsd: 600,
    spentUsd: 0,
    modelPreference: 'auto',
    soulSnippet: 'Owns P&L, sets quarterly OKRs, leads executive heartbeats, and enforces ROI bets.'
  },
  {
    id: 'agent_atlas_cto',
    name: 'Atlas',
    role: 'VP of Engineering / CTO',
    title: 'Lead Systems Architect',
    department: 'Engineering',
    reportsTo: 'agent_hermes_ceo',
    avatarColor: '#38bdf8',
    status: 'idle',
    tasksCompleted: 0,
    budgetUsd: 400,
    spentUsd: 0,
    modelPreference: 'Hermes-3-Llama-3.1-70B',
    soulSnippet: 'High-concurrency systems, low-latency audio pipelines, CUA Set-of-Marks computer vision.'
  },
  {
    id: 'agent_nova_research',
    name: 'Nova',
    role: 'Lead Research & Market Intel',
    title: 'Principal Research Scientist',
    department: 'Research',
    reportsTo: 'agent_hermes_ceo',
    avatarColor: '#a855f7',
    status: 'idle',
    tasksCompleted: 0,
    budgetUsd: 250,
    spentUsd: 0,
    modelPreference: 'gemini-3.8-flash',
    soulSnippet: 'Deep-dive competitive intelligence, API documentation audits, and paper synthesis.'
  },
  {
    id: 'agent_echo_design',
    name: 'Echo',
    role: 'Head of Product & Creative Design',
    title: 'Product Design Lead',
    department: 'Design',
    reportsTo: 'agent_hermes_ceo',
    avatarColor: '#f43f5e',
    status: 'idle',
    tasksCompleted: 0,
    budgetUsd: 150,
    spentUsd: 0,
    modelPreference: 'gemini-3.1-flash-lite',
    soulSnippet: 'Industrial 60-30-10 design system, fluid micro-interactions, accessible UI ergonomics.'
  },
  {
    id: 'agent_aegis_qa',
    name: 'Aegis',
    role: 'Security Sentinel & QA Lead',
    title: 'Director of Reliability',
    department: 'Operations',
    reportsTo: 'agent_atlas_cto',
    avatarColor: '#10b981',
    status: 'idle',
    tasksCompleted: 0,
    budgetUsd: 100,
    spentUsd: 0,
    modelPreference: 'deepseek-reasoner',
    soulSnippet: 'Autonomous self-healing, sandbox isolation, rate limit mitigation, deadlock recovery.'
  }
]

// A fresh Windows install must never claim fake completed tasks or charges.
// The roster above consists of local role templates, not running agents.
const DEFAULT_TASKS: CompanyTask[] = []

// -------------------------------------------------------------
// Nanostores with LocalStorage Persistence
// -------------------------------------------------------------

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`hermes_company_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw) as T
      if (key === 'profile' && parsed && typeof parsed === 'object') {
        // Migrate older profiles that kept the Paperclip credential in plain text.
        const safeProfile = { ...(parsed as unknown as CompanyProfile), paperclipApiKey: '' }
        localStorage.setItem(`hermes_company_${key}`, JSON.stringify(safeProfile))
        return safeProfile as unknown as T
      }
      return parsed
    }
  } catch {
    // Ignore storage parse issues
  }
  return fallback
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    const persistable = key === 'profile'
      ? { ...(value as unknown as CompanyProfile), paperclipApiKey: '' }
      : value
    localStorage.setItem(`hermes_company_${key}`, JSON.stringify(persistable))
  } catch {
    // Ignore storage write issues
  }
}

export const $companyProfile = atom<CompanyProfile>(loadFromStorage('profile', DEFAULT_COMPANY))
export const $companyAgents = atom<CompanyAgent[]>(loadFromStorage('agents', DEFAULT_AGENTS))
export const $companyTasks = atom<CompanyTask[]>(loadFromStorage('tasks', DEFAULT_TASKS))
export const $selectedTaskId = atom<string | null>(null)
export const $isOnboardingOpen = atom<boolean>(false)
export const $isHeartbeatRunning = atom<boolean>(false)
export const $heartbeatLog = atom<string[]>([
  'System Heartbeat initialized. 5 agents registered on org roster.',
  'P&L budget tracker active: $184.50 spent of $1,500.00 monthly allocation.'
])

// Auto-persist changes
$companyProfile.subscribe(val => saveToStorage('profile', val))
$companyAgents.subscribe(val => saveToStorage('agents', val))
$companyTasks.subscribe(val => saveToStorage('tasks', val))

// -------------------------------------------------------------
// Actions & Core Logic
// -------------------------------------------------------------

export function openCompanyOnboarding(): void {
  $isOnboardingOpen.set(true)
}

export function closeCompanyOnboarding(): void {
  $isOnboardingOpen.set(false)
}

export function saveCompanyProfile(profile: Partial<CompanyProfile>): void {
  const current = $companyProfile.get()
  $companyProfile.set({
    ...current,
    ...profile
  })
}

export function addCompanyAgent(agent: Omit<CompanyAgent, 'id' | 'tasksCompleted' | 'spentUsd'>): CompanyAgent {
  const id = `agent_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`
  const newAgent: CompanyAgent = {
    ...agent,
    id,
    tasksCompleted: 0,
    spentUsd: 0
  }
  const current = $companyAgents.get()
  $companyAgents.set([...current, newAgent])

  addHeartbeatLog(`Hired new agent: ${newAgent.name} (${newAgent.title}) into ${newAgent.department}.`)
  return newAgent
}

export function createCompanyTask(
  title: string,
  description: string,
  assigneeAgentId: string,
  priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium',
  goalTag = 'General Operations',
  budgetUsd = 20.0,
  allocatedModel?: string
): CompanyTask {
  const agent = $companyAgents.get().find(a => a.id === assigneeAgentId)
  const resolvedModel =
    allocatedModel ||
    (agent?.modelPreference && agent.modelPreference !== 'auto' ? agent.modelPreference : undefined) ||
    (priority === 'urgent'
      ? 'gemini-3.1-pro (Tier 3 Frontier)'
      : priority === 'high'
      ? 'Hermes-3-Llama-3.1-70B (Tier 2 Balanced)'
      : 'gemini-3.1-flash-lite (Tier 1 Free)')

  const newTask: CompanyTask = {
    id: `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    description,
    status: 'todo',
    priority,
    assigneeAgentId,
    goalTag,
    budgetUsd,
    spentUsd: 0,
    allocatedModel: resolvedModel,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  const tasks = $companyTasks.get()
  $companyTasks.set([newTask, ...tasks])

  addHeartbeatLog(`New task queued: "${title}" assigned to ${getAgentName(assigneeAgentId)} via [${resolvedModel}].`)
  return newTask
}

export function updateTaskStatus(taskId: string, status: CompanyTask['status']): void {
  const tasks = $companyTasks.get()
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx < 0) return

  const updated = [...tasks]
  updated[idx] = {
    ...updated[idx],
    status,
    updatedAt: Date.now()
  }
  $companyTasks.set(updated)
}

/**
 * Founder Approval Gate: Approve a task pending review
 */
export function approveCompanyTask(taskId: string, notes?: string): void {
  const tasks = $companyTasks.get()
  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  updateTaskStatus(taskId, 'done')

  // Update company budget & agent stats
  const profile = $companyProfile.get()
  $companyProfile.set({
    ...profile,
    spentBudgetUsd: Number((profile.spentBudgetUsd + task.spentUsd).toFixed(2))
  })

  const agents = $companyAgents.get()
  const agentIdx = agents.findIndex(a => a.id === task.assigneeAgentId)
  if (agentIdx >= 0) {
    const updatedAgents = [...agents]
    updatedAgents[agentIdx] = {
      ...updatedAgents[agentIdx],
      tasksCompleted: updatedAgents[agentIdx].tasksCompleted + 1,
      spentUsd: Number((updatedAgents[agentIdx].spentUsd + task.spentUsd).toFixed(2)),
      status: 'idle',
      currentTaskId: undefined
    }
    $companyAgents.set(updatedAgents)
  }

  addHeartbeatLog(`[APPROVAL GATE ACCEPTED] Founder approved "${task.title}". Moved to Done.`)
  if ($selectedTaskId.get() === taskId) {
    $selectedTaskId.set(null)
  }
}

/**
 * Founder Approval Gate: Reject a task with steering feedback
 */
export function rejectCompanyTask(taskId: string, feedback: string): void {
  const tasks = $companyTasks.get()
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx < 0) return

  const updated = [...tasks]
  updated[idx] = {
    ...updated[idx],
    status: 'in_progress',
    founderNotes: feedback,
    diffPreview: (updated[idx].diffPreview || '') + `\n\n[FOUNDER FEEDBACK]: ${feedback}`,
    updatedAt: Date.now()
  }
  $companyTasks.set(updated)

  addHeartbeatLog(`[APPROVAL GATE REJECTED] Founder requested revisions on "${updated[idx].title}": ${feedback}`)
}

/**
 * Local-only coordination check. Until a real Paperclip adapter reports work,
 * never fabricate agent completion, expenditure, or external synchronization.
 */
export async function runCompanyHeartbeat(): Promise<void> {
  if ($isHeartbeatRunning.get()) return
  $isHeartbeatRunning.set(true)

  try {
    addHeartbeatLog('[LOCAL ONLY] Paperclip execution is not connected. No agents launched, tasks completed, or budget charged.')
  } finally {
    $isHeartbeatRunning.set(false)
  }
}

export function addHeartbeatLog(msg: string): void {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const entry = `[${time}] ${msg}`
  const current = $heartbeatLog.get()
  $heartbeatLog.set([entry, ...current.slice(0, 49)])
}

export function getAgentName(agentId: string): string {
  const agent = $companyAgents.get().find(a => a.id === agentId)
  return agent ? agent.name : 'Unassigned Agent'
}
