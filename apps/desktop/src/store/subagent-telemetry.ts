import { atom } from 'nanostores'

import type {
  AIEmployee,
  SubagentArtifactPayload,
  SubagentCompletedPayload,
  SubagentControlPayload,
  SubagentProgressPayload,
  SubagentSpawnPayload,
  SubagentStatus
} from '@/app/voice-ai-os/types'

/** Store for active and recent AI Employees (concurrent subagents) */
export const $aiEmployees = atom<AIEmployee[]>([])
export const $selectedEmployeeId = atom<string | null>(null)
export const $concurrencyLimit = atom<number>(6)

const AVATAR_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#6366f1'  // Indigo
]

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

/** Update or insert an AI Employee */
export function upsertAIEmployee(partial: Partial<AIEmployee> & { id: string }): void {
  const current = $aiEmployees.get()
  const existingIndex = current.findIndex(emp => emp.id === partial.id)

  if (existingIndex >= 0) {
    const updated = [...current]
    updated[existingIndex] = {
      ...updated[existingIndex],
      ...partial,
      updatedAt: Date.now()
    }
    $aiEmployees.set(updated)
  } else {
    const newEmployee: AIEmployee = {
      id: partial.id,
      parentId: partial.parentId ?? null,
      delegationId: partial.delegationId ?? `batch_${Date.now().toString(36)}`,
      goal: partial.goal ?? 'Autonomous Task Execution',
      model: partial.model ?? 'hermes-3-70b',
      status: (partial.status as SubagentStatus) ?? 'running',
      taskIndex: partial.taskIndex ?? 1,
      taskCount: partial.taskCount ?? 1,
      sandboxPath: partial.sandboxPath ?? `C:\\Users\\User\\.hermes\\sandboxes\\${partial.id}`,
      startedAt: partial.startedAt ?? Date.now(),
      updatedAt: Date.now(),
      turn: partial.turn ?? 1,
      currentTool: partial.currentTool,
      toolArgumentsPreview: partial.toolArgumentsPreview,
      thinkingSnippet: partial.thinkingSnippet,
      inputTokens: partial.inputTokens ?? 0,
      outputTokens: partial.outputTokens ?? 0,
      costUsd: partial.costUsd ?? 0.0,
      artifacts: partial.artifacts ?? [],
      avatarColor: partial.avatarColor ?? getAvatarColor(current.length)
    }

    $aiEmployees.set([newEmployee, ...current])
  }
}

/** Dispatch subagent control action */
export async function controlSubagent(
  subagentId: string,
  action: 'steer' | 'stop' | 'pause' | 'resume',
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const subagentApi = (window as unknown as {
    hermesDesktop?: {
      subagent?: {
        control: (p: SubagentControlPayload) => Promise<{ success: boolean; error?: string }>
      }
    }
  }).hermesDesktop?.subagent

  if (!subagentApi?.control) {
    return { success: false, error: 'Hermes subagent control bridge is unavailable; no action was executed.' }
  }

  try {
    const outcome = await subagentApi.control({ subagentId, action, message })

    if (!outcome.success) {return outcome}

    // State changes only after the backend acknowledges the action.
    const employee = $aiEmployees.get().find(e => e.id === subagentId)

    if (employee) {
      let nextStatus: SubagentStatus = employee.status

      if (action === 'stop') {nextStatus = 'interrupted'}
      else if (action === 'pause') {nextStatus = 'queued'}
      else if (action === 'resume') {nextStatus = 'running'}

      upsertAIEmployee({
        id: subagentId,
        status: nextStatus,
        thinkingSnippet: message ? `Steering guidance: "${message}"` : employee.thinkingSnippet
      })
    }

    return outcome
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** Steer subagent with interactive user prompt guidance */
export function steerSubagent(subagentId: string, guidance: string) {
  return controlSubagent(subagentId, 'steer', guidance)
}

/** Pause subagent */
export function pauseSubagent(subagentId: string) {
  return controlSubagent(subagentId, 'pause')
}

/** Resume paused subagent */
export function resumeSubagent(subagentId: string) {
  return controlSubagent(subagentId, 'resume')
}

/** Stop/Kill subagent */
export function stopSubagent(subagentId: string) {
  return controlSubagent(subagentId, 'stop')
}

/** Record generated artifact */
export function recordSubagentArtifact(artifact: SubagentArtifactPayload): void {
  const current = $aiEmployees.get()
  const emp = current.find(e => e.id === artifact.subagentId)

  if (emp) {
    const artifacts = [artifact, ...emp.artifacts.filter(a => a.path !== artifact.path)]
    upsertAIEmployee({ id: artifact.subagentId, artifacts })
  }
}

/** Initialize IPC listeners */
export function initSubagentTelemetryIpc(): () => void {
  const subagentApi = (window as unknown as {
    hermesDesktop?: {
      subagent?: {
        onSpawn?: (cb: (payload: SubagentSpawnPayload) => void) => () => void
        onProgress?: (cb: (payload: SubagentProgressPayload) => void) => () => void
        onArtifact?: (cb: (payload: SubagentArtifactPayload) => void) => () => void
        onCompleted?: (cb: (payload: SubagentCompletedPayload) => void) => () => void
      }
    }
  }).hermesDesktop?.subagent

  if (!subagentApi) {
    return () => {}
  }

  const unsubs: Array<() => void> = []

  if (subagentApi.onSpawn) {
    unsubs.push(
      subagentApi.onSpawn(spawn => {
        upsertAIEmployee({
          id: spawn.subagentId,
          parentId: spawn.parentId,
          delegationId: spawn.delegationId,
          goal: spawn.goal,
          model: spawn.model,
          taskIndex: spawn.taskIndex,
          taskCount: spawn.taskCount,
          sandboxPath: spawn.sandboxPath,
          startedAt: spawn.startedAt,
          status: 'running'
        })
      })
    )
  }

  if (subagentApi.onProgress) {
    unsubs.push(
      subagentApi.onProgress(prog => {
        upsertAIEmployee({
          id: prog.subagentId,
          turn: prog.turn,
          currentTool: prog.currentTool,
          toolArgumentsPreview: prog.toolArgumentsPreview,
          thinkingSnippet: prog.thinkingSnippet,
          inputTokens: prog.tokensUsed.input,
          outputTokens: prog.tokensUsed.output,
          costUsd: prog.costUsd
        })
      })
    )
  }

  if (subagentApi.onArtifact) {
    unsubs.push(subagentApi.onArtifact(art => recordSubagentArtifact(art)))
  }

  if (subagentApi.onCompleted) {
    unsubs.push(
      subagentApi.onCompleted(comp => {
        upsertAIEmployee({
          id: comp.subagentId,
          status: comp.status,
          durationSeconds: comp.durationSeconds,
          summary: comp.summary,
          inputTokens: comp.totalInputTokens,
          outputTokens: comp.totalOutputTokens,
          costUsd: comp.totalCostUsd
        })
      })
    )
  }

  return () => {
    unsubs.forEach(f => f())
  }
}

/** Seed demo initial employees if none exist (for preview and interactive demo) */
export function seedDemoAIEmployeesIfEmpty(): void {
  if ($aiEmployees.get().length > 0) {return}

  const now = Date.now()

  const sampleEmployees: AIEmployee[] = [
    {
      id: 'sub_architect_01',
      parentId: 'root_session_0',
      delegationId: 'batch_voice_os',
      goal: 'Audit Windows 11 DWM Mica Acrylic compositor bindings and compile direct audio buffer shaders',
      model: 'hermes-3-70b-deep-reasoning',
      status: 'running',
      taskIndex: 1,
      taskCount: 3,
      sandboxPath: 'C:\\Users\\User\\.hermes\\sandboxes\\sub_architect_01',
      startedAt: now - 124000,
      updatedAt: now - 3000,
      turn: 7,
      currentTool: 'native_shell_exec',
      toolArgumentsPreview: 'cargo check --release --package cua-compositor',
      thinkingSnippet: 'Verifying non-blocking IPC channel latency under high audio stream load...',
      inputTokens: 14230,
      outputTokens: 3840,
      costUsd: 0.048,
      avatarColor: '#06b6d4',
      artifacts: [
        {
          subagentId: 'sub_architect_01',
          delegationId: 'batch_voice_os',
          path: 'src/native/compositor.rs',
          action: 'modified',
          sizeBytes: 8420,
          timestamp: now - 25000
        }
      ]
    },
    {
      id: 'sub_browser_qa_02',
      parentId: 'root_session_0',
      delegationId: 'batch_voice_os',
      goal: 'Execute automated Set-of-Marks validation on Chrome settings tab',
      model: 'hermes-3-8b-fast',
      status: 'running',
      taskIndex: 2,
      taskCount: 3,
      sandboxPath: 'C:\\Users\\User\\.hermes\\sandboxes\\sub_browser_qa_02',
      startedAt: now - 62000,
      updatedAt: now - 1200,
      turn: 3,
      currentTool: 'computer_use',
      toolArgumentsPreview: 'click_element(mark_id: 14)',
      thinkingSnippet: 'Target button found at (642, 280), dispatching smooth cursor trajectory...',
      inputTokens: 6180,
      outputTokens: 1140,
      costUsd: 0.012,
      avatarColor: '#8b5cf6',
      artifacts: []
    },
    {
      id: 'sub_data_cleaner_03',
      parentId: 'root_session_0',
      delegationId: 'batch_etl_daily',
      goal: 'Compile voice transcript embeddings & index user memory graph',
      model: 'hermes-3-70b',
      status: 'completed',
      taskIndex: 1,
      taskCount: 1,
      sandboxPath: 'C:\\Users\\User\\.hermes\\sandboxes\\sub_data_cleaner_03',
      startedAt: now - 320000,
      updatedAt: now - 45000,
      turn: 12,
      inputTokens: 28400,
      outputTokens: 6710,
      costUsd: 0.092,
      durationSeconds: 275,
      summary: 'Successfully indexed 42 memory nodes into the local sqlite vector cache.',
      avatarColor: '#10b981',
      artifacts: [
        {
          subagentId: 'sub_data_cleaner_03',
          delegationId: 'batch_etl_daily',
          path: 'data/memory_graph.json',
          action: 'created',
          sizeBytes: 154200,
          timestamp: now - 50000
        }
      ]
    }
  ]

  $aiEmployees.set(sampleEmployees)
}

