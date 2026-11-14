import './voice-ai-os.css'

import { useStore } from '@nanostores/react'
import {
  Activity,
  Building,
  CheckCircle2,
  Coins,
  Cpu,
  FileCode,
  GitPullRequest,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  $companyAgents,
  $companyProfile,
  $companyTasks,
  $heartbeatLog,
  $isHeartbeatRunning,
  $selectedTaskId,
  addCompanyAgent,
  approveCompanyTask,
  type CompanyAgent,
  type CompanyTask,
  createCompanyTask,
  openCompanyOnboarding,
  rejectCompanyTask,
  runCompanyHeartbeat
} from '@/store/company-state'
import { speakCompanionText } from '@/store/voice-state'

export function CompanyView() {
  const profile = useStore($companyProfile)
  const agents = useStore($companyAgents)
  const tasks = useStore($companyTasks)
  const isHeartbeatRunning = useStore($isHeartbeatRunning)
  const heartbeatLogs = useStore($heartbeatLog)
  const selectedTaskId = useStore($selectedTaskId)

  const [activeSubView, setActiveSubView] = useState<'board' | 'org' | 'logs'>('board')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false)
  const [isHireModalOpen, setIsHireModalOpen] = useState<boolean>(false)

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState(agents[0]?.id || '')
  const [newTaskPriority, setNewTaskPriority] = useState<CompanyTask['priority']>('medium')
  const [newTaskBudget, setNewTaskBudget] = useState('20')

  // Hire agent form state
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentRole, setNewAgentRole] = useState('')
  const [newAgentDept, setNewAgentDept] = useState<CompanyAgent['department']>('Engineering')
  const [newAgentSoul, setNewAgentSoul] = useState('')

  // Steering feedback for rejected task
  const [rejectFeedback, setRejectFeedback] = useState('')

  const pendingApprovalsCount = useMemo(() => {
    return tasks.filter(t => t.status === 'in_review').length
  }, [tasks])

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null
  }, [tasks, selectedTaskId])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterTag !== 'all' && t.goalTag !== filterTag) {return false}

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()

        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.goalTag.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [tasks, filterTag, searchQuery])

  const tasksByColumn = useMemo(() => {
    return {
      todo: filteredTasks.filter(t => t.status === 'todo'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      in_review: filteredTasks.filter(t => t.status === 'in_review'),
      done: filteredTasks.filter(t => t.status === 'done')
    }
  }, [filteredTasks])

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newTaskTitle.trim()) {return}

    createCompanyTask(
      newTaskTitle.trim(),
      newTaskDesc.trim(),
      newTaskAssignee,
      newTaskPriority,
      'Strategic Sprint',
      parseFloat(newTaskBudget) || 20
    )

    setNewTaskTitle('')
    setNewTaskDesc('')
    setIsNewTaskModalOpen(false)
  }

  const handleHireAgent = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newAgentName.trim() || !newAgentRole.trim()) {return}

    addCompanyAgent({
      name: newAgentName.trim(),
      role: newAgentRole.trim(),
      title: newAgentRole.trim(),
      department: newAgentDept,
      reportsTo: 'agent_hermes_ceo',
      avatarColor: '#f97316',
      status: 'idle',
      budgetUsd: 200,
      soulSnippet: newAgentSoul.trim() || 'Autonomous specialist executing domain-specific actions.'
    })

    setNewAgentName('')
    setNewAgentRole('')
    setNewAgentSoul('')
    setIsHireModalOpen(false)
  }

  const handleTriggerHeartbeat = async () => {
    await runCompanyHeartbeat()
    void speakCompanionText(
      'Local coordination check complete. Paperclip is not connected; no agent tasks were executed.'
    )
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#0c0e12] overflow-hidden text-slate-100 font-sans">
      {/* Top Company Banner (Industrial 60-30-10: Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
      <div className="px-6 py-4 border-b border-[#262c37] bg-[#101318] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00] shadow-md shadow-[#ff6a00]/20">
            <Building className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{profile.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1b202a] text-[#ff7f24] border border-[#ff6a00]/30">
                Local prototype · Paperclip disconnected
              </span>
            </div>
            <p className="text-xs text-[#9aa5b8] truncate max-w-xl">{profile.mission}</p>
          </div>
        </div>

        {/* Financial P&L & Metrics Widget */}
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0c0e12] border border-[#262c37] flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <Coins className="size-3.5 text-[#ff6a00]" />
              <span className="text-[#9aa5b8]">Spend:</span>
              <span className="font-mono font-bold text-white">${profile.spentBudgetUsd.toFixed(2)}</span>
              <span className="text-[#9aa5b8] font-mono">/ ${profile.monthlyBudgetUsd}</span>
            </div>
            <div className="w-16 bg-[#1b202a] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#ff6a00] h-full rounded-full"
                style={{
                  width: `${Math.min(100, (profile.spentBudgetUsd / profile.monthlyBudgetUsd) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* Pending Approvals Pill */}
          {pendingApprovalsCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6a00]/20 border border-[#ff6a00]/60 text-xs font-semibold text-[#ff7f24] cursor-pointer animate-pulse"
              onClick={() => setActiveSubView('board')}
              title="Tasks awaiting founder approval"
            >
              <GitPullRequest className="size-3.5 text-[#ff6a00]" />
              <span>{pendingApprovalsCount} Approval Needed</span>
            </div>
          )}

          {/* Autonomous Heartbeat Runner */}
          <button
            aria-label="Check local coordination status (no real Paperclip execution)"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1b202a] hover:bg-[#262c37] border border-[#ff6a00]/40 text-xs font-medium text-slate-200 transition-all cursor-pointer shadow-sm hover:border-[#ff6a00]"
            disabled={isHeartbeatRunning}
            onClick={handleTriggerHeartbeat}
            type="button"
          >
            <RefreshCw
              className={`size-3.5 text-[#ff6a00] ${isHeartbeatRunning ? 'animate-spin' : ''}`}
            />
            <span>{isHeartbeatRunning ? 'Checking...' : 'Check Coordination'}</span>
          </button>

          {/* Quick Onboarding / Edit Trigger */}
          <button
            aria-label="Reconfigure Company Settings & Goals"
            className="p-2 rounded-xl bg-[#0c0e12] hover:bg-[#1b202a] border border-[#262c37] text-slate-400 hover:text-white transition-colors cursor-pointer"
            onClick={openCompanyOnboarding}
            type="button"
          >
            <Wrench className="size-3.5 text-[#ff7f24]" />
          </button>
        </div>
      </div>

      {/* Sub-navigation & Controls Bar */}
      <div className="px-6 py-2.5 border-b border-[#262c37] bg-[#0c0e12] flex items-center justify-between gap-4 shrink-0">
        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5">
          <button
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === 'board'
                ? 'bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/50'
                : 'text-[#9aa5b8] hover:text-white hover:bg-[#1b202a]'
            }`}
            onClick={() => setActiveSubView('board')}
            type="button"
          >
            <Layers className="size-3.5" />
            <span>Autonomous Task Board ({tasks.length})</span>
          </button>

          <button
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === 'org'
                ? 'bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/50'
                : 'text-[#9aa5b8] hover:text-white hover:bg-[#1b202a]'
            }`}
            onClick={() => setActiveSubView('org')}
            type="button"
          >
            <Users className="size-3.5" />
            <span>Executive Org Chart ({agents.length})</span>
          </button>

          <button
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === 'logs'
                ? 'bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/50'
                : 'text-[#9aa5b8] hover:text-white hover:bg-[#1b202a]'
            }`}
            onClick={() => setActiveSubView('logs')}
            type="button"
          >
            <Activity className="size-3.5" />
            <span>Heartbeat Telemetry</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeSubView === 'board' && (
            <button
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ff6a00] hover:bg-[#ff7f24] text-xs font-bold text-black transition-colors cursor-pointer shadow-sm shadow-[#ff6a00]/30"
              onClick={() => setIsNewTaskModalOpen(true)}
              type="button"
            >
              <Plus className="size-3.5" />
              <span>Create Task</span>
            </button>
          )}

          {activeSubView === 'org' && (
            <button
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ff6a00] hover:bg-[#ff7f24] text-xs font-bold text-black transition-colors cursor-pointer shadow-sm shadow-[#ff6a00]/30"
              onClick={() => setIsHireModalOpen(true)}
              type="button"
            >
              <UserPlus className="size-3.5" />
              <span>Hire AI Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {/* SUBVIEW 1: KANBAN TASK BOARD */}
        {activeSubView === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full overflow-hidden">
            {/* Column 1: Backlog (todo) */}
            <div className="flex flex-col rounded-2xl bg-[#101318] border border-[#262c37] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#262c37] bg-[#161a22] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Backlog
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-md bg-[#0c0e12]">
                  {tasksByColumn.todo.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {tasksByColumn.todo.map(task => (
                  <TaskCard
                    agents={agents}
                    key={task.id}
                    onClick={() => $selectedTaskId.set(task.id)}
                    task={task}
                  />
                ))}
                {tasksByColumn.todo.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">No tasks in backlog</div>
                )}
              </div>
            </div>

            {/* Column 2: In Progress (in_progress) */}
            <div className="flex flex-col rounded-2xl bg-[#101318] border border-[#262c37] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#262c37] bg-[#161a22] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    In Progress
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-md bg-[#0c0e12]">
                  {tasksByColumn.in_progress.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {tasksByColumn.in_progress.map(task => (
                  <TaskCard
                    agents={agents}
                    key={task.id}
                    onClick={() => $selectedTaskId.set(task.id)}
                    task={task}
                  />
                ))}
                {tasksByColumn.in_progress.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">No active tasks executing</div>
                )}
              </div>
            </div>

            {/* Column 3: Approval Gate (in_review) - Safety Orange Highlighted */}
            <div className="flex flex-col rounded-2xl bg-[#101318] border border-[#ff6a00]/40 overflow-hidden shadow-lg shadow-[#ff6a00]/10">
              <div className="px-4 py-3 border-b border-[#ff6a00]/40 bg-[#ff6a00]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#ff6a00] animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ff7f24] flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" />
                    Approval Gate
                  </span>
                </div>
                <span className="text-xs font-mono text-[#ff7f24] font-bold px-2 py-0.5 rounded-md bg-[#0c0e12] border border-[#ff6a00]/30">
                  {tasksByColumn.in_review.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {tasksByColumn.in_review.map(task => (
                  <TaskCard
                    agents={agents}
                    highlightReview
                    key={task.id}
                    onClick={() => $selectedTaskId.set(task.id)}
                    task={task}
                  />
                ))}
                {tasksByColumn.in_review.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#9aa5b8]">
                    All approvals cleared! Work flows smoothly.
                  </div>
                )}
              </div>
            </div>

            {/* Column 4: Completed (done) */}
            <div className="flex flex-col rounded-2xl bg-[#101318] border border-[#262c37] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#262c37] bg-[#161a22] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Completed
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-md bg-[#0c0e12]">
                  {tasksByColumn.done.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {tasksByColumn.done.map(task => (
                  <TaskCard
                    agents={agents}
                    key={task.id}
                    onClick={() => $selectedTaskId.set(task.id)}
                    task={task}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBVIEW 2: EXECUTIVE ORG CHART */}
        {activeSubView === 'org' && (
          <div className="h-full overflow-y-auto space-y-6 max-w-5xl mx-auto">
            {/* Top Founder Node */}
            <div className="flex flex-col items-center">
              <div className="px-6 py-4 rounded-2xl bg-[#101318] border border-[#ff6a00]/50 shadow-lg shadow-[#ff6a00]/15 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-gradient-to-tr from-[#ff6a00] to-[#ff944d] flex items-center justify-center text-black font-bold text-lg">
                  F
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Executive Founder (You)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6a00]/20 text-[#ff7f24] font-mono border border-[#ff6a00]/40">
                      Ultimate Authority
                    </span>
                  </div>
                  <p className="text-xs text-[#9aa5b8]">
                    Reviews high-stakes approvals, dictates company mission, steers ROI.
                  </p>
                </div>
              </div>

              <div className="w-[2px] h-8 bg-[#262c37]" />
            </div>

            {/* CEO Tier */}
            <div className="flex flex-col items-center">
              {agents.filter(a => a.department === 'Executive').map(ceo => (
                <div
                  className="px-6 py-4 rounded-2xl bg-[#101318] border border-[#ff6a00]/40 shadow-md w-full max-w-xl flex items-start gap-4"
                  key={ceo.id}
                >
                  <div
                    className="size-12 rounded-xl flex items-center justify-center font-bold text-lg text-black shrink-0"
                    style={{ backgroundColor: ceo.avatarColor }}
                  >
                    H
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {ceo.name}
                        <span className="text-[11px] text-[#ff7f24] font-mono">({ceo.role})</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                        {ceo.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{ceo.soulSnippet}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-[#9aa5b8] flex-wrap">
                      <span>Completed: {ceo.tasksCompleted} tasks</span>
                      <span>Spend: ${ceo.spentUsd.toFixed(2)}</span>
                      <span className="flex items-center gap-1 text-[#ff7f24] px-2 py-0.5 rounded bg-[#0c0e12] border border-[#ff6a00]/30 text-[10px]">
                        <Cpu className="size-3 text-[#ff6a00]" />
                        {ceo.modelPreference || 'Dynamic Smart Tier'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="w-[2px] h-8 bg-[#262c37]" />
            </div>

            {/* Department Leads Tier */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.filter(a => a.department !== 'Executive').map(agent => (
                <div
                  className="p-4 rounded-2xl bg-[#101318] border border-[#262c37] hover:border-[#ff6a00]/40 transition-colors flex flex-col justify-between"
                  key={agent.id}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="size-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: agent.avatarColor }}
                      >
                        {agent.name[0]}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{agent.name}</div>
                        <div className="text-[10px] text-[#9aa5b8] truncate">{agent.role}</div>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-[#ff7f24] px-2 py-0.5 rounded bg-[#0c0e12] border border-[#ff6a00]/25 truncate">
                      <Cpu className="size-2.5 text-[#ff6a00] shrink-0" />
                      <span className="truncate">{agent.modelPreference || 'Dynamic (Auto)'}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-3 mb-3">{agent.soulSnippet}</p>
                  </div>

                  <div className="pt-3 border-t border-[#262c37] flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{agent.department}</span>
                    <span className="text-emerald-400">{agent.tasksCompleted} done</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBVIEW 3: HEARTBEAT LOGS */}
        {activeSubView === 'logs' && (
          <div className="h-full rounded-2xl bg-[#101318] border border-[#262c37] p-4 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#262c37] mb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <Activity className="size-4 text-[#ff6a00]" />
                <span className="font-bold">Paperclip Autonomous Heartbeat Telemetry</span>
              </div>
              <span className="text-[11px] text-[#9aa5b8]">{heartbeatLogs.length} events logged</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 text-slate-300">
              {heartbeatLogs.map((log, idx) => (
                <div className="flex items-start gap-2 hover:bg-[#1b202a] px-2 py-1 rounded" key={idx}>
                  <span className="text-[#ff6a00] select-none">»</span>
                  <span className={log.includes('APPROVAL GATE') ? 'text-[#ff7f24] font-bold' : ''}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOUNDER APPROVAL GATE MODAL / DRAWER */}
      {selectedTask && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          role="dialog"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#101318] border border-[#262c37] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#262c37] bg-[#0c0e12] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#ff6a00]/20 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00]">
                  <GitPullRequest className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedTask.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#9aa5b8]">
                    <span>Status: <strong className="text-white uppercase">{selectedTask.status}</strong></span>
                    <span>•</span>
                    <span>Assignee: <strong className="text-white">{getAgentName(selectedTask.assigneeAgentId, agents)}</strong></span>
                  </div>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262c37]"
                onClick={() => $selectedTaskId.set(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-[#9aa5b8] uppercase tracking-wider mb-1">
                  Objective & Description
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-[#0c0e12] p-3 rounded-xl border border-[#262c37]">
                  {selectedTask.description}
                </p>
              </div>

              {selectedTask.diffPreview && (
                <div>
                  <h4 className="text-xs font-semibold text-[#ff7f24] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileCode className="size-3.5" />
                    Agent Deliverables & Diff Preview
                  </h4>
                  <pre className="p-3 rounded-xl bg-black border border-[#262c37] font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {selectedTask.diffPreview}
                  </pre>
                </div>
              )}

              {selectedTask.status === 'in_review' && (
                <div className="p-4 rounded-xl bg-[#ff6a00]/10 border border-[#ff6a00]/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#ff7f24]">
                    <ShieldCheck className="size-4" />
                    Founder Sign-Off Required Before Landing
                  </div>
                  <p className="text-xs text-[#9aa5b8]">
                    In accordance with Paperclip governance rules, this change has reached execution completion. Approving records ${selectedTask.spentUsd.toFixed(2)} to the P&L and marks it done.
                  </p>

                  <div className="pt-2">
                    <input
                      className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#ff6a00]"
                      onChange={e => setRejectFeedback(e.target.value)}
                      placeholder="Optional steering notes or feedback..."
                      type="text"
                      value={rejectFeedback}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[#262c37] bg-[#0c0e12] flex items-center justify-between">
              <button
                className="px-4 py-2 rounded-xl bg-[#1b202a] hover:bg-[#262c37] text-xs font-medium text-slate-300 transition-colors"
                onClick={() => $selectedTaskId.set(null)}
                type="button"
              >
                Close
              </button>

              {selectedTask.status === 'in_review' && (
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/40 transition-colors"
                    onClick={() => {
                      rejectCompanyTask(selectedTask.id, rejectFeedback || 'Founder requested further iterations.')
                      $selectedTaskId.set(null)
                    }}
                    type="button"
                  >
                    Reject & Request Changes
                  </button>

                  <button
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff6a00] hover:bg-[#ff7f24] text-xs font-bold text-black shadow-md shadow-[#ff6a00]/30 transition-all cursor-pointer"
                    onClick={() => {
                      approveCompanyTask(selectedTask.id)
                      $selectedTaskId.set(null)
                    }}
                    type="button"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Approve & Merge Deliverable</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#101318] border border-[#262c37] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#262c37]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="size-4 text-[#ff6a00]" />
                Create Strategic Task
              </h3>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setIsNewTaskModalOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleCreateTask}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement webhook listener for user auth"
                  required
                  type="text"
                  value={newTaskTitle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00] resize-none"
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder="Specific requirements, acceptance criteria, or target URLs..."
                  rows={2}
                  value={newTaskDesc}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    value={newTaskAssignee}
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                    onChange={e => setNewTaskPriority(e.target.value as CompanyTask['priority'])}
                    value={newTaskPriority}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl bg-[#1b202a] text-xs font-medium text-slate-300 hover:bg-[#262c37]"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2 rounded-xl bg-[#ff6a00] text-xs font-bold text-black hover:bg-[#ff7f24] shadow-md shadow-[#ff6a00]/30"
                  type="submit"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIRE NEW AGENT MODAL */}
      {isHireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#101318] border border-[#262c37] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#262c37]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="size-4 text-[#ff6a00]" />
                Hire Autonomous Agent
              </h3>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setIsHireModalOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleHireAgent}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="e.g. Vulcan"
                  required
                  type="text"
                  value={newAgentName}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Specialized Role</label>
                <input
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                  onChange={e => setNewAgentRole(e.target.value)}
                  placeholder="e.g. DevOps & Infrastructure Sentinel"
                  required
                  type="text"
                  value={newAgentRole}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                <select
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00]"
                  onChange={e => setNewAgentDept(e.target.value as CompanyAgent['department'])}
                  value={newAgentDept}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Research">Research</option>
                  <option value="Design">Design</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Soul / Persona</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-xs text-white focus:outline-none focus:border-[#ff6a00] resize-none"
                  onChange={e => setNewAgentSoul(e.target.value)}
                  placeholder="Core responsibilities and decision rules..."
                  rows={2}
                  value={newAgentSoul}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl bg-[#1b202a] text-xs font-medium text-slate-300 hover:bg-[#262c37]"
                  onClick={() => setIsHireModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2 rounded-xl bg-[#ff6a00] text-xs font-bold text-black hover:bg-[#ff7f24] shadow-md shadow-[#ff6a00]/30"
                  type="submit"
                >
                  Onboard Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task,
  agents,
  highlightReview = false,
  onClick
}: {
  task: CompanyTask
  agents: CompanyAgent[]
  highlightReview?: boolean
  onClick: () => void
}) {
  const assignee = agents.find(a => a.id === task.assigneeAgentId)

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 ${
        highlightReview
          ? 'bg-[#1b1c24] border-[#ff6a00]/60 hover:border-[#ff6a00] shadow-sm shadow-[#ff6a00]/20'
          : 'bg-[#0c0e12] border-[#262c37] hover:border-[#333a49] hover:bg-[#12161f]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
            task.priority === 'urgent'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : task.priority === 'high'
              ? 'bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/30'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {task.priority}
        </span>
        <span className="text-[10px] text-[#9aa5b8] font-mono truncate max-w-[120px]">
          {task.goalTag}
        </span>
      </div>

      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{task.title}</h4>

      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>

      {task.allocatedModel && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-[#ff7f24] bg-[#161a22] px-2 py-0.5 rounded border border-[#ff6a00]/25 truncate">
          <Cpu className="size-2.5 text-[#ff6a00] shrink-0" />
          <span className="truncate">{task.allocatedModel}</span>
        </div>
      )}

      <div className="pt-2 border-t border-[#262c37] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <div
            className="size-4 rounded-full flex items-center justify-center font-bold text-[8px] text-black"
            style={{ backgroundColor: assignee?.avatarColor || '#94a3b8' }}
          >
            {assignee ? assignee.name[0] : '?'}
          </div>
          <span className="text-slate-300 font-medium truncate max-w-[90px]">
            {assignee?.name || 'Unassigned'}
          </span>
        </div>

        <div className="font-mono text-[#ff7f24] font-semibold">${task.spentUsd.toFixed(1)}</div>
      </div>
    </div>
  )
}

function getAgentName(id: string, agents: CompanyAgent[]): string {
  const a = agents.find(ag => ag.id === id)

  return a ? a.name : 'Unassigned Agent'
}
