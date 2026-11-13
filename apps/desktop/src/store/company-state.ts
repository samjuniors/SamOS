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
  spentBudgetUsd: 184.50,
  approvalThresholdUsd: 25.0,
  onboardingCompleted: true,
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
    status: 'working',
    tasksCompleted: 48,
    budgetUsd: 600,
    spentUsd: 74.20,
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
    status: 'working',
    currentTaskId: 'task_voice_duplex',
    tasksCompleted: 82,
    budgetUsd: 400,
    spentUsd: 58.10,
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
    tasksCompleted: 35,
    budgetUsd: 250,
    spentUsd: 22.80,
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
    tasksCompleted: 29,
    budgetUsd: 150,
    spentUsd: 14.40,
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
    status: 'reviewing',
    currentTaskId: 'task_self_repair_patch',
    tasksCompleted: 64,
    budgetUsd: 100,
    spentUsd: 15.00,
    modelPreference: 'deepseek-reasoner',
    soulSnippet: 'Autonomous self-healing, sandbox isolation, rate limit mitigation, deadlock recovery.'
  }
]

const DEFAULT_TASKS: CompanyTask[] = [
  {
    id: 'task_self_repair_patch',
    title: 'Deploy Autonomous Self-Repair Subsystem to Production',
    description: 'Verify 5-point automated health diagnostics (AudioContext, Gemini Brain Gate, IPC CUA Driver, Watchdog, Workspaces) and deploy hotfix.',
    status: 'in_review',
    priority: 'urgent',
    assigneeAgentId: 'agent_aegis_qa',
    goalTag: 'System Stability & Self-Healing',
    budgetUsd: 20.0,
    spentUsd: 12.5,
    diffPreview: `+ apps/desktop/src/store/self-repair-engine.ts
+ apps/desktop/src/app/voice-ai-os/self-repair-modal.tsx
- RateLimitError: Fallback triggered to gemini-flash-latest
+ Health score evaluated at 100% NOMINAL across all 5 subsystems`,
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 1800000
  },
  {
    id: 'task_voice_duplex',
    title: 'Optimize Gemini Aoede 16kHz Duplex Voice Pipeline',
    description: 'Implement real-time barge-in interruption and auto-gain control to guarantee sub-200ms latency on spoken queries.',
    status: 'in_progress',
    priority: 'high',
    assigneeAgentId: 'agent_atlas_cto',
    goalTag: 'Voice AI OS Polish',
    budgetUsd: 25.0,
    spentUsd: 18.2,
    diffPreview: `~ apps/desktop/src/store/voice-state.ts (AudioBuffer source normalization)
~ handleSpokenCommand: added direct intent parser for Voice Company commands`,
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 900000
  },
  {
    id: 'task_theme_60_30_10',
    title: 'Apply 60-30-10 Industrial Theme (Matte Black / Storm Grey / Safety Orange)',
    description: 'Enforce strict 60% matte black canvas, 30% storm grey containers, and 10% safety orange accents across all HUD elements.',
    status: 'done',
    priority: 'medium',
    assigneeAgentId: 'agent_echo_design',
    goalTag: 'UI/UX Visual System',
    budgetUsd: 15.0,
    spentUsd: 14.4,
    diffPreview: `Enforced --industrial-matte-black, --industrial-storm-grey, and --industrial-safety-orange tokens across Voice AI OS root and orb visualizations.`,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 2
  },
  {
    id: 'task_stripe_checkout',
    title: 'Automated Billing & Token Metering Integration',
    description: 'Wire up Stripe checkout webhook and auto-pause agents when monthly budget reaches 95% threshold.',
    status: 'todo',
    priority: 'medium',
    assigneeAgentId: 'agent_hermes_ceo',
    goalTag: 'Company Monetization',
    budgetUsd: 30.0,
    spentUsd: 0.0,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12
  },
  {
    id: 'task_competitor_teardown',
    title: 'Benchmark Competitor Agent Swarms & Open-Source Orchestrators',
    description: 'Extract best practices from Paperclip, Devin, and Claude Artifacts for autonomous developer productivity.',
    status: 'todo',
    priority: 'low',
    assigneeAgentId: 'agent_nova_research',
    goalTag: 'Strategic Intelligence',
    budgetUsd: 15.0,
    spentUsd: 0.0,
    createdAt: Date.now() - 3600000 * 16,
    updatedAt: Date.now() - 3600000 * 16
  }
]

// -------------------------------------------------------------
// Nanostores with LocalStorage Persistence
// -------------------------------------------------------------

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`hermes_company_${key}`)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // Ignore storage parse issues
  }
  return fallback
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`hermes_company_${key}`, JSON.stringify(value))
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
 * Autonomous Heartbeat Cycle:
 * Executes Paperclip CEO Heartbeat Checklist:
 * 1. Checks assignees & local planning
 * 2. Advances active in_progress tasks
 * 3. Escalates completed work into in_review Approval Gate
 * 4. Checks out highest priority backlog task
 */
export async function runCompanyHeartbeat(): Promise<void> {
  if ($isHeartbeatRunning.get()) return
  $isHeartbeatRunning.set(true)

  addHeartbeatLog('--- Autonomous Heartbeat Cycle Started ---')

  try {
    const tasks = [...$companyTasks.get()]
    const agents = [...$companyAgents.get()]

    // 1. Advance in_progress tasks
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
    for (const task of inProgressTasks) {
      // Simulate progression into in_review (Approval Gate)
      task.status = 'in_review'
      task.spentUsd = Number((task.spentUsd + 4.50).toFixed(2))
      task.diffPreview = task.diffPreview || `Changes completed by ${getAgentName(task.assigneeAgentId)}.\nReady for founder diff review and merge.`
      task.updatedAt = Date.now()

      addHeartbeatLog(`Agent ${getAgentName(task.assigneeAgentId)} completed draft for "${task.title}". Transferred to Approval Gate.`)
    }

    // 2. Assign idle agents to todo tasks
    const todoTasks = tasks.filter(t => t.status === 'todo')
    if (todoTasks.length > 0) {
      const nextTask = todoTasks[0]
      nextTask.status = 'in_progress'
      nextTask.updatedAt = Date.now()

      const agent = agents.find(a => a.id === nextTask.assigneeAgentId)
      if (agent) {
        agent.status = 'working'
        agent.currentTaskId = nextTask.id
      }

      addHeartbeatLog(`Checked out task "${nextTask.title}" -> ${getAgentName(nextTask.assigneeAgentId)} is actively working.`)
    }

    $companyTasks.set(tasks)
    $companyAgents.set(agents)
    addHeartbeatLog('--- Heartbeat Cycle Completed: Roster Synchronized ---')
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
