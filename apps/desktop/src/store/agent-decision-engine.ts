/**
 * Hermes High-Agency Autonomous Decision Engine
 *
 * Replaces rigid keyword matching with LLM-driven semantic decision making.
 * Understands what the founder is asking dynamically:
 * - Decides whether to browse, search, automate Windows apps, manage company/tasks,
 *   run self-repair diagnostics, hire agents, or converse intelligently.
 * - Speaks naturally via Gemini Aoede companion voice (no rigid robot scripts).
 */

import { navigateToUrl } from '@/app/voice-ai-os/browser-workspace'

import { $aiProviderConfig, selectDynamicModelForTask } from './ai-provider-config'
import {
  $companyAgents,
  $companyProfile,
  $companyTasks,
  addCompanyAgent,
  approveCompanyTask,
  type CompanyAgent,
  createCompanyTask,
  openCompanyOnboarding,
  rejectCompanyTask,
  runCompanyHeartbeat
} from './company-state'
import { $cuaActive, $cuaTargetApp, recordCuaActionStart } from './cua-state'
import { openSelfRepairModal, runAutonomousSelfRepair } from './self-repair-engine'
import { setActiveWorkspaceTab } from './workspace-tab-state'

export interface AgentDecisionResult {
  thought: string
  action: string
  params?: Record<string, any>
  spokenReply: string
}

/**
 * Dynamically evaluate the founder's prompt and execute the best action.
 */
export async function decideAndExecuteAgentAction(userInput: string): Promise<string> {
  const query = userInput.trim()

  if (!query) {return ''}

  // 1. Gather live operational context
  const company = $companyProfile.get()
  const agents = $companyAgents.get()
  const tasks = $companyTasks.get()

  const inReviewTasks = tasks.filter(t => t.status === 'in_review')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')

  const agentSummary = agents
    .map(a => `${a.name} (${a.role}, Status: ${a.status}${a.currentTaskId ? `, Task: ${a.currentTaskId}` : ''})`)
    .join('; ')

  const pendingReviewSummary = inReviewTasks.length
    ? inReviewTasks.map(t => `ID: ${t.id}, Title: "${t.title}", Assignee: ${t.assigneeAgentId}, Spend: $${t.spentUsd}`).join('; ')
    : 'None'

  const inProgressSummary = inProgressTasks.length
    ? inProgressTasks.map(t => `ID: ${t.id}, Title: "${t.title}", Assignee: ${t.assigneeAgentId}`).join('; ')
    : 'None'

  // 2. Query Gemini LLM for high-agency decision
  const cfg = $aiProviderConfig.get()
  let decision: AgentDecisionResult | null = null

  if (cfg.cloudApiKey) {
    try {
      decision = await queryGeminiDecision(query, {
        companyName: company.name,
        budget: `$${company.spentBudgetUsd.toFixed(2)} / $${company.monthlyBudgetUsd}`,
        agents: agentSummary,
        inProgress: inProgressSummary,
        pendingReview: pendingReviewSummary
      })
    } catch (e) {
      console.warn('[Decision Engine] LLM decision attempt failed, falling back to semantic reasoning:', e)
    }
  }

  // 3. Fallback to semantic intelligent heuristics if offline or LLM failed
  if (!decision) {
    decision = evaluateSemanticHeuristics(query, { company, agents, tasks, inReviewTasks, inProgressTasks })
  }

  // 4. Execute the chosen action dynamically
  await executeDecidedAction(decision)

  return decision.spokenReply
}

/**
 * Ask Gemini model to semantically parse the founder's intent into a structured decision
 */
async function queryGeminiDecision(
  userQuery: string,
  context: {
    companyName: string
    budget: string
    agents: string
    inProgress: string
    pendingReview: string
  }
): Promise<AgentDecisionResult | null> {
  const cfg = $aiProviderConfig.get()
  const apiKey = cfg.cloudApiKey

  if (!apiKey) {return null}

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
  ]

  const prompt = `You are Hermes Voice AI OS, the high-agency Chief of Staff and autonomous partner for the company founder.
You make intelligent, thoughtful decisions. You are NOT a rigid robot.

Founder Request: "${userQuery}"

Current Company Context:
- Company: ${context.companyName}
- Budget: ${context.budget}
- Executive Roster: ${context.agents}
- Tasks In Progress: ${context.inProgress}
- Deliverables Pending Founder Approval: ${context.pendingReview}

Choose the single best action and write a natural, warm, executive-level spoken reply (1-2 concise sentences for speech):
Available Actions:
- "NAVIGATE_BROWSER": params: { "url": string, "popup"?: boolean } (e.g. YouTube searches, documentation, specific websites)
- "LAUNCH_APP": params: { "app": "notepad.exe" | "calc.exe" | "explorer.exe" | "mspaint.exe", "textToType"?: string }
- "TYPE_TEXT": params: { "text": string }
- "COMPANY_STATUS": params: { "agentName"?: string } (status of company, progress, or specific agent)
- "COMPANY_HEARTBEAT": params: {} (trigger autonomous heartbeat)
- "COMPANY_ONBOARDING": params: {} (reconfigure company profile/mission)
- "APPROVE_TASK": params: { "taskId"?: string } (approve and merge deliverable)
- "REJECT_TASK": params: { "taskId"?: string, "feedback": string } (reject with guidance)
- "HIRE_AGENT": params: { "name": string, "role": string, "department": string, "soul": string }
- "CREATE_TASK": params: { "title": string, "description": string, "assigneeAgentId"?: string, "priority"?: "low"|"medium"|"high"|"urgent" }
- "SELF_REPAIR": params: {} (system diagnostics and self-healing)
- "CONVERSATION": params: {} (general question, brainstorming, or discussion)

Respond STRICTLY in JSON format:
{
  "thought": "<brief reason for your decision>",
  "action": "<Action Name>",
  "params": { ... },
  "spokenReply": "<spoken answer>"
}`

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
              responseMimeType: 'application/json'
            }
          })
        }
      )

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (text) {
          const parsed = JSON.parse(text) as AgentDecisionResult

          if (parsed.action && parsed.spokenReply) {
            return parsed
          }
        }
      }
    } catch {
      // Try next model
    }
  }

  return null
}

/**
 * Intelligent Semantic Heuristics Fallback (handles natural speech even when offline)
 */
function evaluateSemanticHeuristics(
  query: string,
  ctx: {
    company: ReturnType<typeof $companyProfile.get>
    agents: CompanyAgent[]
    tasks: ReturnType<typeof $companyTasks.get>
    inReviewTasks: ReturnType<typeof $companyTasks.get>
    inProgressTasks: ReturnType<typeof $companyTasks.get>
  }
): AgentDecisionResult {
  const lower = query.toLowerCase()

  // 1. YouTube & Web Queries
  if (lower.includes('youtube') || lower.includes('video') || lower.includes('watch')) {
    const topic = query.replace(/(?:search|find|look up|show me|open|watch|on)?\s*youtube(?:\s*for)?/i, '').trim()

    const url = topic
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`
      : 'https://www.youtube.com'

    const isPopup = lower.includes('popup') || lower.includes('window')

    return {
      thought: `User wants to view YouTube content regarding: ${topic || 'homepage'}`,
      action: 'NAVIGATE_BROWSER',
      params: { url, popup: isPopup },
      spokenReply: topic
        ? `Opening YouTube and pulling up ${topic} for you.`
        : 'Opening YouTube in your browser workspace.'
    }
  }

  if (
    lower.includes('browse') ||
    lower.includes('google') ||
    lower.includes('search web') ||
    lower.includes('github') ||
    /\.(com|org|io|dev|net)/i.test(query)
  ) {
    let url = 'https://www.google.com'

    if (lower.includes('github')) {
      const ghTopic = query.replace(/.*github(?:\s*for)?/i, '').trim()
      url = ghTopic ? `https://github.com/search?q=${encodeURIComponent(ghTopic)}` : 'https://github.com'
    } else {
      const match = query.match(/https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|org|io|dev|ai|net)[^\s]*/i)

      if (match) {
        url = match[0].startsWith('http') ? match[0] : `https://${match[0]}`
      } else {
        const term = query.replace(/^(search|find|google|look up|browse)\s+(for\s+)?/i, '').trim()
        url = `https://www.google.com/search?q=${encodeURIComponent(term || query)}`
      }
    }

    return {
      thought: `Web browsing request for ${url}`,
      action: 'NAVIGATE_BROWSER',
      params: { url },
      spokenReply: 'Opening that in your browser workspace now.'
    }
  }

  // 2. Windows PC & Productivity Apps
  if (lower.includes('note') || lower.includes('write down') || lower.includes('notepad') || lower.includes('jot down')) {
    const textMatch = query.match(/(?:write down|note|type|jot down|notepad)(?:\s*:|\s+that|\s+to|\s+)?\s*(.+)/i)
    const textToType = textMatch ? textMatch[1].trim() : ''

    return {
      thought: 'User wants to take notes or open Notepad',
      action: 'LAUNCH_APP',
      params: { app: 'notepad.exe', textToType },
      spokenReply: textToType
        ? `Opening Notepad and writing down: "${textToType}".`
        : 'Opening Notepad on your computer.'
    }
  }

  if (lower.includes('calculator') || lower.includes('calculate') || lower.includes('calc')) {
    return {
      thought: 'User needs calculator',
      action: 'LAUNCH_APP',
      params: { app: 'calc.exe' },
      spokenReply: 'Opening the Calculator on your desktop.'
    }
  }

  if (lower.includes('explorer') || lower.includes('files') || lower.includes('folder') || lower.includes('my computer')) {
    return {
      thought: 'User wants Windows Explorer',
      action: 'LAUNCH_APP',
      params: { app: 'explorer.exe' },
      spokenReply: 'Opening File Explorer.'
    }
  }

  if (lower.includes('paint') || lower.includes('draw')) {
    return {
      thought: 'User wants Paint',
      action: 'LAUNCH_APP',
      params: { app: 'mspaint.exe' },
      spokenReply: 'Opening Microsoft Paint.'
    }
  }

  // 3. System Health & Self-Repair
  if (
    lower.includes('diagnos') ||
    lower.includes('health') ||
    lower.includes('broken') ||
    lower.includes('fix') ||
    lower.includes('repair') ||
    lower.includes('issue') ||
    lower.includes('everything ok') ||
    lower.includes('working properly')
  ) {
    return {
      thought: 'User requesting system health diagnostics or repair',
      action: 'SELF_REPAIR',
      params: {},
      spokenReply: 'Running our 5-point autonomous self-repair scan right now.'
    }
  }

  // 4. Company Governance, Approval & Review
  if (lower.includes('approve') || lower.includes('sign off') || lower.includes('accept') || lower.includes('merge')) {
    const targetTask = ctx.inReviewTasks[0]

    return {
      thought: `Approving pending deliverable ${targetTask ? targetTask.id : 'none'}`,
      action: 'APPROVE_TASK',
      params: { taskId: targetTask?.id },
      spokenReply: targetTask
        ? `I have approved and merged "${targetTask.title}". Budget has been updated.`
        : 'All pending tasks have already been approved. Nothing is waiting in the review gate.'
    }
  }

  if (lower.includes('reject') || lower.includes('send back') || lower.includes('needs changes')) {
    const targetTask = ctx.inReviewTasks[0]

    return {
      thought: 'Rejecting deliverable with steering feedback',
      action: 'REJECT_TASK',
      params: { taskId: targetTask?.id, feedback: query },
      spokenReply: targetTask
        ? `I have returned "${targetTask.title}" to the assignee for revisions.`
        : 'There are no deliverables currently pending review.'
    }
  }

  // 5. Team Status or Agent Status
  const matchedAgent = ctx.agents.find(a => lower.includes(a.name.toLowerCase()))

  if (matchedAgent) {
    const activeTask = ctx.tasks.find(t => t.id === matchedAgent.currentTaskId)

    return {
      thought: `Status inquiry for agent ${matchedAgent.name}`,
      action: 'COMPANY_STATUS',
      params: { agentName: matchedAgent.name },
      spokenReply: activeTask
        ? `${matchedAgent.name} is currently working on "${activeTask.title}". They have completed ${matchedAgent.tasksCompleted} tasks so far.`
        : `${matchedAgent.name} is currently ${matchedAgent.status} in ${matchedAgent.department}, ready for new objectives.`
    }
  }

  if (
    lower.includes('company') ||
    lower.includes('team') ||
    lower.includes('business') ||
    lower.includes('progress') ||
    lower.includes('what are we working on') ||
    lower.includes('how are things') ||
    lower.includes('update')
  ) {
    return {
      thought: 'General company status inquiry',
      action: 'COMPANY_STATUS',
      params: {},
      spokenReply: `At ${ctx.company.name}, we have ${ctx.agents.length} agents on the roster with ${ctx.inProgressTasks.length} tasks executing and ${ctx.inReviewTasks.length} awaiting your approval. Total spend is $${ctx.company.spentBudgetUsd.toFixed(2)} of our $${ctx.company.monthlyBudgetUsd} allocation.`
    }
  }

  // 6. Hiring & Onboarding
  if (lower.includes('hire') || lower.includes('recruit') || lower.includes('bring on')) {
    const roleMatch = query.replace(/.*(?:hire|recruit|bring on)\s+(?:a|an)?/i, '').trim()

    return {
      thought: `User wants to hire: ${roleMatch}`,
      action: 'HIRE_AGENT',
      params: {
        name: 'Specialist',
        role: roleMatch || 'Domain Specialist',
        department: 'Engineering',
        soul: 'Focused autonomous agent executing specialized objectives.'
      },
      spokenReply: `I've opened the roster to onboard an agent for ${roleMatch || 'your new role'}.`
    }
  }

  if (lower.includes('onboarding') || lower.includes('setup company')) {
    return {
      thought: 'User wants company onboarding wizard',
      action: 'COMPANY_ONBOARDING',
      params: {},
      spokenReply: "Opening company onboarding so we can calibrate your enterprise goals and limits."
    }
  }

  if (lower.includes('heartbeat') || lower.includes('sync agents')) {
    return {
      thought: 'User wants heartbeat synchronization',
      action: 'COMPANY_HEARTBEAT',
      params: {},
      spokenReply: 'Local coordination check complete. Paperclip is not connected; no agent tasks were executed.'
    }
  }

  // Default conversational answer
  return {
    thought: 'Conversational answer or reasoning',
    action: 'CONVERSATION',
    params: {},
    spokenReply: `Understood. I am on it.`
  }
}

/**
 * Execute the decided action on the desktop shell
 */
async function executeDecidedAction(decision: AgentDecisionResult): Promise<void> {
  const { action, params = {} } = decision

  switch (action) {
    case 'NAVIGATE_BROWSER': {
      setActiveWorkspaceTab('browser')
      navigateToUrl(params.url || 'https://www.google.com', !!params.popup)

      break
    }

    case 'LAUNCH_APP': {
      setActiveWorkspaceTab('cua')
      $cuaActive.set(true)
      const app = params.app || 'notepad.exe'
      const appName = app.replace('.exe', '')
      $cuaTargetApp.set(appName[0].toUpperCase() + appName.slice(1))

      const cuaApi = (window as any).hermesDesktop?.cua

      if (cuaApi?.launchApp) {
        await cuaApi.launchApp(app)
        recordCuaActionStart({
          sessionId: 'cua_live',
          action: 'launch',
          timestamp: Date.now(),
          text: `Launched ${app}`
        })

        if (params.textToType && cuaApi.typeText) {
          setTimeout(async () => {
            await cuaApi.typeText(params.textToType)
            recordCuaActionStart({
              sessionId: 'cua_live',
              action: 'type',
              timestamp: Date.now(),
              text: `Typed "${params.textToType}"`
            })
          }, 800)
        }
      }

      break
    }

    case 'TYPE_TEXT': {
      setActiveWorkspaceTab('cua')
      const cuaApi = (window as any).hermesDesktop?.cua

      if (params.text && cuaApi?.typeText) {
        await cuaApi.typeText(params.text)
        recordCuaActionStart({
          sessionId: 'cua_live',
          action: 'type',
          timestamp: Date.now(),
          text: `Typed "${params.text}"`
        })
      }

      break
    }

    case 'SELF_REPAIR': {
      openSelfRepairModal()
      const rep = await runAutonomousSelfRepair()
      decision.spokenReply = rep.narration

      break
    }

    case 'APPROVE_TASK': {
      setActiveWorkspaceTab('company')

      if (params.taskId) {
        approveCompanyTask(params.taskId)
      } else {
        const inReview = $companyTasks.get().find(t => t.status === 'in_review')

        if (inReview) {approveCompanyTask(inReview.id)}
      }

      break
    }

    case 'REJECT_TASK': {
      setActiveWorkspaceTab('company')

      if (params.taskId) {
        rejectCompanyTask(params.taskId, params.feedback || 'Revision needed.')
      } else {
        const inReview = $companyTasks.get().find(t => t.status === 'in_review')

        if (inReview) {rejectCompanyTask(inReview.id, params.feedback || 'Revision needed.')}
      }

      break
    }

    case 'COMPANY_STATUS':
    case 'COMPANY_HEARTBEAT': {
      setActiveWorkspaceTab('company')

      if (action === 'COMPANY_HEARTBEAT') {
        await runCompanyHeartbeat()
      }

      break
    }

    case 'COMPANY_ONBOARDING': {
      setActiveWorkspaceTab('company')
      openCompanyOnboarding()

      break
    }

    case 'HIRE_AGENT': {
      setActiveWorkspaceTab('company')

      if (params.name && params.role) {
        addCompanyAgent({
          name: params.name,
          role: params.role,
          title: params.role,
          department: params.department || 'Engineering',
          reportsTo: 'agent_hermes_ceo',
          avatarColor: '#f97316',
          status: 'idle',
          budgetUsd: 150,
          soulSnippet: params.soul || 'Autonomous domain specialist executing tasks.'
        })
      }

      break
    }

    case 'CREATE_TASK': {
      setActiveWorkspaceTab('company')

      if (params.title) {
        const priority = params.priority || 'medium'
        const dynamicModel = selectDynamicModelForTask({ priority, taskType: 'subagent' })
        createCompanyTask(
          params.title,
          params.description || '',
          params.assigneeAgentId || 'agent_hermes_ceo',
          priority,
          'Strategic Sprint',
          20.0,
          dynamicModel.model
        )
      }

      break
    }

    case 'CONVERSATION':

    default:
      // Pure conversation or handled elsewhere
      break
  }
}
