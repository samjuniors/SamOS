/**
 * Voice AI OS Type Definitions and Contracts
 * Matches apps/desktop/VOICE_AI_OS_SPEC.md §4
 */

// ==========================================
// 1. Voice State Machine & Audio IPC
// ==========================================

export type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'CUA_ACTIVE' | 'DELEGATING'

export interface WakeWordEvent {
  keyword: string
  confidence: number
  timestamp: number
}

export interface AudioChunkPayload {
  pcmData: ArrayBuffer // 16kHz 16-bit mono PCM
  rmsLevel: number // 0.0 to 1.0 for waveform visualization
}

export interface VoiceTranscriptPayload {
  text: string
  isFinal: boolean
  confidence: number
}

export interface VoiceTtsChunkPayload {
  audioBase64: string
  mimeType: 'audio/wav' | 'audio/mp3' | 'audio/pcm'
  isLastChunk: boolean
  turnId: string
}

export interface VoiceIpcApi {
  getState: () => Promise<VoiceState>
  setState: (state: VoiceState) => Promise<void>
  onStateChanged: (callback: (state: VoiceState) => void) => () => void
  onWakeWord: (callback: (event: WakeWordEvent) => void) => () => void
  onAudioStream: (callback: (chunk: AudioChunkPayload) => void) => () => void
  onTranscript: (callback: (transcript: VoiceTranscriptPayload) => void) => () => void
  playTtsChunk: (chunk: VoiceTtsChunkPayload) => Promise<void>
  interrupt: () => Promise<void> // User barge-in
}

// ==========================================
// 2. Subagent Telemetry ("AI Employees")
// ==========================================

export type SubagentStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'

export interface SubagentSpawnPayload {
  subagentId: string
  parentId: string | null
  delegationId: string
  goal: string
  model: string
  taskIndex: number
  taskCount: number
  sandboxPath: string
  startedAt: number
}

export interface SubagentProgressPayload {
  subagentId: string
  delegationId: string
  turn: number
  currentTool?: string
  toolArgumentsPreview?: string
  thinkingSnippet?: string
  tokensUsed: {
    input: number
    output: number
  }
  costUsd?: number
  updatedAt: number
}

export interface SubagentArtifactPayload {
  subagentId: string
  delegationId: string
  path: string
  action: 'created' | 'modified' | 'deleted'
  sizeBytes: number
  previewSnippet?: string
  timestamp: number
}

export interface SubagentCompletedPayload {
  subagentId: string
  delegationId: string
  status: SubagentStatus
  durationSeconds: number
  summary: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  filesWritten: string[]
  completedAt: number
}

export interface SubagentControlPayload {
  subagentId: string
  action: 'steer' | 'stop' | 'pause' | 'resume'
  message?: string
}

export interface SubagentIpcApi {
  list: () => Promise<SubagentSpawnPayload[]>
  control: (payload: SubagentControlPayload) => Promise<{ success: boolean; error?: string }>
  onSpawn: (callback: (payload: SubagentSpawnPayload) => void) => () => void
  onProgress: (callback: (payload: SubagentProgressPayload) => void) => () => void
  onArtifact: (callback: (payload: SubagentArtifactPayload) => void) => () => void
  onCompleted: (callback: (payload: SubagentCompletedPayload) => void) => () => void
}

/** Merged model for UI rendering in the AI Employees Grid */
export interface AIEmployee {
  id: string
  parentId: string | null
  delegationId: string
  goal: string
  model: string
  status: SubagentStatus
  taskIndex: number
  taskCount: number
  sandboxPath: string
  startedAt: number
  updatedAt: number
  turn: number
  currentTool?: string
  toolArgumentsPreview?: string
  thinkingSnippet?: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationSeconds?: number
  summary?: string
  artifacts: SubagentArtifactPayload[]
  avatarColor: string
}

// ==========================================
// 3. Computer Use Agent (CUA)
// ==========================================

export interface CuaUIElement {
  id: number // 1-based Set-of-Marks ID
  label: string
  role: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CuaCapturePayload {
  sessionId: string
  targetApp: string
  windowId: number
  screenshotBase64: string
  width: number
  height: number
  elements: CuaUIElement[]
  timestamp: number
}

export interface CuaActionStartPayload {
  sessionId: string
  action: 'click' | 'double_click' | 'right_click' | 'type' | 'key' | 'drag' | 'scroll' | 'launch'
  coordinate?: [number, number]
  elementId?: number
  text?: string
  keys?: string
  targetBounds?: { x: number; y: number; width: number; height: number }
  timestamp: number
}

export interface CuaActionEndPayload {
  sessionId: string
  action: string
  success: boolean
  error?: string
  elapsedMs: number
  timestamp: number
}

export interface CuaIpcApi {
  onCapture: (callback: (payload: CuaCapturePayload) => void) => () => void
  onActionStart: (callback: (payload: CuaActionStartPayload) => void) => () => void
  onActionEnd: (callback: (payload: CuaActionEndPayload) => void) => () => void
  abort: () => Promise<void> // Safety abort (ESC or voice command)
}

// ==========================================
// 4. Windows Shell & System Tray
// ==========================================

export type ShellWindowMode = 'hud' | 'canvas' | 'cua_overlay' | 'minimized'

export interface StartupStatus {
  enabled: boolean
  openAsHidden: boolean
  registryKey: string
}

export interface TrayState {
  voiceState: VoiceState
  tooltip: string
  badgeCount?: number
}

export interface SystemIpcApi {
  getStartupStatus: () => Promise<StartupStatus>
  toggleStartup: (enable: boolean) => Promise<StartupStatus>
  setWindowMode: (mode: ShellWindowMode) => Promise<void>
  getWindowMode: () => Promise<ShellWindowMode>
  setTrayState: (state: TrayState) => Promise<void>
  onWindowModeChanged: (callback: (mode: ShellWindowMode) => void) => () => void
}

