import { useStore } from '@nanostores/react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  Copy,
  ExternalLink,
  FileCode,
  Folder,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  Square,
  Terminal,
  Users,
  Wrench,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  $aiEmployees,
  $concurrencyLimit,
  $selectedEmployeeId,
  controlSubagent,
  pauseSubagent,
  resumeSubagent,
  seedDemoAIEmployeesIfEmpty,
  steerSubagent,
  stopSubagent,
  upsertAIEmployee
} from '@/store/subagent-telemetry'

import type { AIEmployee, SubagentStatus } from './types'
import './voice-ai-os.css'

interface AIEmployeesGridProps {
  className?: string
}

export function AIEmployeesGrid({ className = '' }: AIEmployeesGridProps) {
  const employees = useStore($aiEmployees)
  const concurrencyLimit = useStore($concurrencyLimit)
  const selectedEmployeeId = useStore($selectedEmployeeId)

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [steeringTargetId, setSteeringTargetId] = useState<string | null>(null)
  const [steeringText, setSteeringText] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Live agent telemetry begins empty; demo workers require explicit developer action.

  // Filter and search computation
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (filterStatus !== 'all' && emp.status !== filterStatus) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          emp.goal.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          (emp.currentTool && emp.currentTool.toLowerCase().includes(q)) ||
          emp.model.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [employees, filterStatus, searchQuery])

  const runningCount = useMemo(() => {
    return employees.filter(e => e.status === 'running').length
  }, [employees])

  // Copy helper
  const handleCopyPath = (path: string, id: string) => {
    navigator.clipboard.writeText(path).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Handle steering submission
  const handleSteerSubmit = async (subagentId: string) => {
    if (!steeringText.trim()) return
    await steerSubagent(subagentId, steeringText.trim())
    setSteeringText('')
    setSteeringTargetId(null)
  }

  // Quick action: Spawn a new employee
  const handleSpawnDemoEmployee = () => {
    const id = `sub_agent_${Date.now().toString(36)}`
    upsertAIEmployee({
      id,
      goal: 'Explore local filesystem dependencies and generate unit test matrix',
      model: 'hermes-3-70b',
      status: 'running',
      taskIndex: 1,
      taskCount: 1,
      currentTool: 'file_search',
      toolArgumentsPreview: 'glob("**/*.test.ts")',
      thinkingSnippet: 'Parsing vitest configuration and directory tree...',
      inputTokens: 3200,
      outputTokens: 740,
      costUsd: 0.009
    })
  }

  return (
    <div
      className={`ai-employees-container flex flex-col w-full h-full p-4 md:p-6 overflow-hidden ${className}`}
      role="region"
      aria-label="AI Employees Multi-Agent Dashboard"
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                AI Employees Dashboard
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-normal bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Multi-Agent Pool
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous subagents operating in isolated Windows sandboxes
              </p>
            </div>
          </div>
        </div>

        {/* Concurrency and Metrics Gauge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <Layers className="size-3.5 text-blue-400" />
            <span className="text-slate-400">Concurrency:</span>
            <span className="font-mono font-semibold text-white">
              {runningCount} / {concurrencyLimit} active
            </span>
          </div>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleSpawnDemoEmployee}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
              title="Create a local sample only; no actual agent execution"
            >
              <Bot className="size-3.5" />
              <span>+ Demo Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 shrink-0">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'running', 'completed', 'interrupted', 'failed'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-white/15 text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {status}
              {status === 'running' && runningCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/30 text-cyan-300">
                  {runningCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search goal, tool or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Employees Grid Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] p-6">
            <Bot className="size-10 text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-300">No active AI employees found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Speak a multi-step task like "Refactor the audio player and run tests" to spawn
              autonomous subagents.
            </p>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleSpawnDemoEmployee}
                className="mt-4 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white"
              >
                Add sample worker (does not run)
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {filteredEmployees.map(emp => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                isSteering={steeringTargetId === emp.id}
                steeringText={steeringText}
                copiedId={copiedId}
                onOpenSteer={() => {
                  setSteeringTargetId(emp.id)
                  setSteeringText('')
                }}
                onCloseSteer={() => setSteeringTargetId(null)}
                onSteeringTextChange={setSteeringText}
                onSubmitSteer={() => handleSteerSubmit(emp.id)}
                onCopyPath={() => handleCopyPath(emp.sandboxPath, emp.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface EmployeeCardProps {
  employee: AIEmployee
  isSteering: boolean
  steeringText: string
  copiedId: string | null
  onOpenSteer: () => void
  onCloseSteer: () => void
  onSteeringTextChange: (text: string) => void
  onSubmitSteer: () => void
  onCopyPath: () => void
}

function EmployeeCard({
  employee,
  isSteering,
  steeringText,
  copiedId,
  onOpenSteer,
  onCloseSteer,
  onSteeringTextChange,
  onSubmitSteer,
  onCopyPath
}: EmployeeCardProps) {
  const isRunning = employee.status === 'running'
  const isFailed = employee.status === 'failed'
  const isCompleted = employee.status === 'completed'
  const isInterrupted = employee.status === 'interrupted'

  const statusBadge = () => {
    if (isRunning) {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
          Running
        </span>
      )
    }
    if (isCompleted) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="size-3 text-emerald-400" />
          Completed
        </span>
      )
    }
    if (isFailed) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
          <AlertCircle className="size-3 text-red-400" />
          Failed
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/40">
        <Square className="size-2.5" />
        Stopped
      </span>
    )
  }

  return (
    <div
      className={`voice-os-glass-card rounded-2xl p-4 flex flex-col justify-between border border-white/10 relative overflow-hidden transition-all duration-200 ${
        isRunning ? 'ring-1 ring-cyan-500/30' : ''
      }`}
    >
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner"
              style={{
                backgroundColor: `${employee.avatarColor}25`,
                borderColor: `${employee.avatarColor}60`,
                borderWidth: '1px',
                color: employee.avatarColor
              }}
            >
              <Bot className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-slate-200">{employee.id}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (Task {employee.taskIndex}/{employee.taskCount})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{employee.model}</span>
            </div>
          </div>
          {statusBadge()}
        </div>

        {/* Goal Description */}
        <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 mb-2.5 leading-snug">
          {employee.goal}
        </h4>

        {/* Active Tool Banner */}
        {employee.currentTool && isRunning && (
          <div className="mb-2.5 p-2 rounded-lg bg-black/30 border border-white/5 flex items-center gap-2 text-xs">
            <Wrench className="size-3.5 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="font-mono text-cyan-300 font-medium">{employee.currentTool}</span>
              {employee.toolArgumentsPreview && (
                <span className="text-slate-400 ml-1 font-mono text-[11px]">
                  ({employee.toolArgumentsPreview})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Thinking snippet or summary */}
        {employee.thinkingSnippet && isRunning && (
          <div className="mb-3 text-[11px] text-slate-400 italic line-clamp-2 pl-2 border-l-2 border-purple-500/50">
            "{employee.thinkingSnippet}"
          </div>
        )}

        {employee.summary && !isRunning && (
          <div className="mb-3 text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg line-clamp-2">
            {employee.summary}
          </div>
        )}

        {/* Sandboxed Filesystem Path */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5 mb-3">
          <div className="flex items-center gap-1.5 truncate">
            <Folder className="size-3.5 text-amber-400/80 shrink-0" />
            <span className="font-mono truncate">{employee.sandboxPath}</span>
          </div>
          <button
            type="button"
            onClick={onCopyPath}
            className="p-1 hover:text-white text-slate-400 rounded shrink-0 transition-colors"
            title="Copy sandbox path"
            aria-label="Copy sandbox path"
          >
            {copiedId === employee.id ? (
              <span className="text-[10px] text-emerald-400 font-mono">Copied!</span>
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>

        {/* Token & Spend Metrics */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-white/5 mb-3 text-[11px]">
          <div>
            <span className="text-slate-500 block text-[10px]">Tokens In/Out</span>
            <span className="font-mono text-slate-200">
              {(employee.inputTokens / 1000).toFixed(1)}k / {(employee.outputTokens / 1000).toFixed(1)}k
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Cost (USD)</span>
            <span className="font-mono text-emerald-400 font-medium">
              ${employee.costUsd.toFixed(3)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Runtime</span>
            <span className="font-mono text-slate-200">
              {Math.max(1, Math.round((Date.now() - employee.startedAt) / 1000))}s
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls / Inline Steer Dialog */}
      <div className="pt-2 border-t border-white/10">
        {isSteering ? (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-cyan-400">
              <span className="font-medium flex items-center gap-1">
                <Compass className="size-3" />
                Steer Employee Guidance
              </span>
              <button
                type="button"
                onClick={onCloseSteer}
                className="text-slate-400 hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Give real-time instructions..."
                value={steeringText}
                onChange={e => onSteeringTextChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSubmitSteer()
                  }
                }}
                className="flex-1 bg-black/40 border border-cyan-500/40 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                autoFocus
              />
              <button
                type="button"
                onClick={onSubmitSteer}
                className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1"
              >
                <Send className="size-3" />
                <span>Steer</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenSteer}
              disabled={!isRunning}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-xs font-medium text-slate-200 transition-colors"
            >
              <Compass className="size-3 text-cyan-400" />
              <span>Steer</span>
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={() => pauseSubagent(employee.id)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Pause worker"
                aria-label="Pause worker"
              >
                <Pause className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => resumeSubagent(employee.id)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Resume worker"
                aria-label="Resume worker"
              >
                <Play className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => stopSubagent(employee.id)}
              disabled={!isRunning}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-40 transition-colors"
              title="Stop worker"
              aria-label="Stop worker"
            >
              <Square className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

