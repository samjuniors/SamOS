import './voice-ai-os.css'

import { useStore } from '@nanostores/react'
import {
  Bot,
  Building,
  Cloud,
  Cpu,
  FolderTree,
  Globe,
  HardDrive,
  Layout,
  Mic,
  Minimize2,
  Monitor,
  Send,
  Server,
  Settings,
  Sparkles,
  Terminal,
  Wrench,
  Zap
} from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'

import { $aiProviderConfig } from '@/store/ai-provider-config'
import { $companyTasks } from '@/store/company-state'
import { $cuaActive, initCuaIpc } from '@/store/cua-state'
import { $systemHealth, openSelfRepairModal } from '@/store/self-repair-engine'
import { $aiEmployees, initSubagentTelemetryIpc } from '@/store/subagent-telemetry'
import {
  $micPermissionStatus,
  $voiceRmsLevel,
  $voiceState,
  handleSpokenCommand,
  initVoiceStateIpc,
  interruptVoice,
  requestMicrophonePermission,
  setVoiceState,
  toggleHandsfreeRecordingTurn
} from '@/store/voice-state'
import { $activeWorkspaceTab, setActiveWorkspaceTab } from '@/store/workspace-tab-state'

import { AIEmployeesGrid } from './ai-employees-grid'
import { AiProviderSettingsModal } from './ai-provider-settings-modal'
import { BrowserWorkspace } from './browser-workspace'
import { CompanyOnboardingModal } from './company-onboarding-modal'
import { CompanyView } from './company-view'
import { CuaActionOverlay } from './cua-action-overlay'
import { SelfRepairModal } from './self-repair-modal'
import type { ShellWindowMode } from './types'
import { VoiceHudOrb } from './voice-hud-orb'

const VoiceOsSettingsPanel = lazy(async () => ({
  default: (await import('./voice-os-settings-panel')).VoiceOsSettingsPanel
}))

interface VoiceAiOsRootProps {
  initialMode?: ShellWindowMode
  className?: string
}

export function VoiceAiOsRoot({
  initialMode = 'canvas',
  className = ''
}: VoiceAiOsRootProps) {
  const [windowMode, setWindowMode] = useState<ShellWindowMode>(initialMode)
  const activeTab = useStore($activeWorkspaceTab)
  const systemHealth = useStore($systemHealth)
  const [systemLoad, setSystemLoad] = useState({ cpu: 14, ramGb: 4.2 })
  const [voiceEngineSettingsOpen, setVoiceEngineSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'overview' | 'providers' | null>(null)
  const [textInput, setTextInput] = useState('')

  const voiceState = useStore($voiceState)
  const rmsLevel = useStore($voiceRmsLevel)
  const employees = useStore($aiEmployees)
  const isCuaActive = useStore($cuaActive)
  const aiConfig = useStore($aiProviderConfig)
  const micStatus = useStore($micPermissionStatus)
  const companyTasks = useStore($companyTasks)
  const pendingApprovalsCount = companyTasks.filter(t => t.status === 'in_review').length

  // Initialize typed IPC listeners for voice, subagent telemetry, and CUA
  useEffect(() => {
    const unsubVoice = initVoiceStateIpc()
    const unsubSubagent = initSubagentTelemetryIpc()
    const unsubCua = initCuaIpc()

    return () => {
      unsubVoice()
      unsubSubagent()
      unsubCua()
    }
  }, [])

  // Listen to global shortcuts: ESC for safety stop, Ctrl+Alt+H / Win+Shift+Space for HUD summon
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Settings and voice-engine overlays own Escape while open.
        if (settingsTab !== null || voiceEngineSettingsOpen) {
          return
        }

        if (voiceState !== 'IDLE') {
          void interruptVoice()
        }
      } else if ((e.ctrlKey && e.altKey && e.key.toLowerCase() === 'h') || (e.shiftKey && e.metaKey && e.code === 'Space')) {
        e.preventDefault()
        setVoiceState(voiceState === 'IDLE' ? 'LISTENING' : 'IDLE')
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts)

    return () => window.removeEventListener('keydown', handleGlobalShortcuts)
  }, [settingsTab, voiceEngineSettingsOpen, voiceState])

  // Total active subagents and cost calculation
  const totalTokens = employees.reduce((acc, curr) => acc + curr.inputTokens + curr.outputTokens, 0)
  const totalSpend = employees.reduce((acc, curr) => acc + curr.costUsd, 0)

  return (
    <div
      aria-label="Hermes Voice AI Operating System Shell"
      className={`voice-ai-os-shell flex flex-col w-screen h-screen bg-[#0c0e12] text-slate-100 overflow-hidden relative select-none font-sans ${className}`}
      role="application"
    >
      {/* Background Ambient Industrial Glow (Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className="absolute -top-[20%] left-1/4 w-[600px] h-[600px] rounded-full bg-[#ff6a00]/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-[10%] w-[500px] h-[500px] rounded-full bg-[#333a49]/30 blur-[130px]" />
        <div className="absolute -bottom-[20%] left-1/3 w-[700px] h-[700px] rounded-full bg-[#ff7f24]/8 blur-[160px]" />
      </div>

      {/* Top Windows 11 Mica OS Shell Titlebar (Matte Black & Storm Grey with Safety Orange accents) */}
      <header className="voice-os-glass relative z-50 flex items-center justify-between px-4 py-2 border-b border-[#262c37] shrink-0 bg-[#101318]/90">
        {/* Left: Brand & Voice Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-tr from-[#ff6a00] to-[#ff944d] flex items-center justify-center shadow-lg shadow-[#ff6a00]/30">
              <Sparkles className="size-3.5 text-black font-bold" />
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-white">
              Hermes <span className="text-[#ff6a00] font-mono">AI OS</span>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#262c37]" />

          {/* Autonomous Self-Repair Sentinel Pill */}
          <button
            aria-label="Autonomous Self-Repair Sentinel - Click to inspect or run full system diagnostics"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b202a] hover:bg-[#262c37] border border-[#ff6a00]/40 text-[11px] font-mono text-[#ff7f24] transition-all cursor-pointer shadow-sm shadow-[#ff6a00]/15"
            onClick={openSelfRepairModal}
            type="button"
          >
            <Wrench className="size-3 text-[#ff6a00] animate-pulse" />
            <span>{systemHealth.lastScanTime === null ? 'Health: Not checked' : `Basic checks: ${systemHealth.healthScore}%`}</span>
          </button>

          <div className="h-4 w-[1px] bg-[#262c37]" />

          {/* Voice Engine Duplex Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b202a] border border-[#262c37] text-[11px] font-mono text-slate-300">
            <Mic className="size-3 text-[#ff6a00]" />
            <span>16kHz Duplex</span>
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </div>

          {/* The provider pill jumps into the full Aro-style Providers page. */}
          <button
            aria-label="Open model providers and API keys"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b202a] hover:bg-[#262c37] border border-[#262c37] text-[11px] font-mono text-[#9aa5b8] hover:text-white transition-colors cursor-pointer"
            onClick={() => setSettingsTab('providers')}
            type="button"
          >
            {aiConfig.mode === 'offline' ? (
              <>
                <Server className="size-3 text-emerald-400" />
                <span>Offline ({aiConfig.offlineModel})</span>
              </>
            ) : (
              <>
                <Cloud className="size-3 text-[#ff7f24]" />
                <span>{aiConfig.cloudProvider.toUpperCase()} ({aiConfig.cloudApiKey ? 'Key Ready' : 'No Key'})</span>
              </>
            )}
            <Settings className="size-3 text-[#9aa5b8] hover:text-white ml-0.5" />
          </button>
        </div>

        {/* Center: Persistent Ambient Voice HUD Orb */}
        <div className="relative">
          <VoiceHudOrb isFloating={false} showControls={true} />
        </div>

        {/* Right: Window Mode Selector, System Telemetry & Hotkey Hints */}
        <div className="flex items-center gap-3">
          {/* System Load Metrics */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400 px-2">
            <div className="flex items-center gap-1">
              <Cpu className="size-3 text-cyan-400" />
              <span>CPU: {systemLoad.cpu}%</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="size-3 text-purple-400" />
              <span>RAM: {systemLoad.ramGb}GB</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <Zap className="size-3" />
              <span>${totalSpend.toFixed(3)}</span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Window Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              aria-label="HUD Mode"
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                windowMode === 'hud'
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setWindowMode('hud')}
              type="button"
            >
              <Minimize2 className="size-3" />
              <span className="hidden sm:inline">HUD</span>
            </button>
            <button
              aria-label="Canvas Workspace Mode"
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                windowMode === 'canvas'
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setWindowMode('canvas')}
              type="button"
            >
              <Layout className="size-3" />
              <span className="hidden sm:inline">Canvas</span>
            </button>
            <button
              aria-label="CUA Overlay Mode"
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                windowMode === 'cua_overlay'
                  ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setWindowMode('cua_overlay')}
              type="button"
            >
              <Monitor className="size-3" />
              <span className="hidden sm:inline">CUA</span>
            </button>
          </div>

          {/* Open the shared Aro-derived Settings panel, not the voice-only modal. */}
          <button
            aria-label="Open SamOS Settings"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            onClick={() => setSettingsTab('overview')}
            type="button"
          >
            <Settings className="size-3.5" />
          </button>

          {/* Global Hotkey Badge */}
          <div
            className="hidden xl:flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md bg-white/5 border border-white/5 text-slate-400"
            title="Global Summon Shortcut"
          >
            <span>Win+Shift+Space</span>
          </div>
        </div>
      </header>

      {/* Cloud API Key Notice Banner if not configured */}
      {aiConfig.mode === 'cloud' && !aiConfig.cloudApiKey && (
        <div className="bg-cyan-950/70 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-cyan-200 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Voice AI Engine:</strong> Add a <strong>Cloud API Key</strong> (Groq, OpenAI, Gemini, DeepSeek) or switch to <strong>100% Offline Local Model</strong> (Ollama).
            </span>
          </div>
          <button
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shrink-0 ml-3 shadow-md cursor-pointer"
            onClick={() => setVoiceEngineSettingsOpen(true)}
            type="button"
          >
            Configure Voice Engine
          </button>
        </div>
      )}

      {/* Hands-Free Microphone Activation Standby Banner */}
      {micStatus !== 'granted' && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <Mic className="size-3.5 text-amber-400 animate-pulse shrink-0" />
            <span>Hands-Free Mic Standby: Click button to activate microphone in browser/desktop.</span>
          </div>
          <button
            className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs shrink-0 ml-3 font-medium cursor-pointer"
            onClick={async () => {
              await requestMicrophonePermission()
            }}
            type="button"
          >
            🎙️ Activate Microphone
          </button>
        </div>
      )}

      {/* Main OS Viewport Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {windowMode === 'hud' ? (
          /* Pure Ambient HUD Focus Mode */
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            <div className="text-center max-w-md space-y-4">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Voice AI OS Ambient Mode
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hermes is listening in background standby. Issue commands naturally or summon the
                workspace canvas anytime.
              </p>
              <button
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors border border-white/10"
                onClick={() => setWindowMode('canvas')}
                type="button"
              >
                Expand Workspace Canvas
              </button>
            </div>
          </div>
        ) : (
          /* Full Desktop Workspace Shell */
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            {/* Secondary Navigation Tabs (60-30-10: Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
            <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-[#262c37] shrink-0 bg-[#101318]/90">
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'company'
                      ? 'bg-[#ff6a00]/15 text-[#ff7f24] border border-[#ff6a00]/50 shadow-sm shadow-[#ff6a00]/20'
                      : 'text-[#9aa5b8] hover:text-slate-100 hover:bg-[#1b202a]'
                  }`}
                  onClick={() => setActiveWorkspaceTab('company')}
                  type="button"
                >
                  <Building className="size-3.5 text-[#ff6a00]" />
                  <span>Company & Org</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="size-2 rounded-full bg-[#ff6a00] animate-ping ml-0.5" />
                  )}
                </button>

                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'employees'
                      ? 'bg-[#ff6a00]/15 text-[#ff7f24] border border-[#ff6a00]/50 shadow-sm shadow-[#ff6a00]/20'
                      : 'text-[#9aa5b8] hover:text-slate-100 hover:bg-[#1b202a]'
                  }`}
                  onClick={() => setActiveWorkspaceTab('employees')}
                  type="button"
                >
                  <Bot className="size-3.5 text-[#ff6a00]" />
                  <span>AI Employees ({employees.length})</span>
                </button>

                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'canvas'
                      ? 'bg-[#ff6a00]/15 text-[#ff7f24] border border-[#ff6a00]/50 shadow-sm shadow-[#ff6a00]/20'
                      : 'text-[#9aa5b8] hover:text-slate-100 hover:bg-[#1b202a]'
                  }`}
                  onClick={() => setActiveWorkspaceTab('canvas')}
                  type="button"
                >
                  <Terminal className="size-3.5 text-[#ff7f24]" />
                  <span>Workspace Canvas</span>
                </button>

                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'browser'
                      ? 'bg-[#ff6a00]/15 text-[#ff7f24] border border-[#ff6a00]/50 shadow-sm shadow-[#ff6a00]/20'
                      : 'text-[#9aa5b8] hover:text-slate-100 hover:bg-[#1b202a]'
                  }`}
                  onClick={() => setActiveWorkspaceTab('browser')}
                  type="button"
                >
                  <Globe className="size-3.5 text-[#ff6a00]" />
                  <span>Browser Workspace</span>
                </button>

                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'cua'
                      ? 'bg-[#ff6a00]/15 text-[#ff7f24] border border-[#ff6a00]/50 shadow-sm shadow-[#ff6a00]/20'
                      : 'text-[#9aa5b8] hover:text-slate-100 hover:bg-[#1b202a]'
                  }`}
                  onClick={() => setActiveWorkspaceTab('cua')}
                  type="button"
                >
                  <Monitor className="size-3.5 text-[#ff5500]" />
                  <span>CUA Automation (PC Access)</span>
                  {isCuaActive && (
                    <span className="size-2 rounded-full bg-[#ff6a00] animate-ping ml-1" />
                  )}
                </button>
              </div>

              {/* Status pill */}
              <div className="text-[11px] font-mono text-[#9aa5b8] flex items-center gap-2">
                <span>{(totalTokens / 1000).toFixed(1)}k tokens processed</span>
              </div>
            </div>

            {/* Active Workspace Viewport */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'company' && <CompanyView />}

              {activeTab === 'employees' && <AIEmployeesGrid />}

              {activeTab === 'canvas' && (
                <div className="flex-1 h-full p-6 overflow-y-auto">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="voice-os-glass-card rounded-2xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <FolderTree className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Active Project Workspace</h3>
                            <p className="text-xs text-slate-400">
                              Repository and isolated sandbox worktree bindings
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 text-slate-300">
                          %USERPROFILE%\.hermes\sandboxes
                        </span>
                      </div>

                      {/* Mock workspace canvas preview */}
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-300 space-y-2">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Terminal className="size-3.5" />
                          <span>Hermes Agent Terminal Daemon v2026.11</span>
                        </div>
                        <div className="text-slate-400 pl-4 border-l border-white/10 space-y-1">
                          <p>» Voice engine ready: 16kHz PCM duplex VAD</p>
                          <p>» Subagent pool online: 6 worker slots allocated</p>
                          <p>» CUA driver registered: Set-of-Marks vision pipeline initialized</p>
                          <p className="text-emerald-400 font-semibold">
                            » State: {voiceState} (Ready for hands-free audio instruction)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'browser' && <BrowserWorkspace />}

              {activeTab === 'cua' && (
                <div className="relative w-full h-full bg-slate-950/80">
                  <CuaActionOverlay alwaysVisibleInDemo={true} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global CUA Overlay when active in any view or when CUA mode is toggled */}
        {windowMode === 'cua_overlay' && <CuaActionOverlay alwaysVisibleInDemo={true} />}
      </main>

      {/* Hands-Free Voice & Text Command Input Bar (Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
      <footer className="voice-os-glass px-4 py-2 border-t border-[#262c37] shrink-0 flex items-center gap-3 bg-[#101318]/90">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b0e] border border-[#262c37] focus-within:border-[#ff6a00] transition-colors">
          <button
            aria-label="Toggle Microphone"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              voiceState === 'LISTENING' ? 'text-[#ff6a00] bg-[#ff6a00]/20 animate-pulse' : 'text-[#9aa5b8] hover:text-white'
            }`}
            onClick={async () => {
              await requestMicrophonePermission()

              if (voiceState === 'SPEAKING' || voiceState === 'THINKING') {
                void interruptVoice()
              } else {
                toggleHandsfreeRecordingTurn()
              }
            }}
            type="button"
          >
            <Mic className="size-4" />
          </button>
          <input
            className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder:text-[#9aa5b8]/60 focus:outline-none font-sans"
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && textInput.trim()) {
                const cmd = textInput.trim()
                setTextInput('')
                void handleSpokenCommand(cmd)
              }
            }}
            placeholder="Speak hands-free or type a command (e.g. 'check for issues and fix them', 'open notepad', 'open youtube', 'open calculator')..."
            type="text"
            value={textInput}
          />
          <button
            aria-label="Execute command"
            className="p-1 rounded-lg hover:bg-[#262c37] text-[#9aa5b8] hover:text-[#ff6a00] transition-colors cursor-pointer"
            onClick={() => {
              if (textInput.trim()) {
                const cmd = textInput.trim()
                setTextInput('')
                void handleSpokenCommand(cmd)
              }
            }}
            type="button"
          >
            <Send className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#9aa5b8] shrink-0">
          <button
            aria-label="Autonomous Self-Repair Sentinel"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1b202a] hover:bg-[#262c37] border border-[#262c37] hover:border-[#ff6a00]/40 text-[#ff7f24] transition-colors cursor-pointer"
            onClick={openSelfRepairModal}
            type="button"
          >
            <Wrench className="size-3 text-[#ff6a00]" />
            <span>Self-Repair</span>
          </button>

          <button
            aria-label="Configure Sofia voice engine"
            className="hover:text-slate-100 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1b202a] hover:bg-[#262c37] border border-[#262c37] transition-colors cursor-pointer"
            onClick={() => setVoiceEngineSettingsOpen(true)}
            type="button"
          >
            {aiConfig.mode === 'offline' ? (
              <span className="text-emerald-400 font-semibold">● Offline</span>
            ) : (
              <span className="text-[#ff7f24] font-semibold">● Cloud ({aiConfig.cloudProvider})</span>
            )}
            <Settings className="size-3 text-[#9aa5b8]" />
          </button>
        </div>
      </footer>

      {/* The primary gear opens the same Aro-derived full settings layout as classic chat. */}
      {settingsTab !== null && (
        <Suspense fallback={<div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#101318] text-sm text-slate-200" role="status">Opening SamOS Settings…</div>}>
          <VoiceOsSettingsPanel initialTab={settingsTab} onClose={() => setSettingsTab(null)} />
        </Suspense>
      )}

      {/* Sofia's independent voice-engine settings remain available separately. */}
      <AiProviderSettingsModal
        isOpen={voiceEngineSettingsOpen}
        onClose={() => setVoiceEngineSettingsOpen(false)}
      />

      {/* Founder Autonomous Self-Repair & Diagnostics Modal */}
      <SelfRepairModal />

      {/* Paperclip Autonomous Company Onboarding Wizard */}
      <CompanyOnboardingModal />
    </div>
  )
}

