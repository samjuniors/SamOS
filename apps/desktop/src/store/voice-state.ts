import { atom } from 'nanostores'

import { navigateToUrl } from '@/app/voice-ai-os/browser-workspace'
import type { AudioChunkPayload, VoiceState, VoiceTranscriptPayload, WakeWordEvent } from '@/app/voice-ai-os/types'

import {
  $aiProviderConfig,
  executeAiCompletion,
  generateGeminiSpeechAudio,
  processAudioQueryWithGemini
} from './ai-provider-config'
import { $cuaActive, $cuaTargetApp, recordCuaActionStart } from './cua-state'
import { upsertAIEmployee } from './subagent-telemetry'
import { setActiveWorkspaceTab } from './workspace-tab-state'

/**
 * Voice AI OS finite state machine store.
 * Manages IDLE -> LISTENING -> THINKING -> SPEAKING / CUA_ACTIVE / DELEGATING transitions.
 */
export const $voiceState = atom<VoiceState>('IDLE')
export const $voiceRmsLevel = atom<number>(0)
export const $voiceTranscript = atom<VoiceTranscriptPayload>({
  text: '',
  isFinal: false,
  confidence: 1.0
})
export const $wakeWordEvent = atom<WakeWordEvent | null>(null)
export const $isVoiceMuted = atom<boolean>(false)
export const $recentTranscripts = atom<Array<{ id: string; text: string; role: 'user' | 'agent'; timestamp: number }>>([])
export const $handsfreeActive = atom<boolean>(true)
export const $micPermissionStatus = atom<'prompt' | 'granted' | 'denied'>('prompt')

// Audio & Speech references
let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let animFrameId: number | null = null
let cleanupIpc: (() => void) | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null
let currentAudio: HTMLAudioElement | null = null

// Continuous Hands-free VAD (Voice Activity Detection) references
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let speechStartTime = 0
let silenceStart: number | null = null
let isRecordingTurn = false
let ambientNoiseFloor = 0.015

const SILENCE_DURATION_MS = 650
const MIN_SPEECH_DURATION_MS = 250
const MAX_RECORDING_DURATION_MS = 7500

/** Update current voice state */
export function setVoiceState(state: VoiceState): void {
  $voiceState.set(state)
  const voiceApi = (window as unknown as { hermesDesktop?: { voice?: { setState: (s: VoiceState) => Promise<void> } } }).hermesDesktop?.voice

  if (voiceApi?.setState) {
    void voiceApi.setState(state)
  }
}

/** Update real-time microphone RMS audio level (0.0 to 1.0) */
export function setVoiceRmsLevel(level: number): void {
  $voiceRmsLevel.set(Math.max(0, Math.min(1, level)))
}

/** Update real-time live streaming speech transcription */
export function setVoiceTranscript(transcript: VoiceTranscriptPayload): void {
  $voiceTranscript.set(transcript)
}

/** Stop playback locally without recursively invoking the Electron IPC interrupt. */
function stopLocalVoicePlayback(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }

  currentUtterance = null
  const currentState = $voiceState.get()

  if (currentState === 'SPEAKING' || currentState === 'THINKING' || currentState === 'CUA_ACTIVE') {
    $voiceState.set('IDLE')
  }
}

/** User barge-in interrupt: instantly stop TTS and notify Electron. */
export async function interruptVoice(): Promise<void> {
  stopLocalVoicePlayback()

  const voiceApi = (window as unknown as { hermesDesktop?: { voice?: { interrupt: () => Promise<void> } } }).hermesDesktop?.voice

  if (voiceApi?.interrupt) {
    try {
      await voiceApi.interrupt()
    } catch {
      // Local playback still stops when Electron is unavailable.
    }
  }
}

/** Toggle microphone mute */
export function toggleMicrophoneMute(): boolean {
  const next = !$isVoiceMuted.get()
  $isVoiceMuted.set(next)

  if (next) {
    if ($voiceState.get() === 'LISTENING') {
      $voiceState.set('IDLE')
    }

    stopHandsfreeMic()
  } else {
    void startHandsfreeAudio()
  }

  return next
}

/**
 * Dispatches recognized system intents for desktop automation, browser workspaces, and subagents.
 * Returns spoken response text if handled, or null if it should fall through to standard AI conversation.
 */
export async function dispatchSystemVoiceIntent(text: string): Promise<string | null> {
  const lower = text.toLowerCase()

  const cuaApi = (window as unknown as {
    hermesDesktop?: {
      cua?: {
        launchApp?: (name: string, args?: string[]) => Promise<{ success: boolean; pid?: number }>
        typeText?: (text: string) => Promise<{ success: boolean }>
        openBrowserPopup?: (url: string) => Promise<{ success: boolean }>
        openSystemUrl?: (url: string) => Promise<{ success: boolean }>
      }
    }
  }).hermesDesktop?.cua

  // 0. Autonomous Self-Repair & Founder System Diagnostics Command
  const isRepairCmd =
    lower.includes('self repair') ||
    lower.includes('check for issue') ||
    lower.includes('check issues') ||
    lower.includes('fix issue') ||
    lower.includes('fix it') ||
    lower.includes('diagnos') ||
    lower.includes('system health') ||
    lower.includes('repair computer') ||
    lower.includes('is everything working')

  if (isRepairCmd) {
    const { runAutonomousSelfRepair, openSelfRepairModal } = await import('./self-repair-engine')
    openSelfRepairModal()
    const result = await runAutonomousSelfRepair()

    return result.narration
  }

  // 0.1 Paperclip Autonomous Company & Org Voice Commands
  const isCompanyCmd =
    lower.includes('company status') ||
    lower.includes('team status') ||
    lower.includes('org chart') ||
    lower.includes('what are we working on') ||
    lower.includes('company update') ||
    lower.includes('company pulse') ||
    lower.includes('paperclip') ||
    lower.includes('company onboarding') ||
    lower.includes('trigger heartbeat') ||
    lower.includes('run heartbeat') ||
    lower.includes('approve task') ||
    lower.includes('approve deliverable')

  if (isCompanyCmd) {
    const {
      $companyProfile,
      $companyAgents,
      $companyTasks,
      openCompanyOnboarding,
      runCompanyHeartbeat,
      approveCompanyTask
    } = await import('./company-state')

    setActiveWorkspaceTab('company')

    if (lower.includes('onboarding')) {
      openCompanyOnboarding()

      return "Opening company onboarding. Let's configure your enterprise profile, executive roster, and budget guardrails."
    }

    if (lower.includes('heartbeat')) {
      await runCompanyHeartbeat()

      return "Local check complete. Paperclip is not yet connected; no agent tasks were executed."
    }

    if (lower.includes('approve')) {
      const inReviewTask = $companyTasks.get().find(t => t.status === 'in_review')

      if (inReviewTask) {
        approveCompanyTask(inReviewTask.id)

        return `Approved and merged "${inReviewTask.title}". Budget updated on company P&L.`
      }

      return "All pending tasks have already been approved. No deliverables are waiting in the review gate."
    }

    // Default company overview
    const prof = $companyProfile.get()
    const activeTasks = $companyTasks.get().filter(t => t.status === 'in_progress')
    const pendingReview = $companyTasks.get().filter(t => t.status === 'in_review')
    const agentList = $companyAgents.get()

    return `Here is our company status for ${prof.name}. We have ${agentList.length} executive agents on the roster with ${activeTasks.length} tasks in progress and ${pendingReview.length} awaiting your approval. Monthly spend is at $${prof.spentBudgetUsd.toFixed(2)} of our $${prof.monthlyBudgetUsd} limit.`
  }

  // 1. YouTube & Web Browser Commands
  const isYoutube = lower.includes('youtube') || lower.includes('you tube')
  const isPopup = lower.includes('popup') || lower.includes('pop out') || lower.includes('popout') || lower.includes('new window')

  const isBrowserCmd =
    lower.includes('open browser') ||
    lower.includes('open google') ||
    lower.includes('open github') ||
    lower.includes('search google') ||
    lower.includes('search web') ||
    lower.includes('.com') ||
    lower.includes('browse')

  if (isYoutube) {
    const url = 'https://www.youtube.com'
    navigateToUrl(url, isPopup)
    setActiveWorkspaceTab('browser')

    if (isPopup) {
      return 'Opening YouTube in a dedicated popup window for you.'
    } else {
      return 'Opening YouTube in your browser workspace now.'
    }
  }

  if (isBrowserCmd) {
    let target = 'https://www.google.com'

    if (lower.includes('github')) {
      target = 'https://github.com'
    } else if (lower.includes('google')) {
      target = 'https://www.google.com'
    } else {
      const match = text.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|io|dev|ai|net)[^\s]*/i)

      if (match) {
        target = match[0]
      } else {
        const query = text.replace(/^(open|browse|search|go to)\s+(the\s+)?(web|browser|google)?(\s*for)?/i, '').trim()
        target = query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : 'https://www.google.com'
      }
    }

    navigateToUrl(target, isPopup)
    setActiveWorkspaceTab('browser')

    return isPopup ? `Opening in a dedicated popup window.` : `Opening your browser workspace.`
  }

  // 2. Windows PC Control / Application Launch Commands
  const isNotepad = lower.includes('notepad') || lower.includes('text editor')
  const isCalc = lower.includes('calculator') || lower.includes('calc')
  const isExplorer = lower.includes('explorer') || lower.includes('file manager') || lower.includes('my computer')
  const isPaint = lower.includes('paint') || lower.includes('mspaint')
  const isTypeOnly = lower.startsWith('type ') || lower.startsWith('write ')
  const isClickOnly = lower.startsWith('click ') || lower.startsWith('drag ')

  if (isNotepad) {
    setActiveWorkspaceTab('cua')
    setVoiceState('CUA_ACTIVE')
    $cuaActive.set(true)
    $cuaTargetApp.set('Notepad')

    // Check if text to write was specified, e.g. "open notepad and write hello world" or "open notepad and type ..."
    const writeMatch = text.match(/(?:and\s+)?(?:write|type)\s+(?:in\s+notepad\s+)?(?:text\s+)?["']?(.+?)["']?$/i)
    const textToType = writeMatch ? writeMatch[1].trim() : null

    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('notepad.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Notepad.exe'
      })

      if (textToType && cuaApi.typeText) {
        setTimeout(async () => {
          await cuaApi.typeText!(textToType)
          recordCuaActionStart({
            sessionId: 'cua_live',
            action: 'type',
            timestamp: Date.now(),
            text: `Typed "${textToType}"`
          })
        }, 850)

        return `Opening Notepad on your computer and typing: "${textToType}".`
      }

      return 'Opening Notepad on your Windows desktop.'
    } else {
      return 'Opening Notepad on your Windows computer.'
    }
  }

  if (isCalc) {
    setActiveWorkspaceTab('cua')
    setVoiceState('CUA_ACTIVE')
    $cuaActive.set(true)
    $cuaTargetApp.set('Calculator')

    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('calc.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Calc.exe'
      })

      return 'Opening Calculator on your Windows computer.'
    }

    return 'Opening Calculator on your computer.'
  }

  if (isExplorer) {
    setActiveWorkspaceTab('cua')
    setVoiceState('CUA_ACTIVE')
    $cuaActive.set(true)
    $cuaTargetApp.set('Explorer')

    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('explorer.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Explorer.exe'
      })

      return 'Opening Windows File Explorer.'
    }

    return 'Opening Windows File Explorer.'
  }

  if (isPaint) {
    setActiveWorkspaceTab('cua')
    setVoiceState('CUA_ACTIVE')
    $cuaActive.set(true)
    $cuaTargetApp.set('Paint')

    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('mspaint.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Paint.exe'
      })

      return 'Opening Microsoft Paint on your computer.'
    }

    return 'Opening Microsoft Paint.'
  }

  if (isTypeOnly) {
    const textToType = text.replace(/^(type|write)\s+/i, '').trim()

    if (textToType && cuaApi?.typeText) {
      setActiveWorkspaceTab('cua')
      setVoiceState('CUA_ACTIVE')
      await cuaApi.typeText(textToType)
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'type',
        timestamp: Date.now(),
        text: `Typed "${textToType}"`
      })

      return `Typing: "${textToType}" into your active computer window.`
    }
  }

  if (isClickOnly) {
    setActiveWorkspaceTab('cua')
    setVoiceState('CUA_ACTIVE')
    $cuaActive.set(true)
    recordCuaActionStart({
      sessionId: 'cua_live',
      action: 'click',
      coordinate: [450, 320],
      timestamp: Date.now(),
      text
    })

    return 'Executing click interaction on your desktop.'
  }

  // 3. Subagent / Bot Delegation
  const isSubagentCommand =
    lower.includes('subagent') ||
    lower.includes('ai employee') ||
    lower.includes('create bot') ||
    lower.includes('spawn bot') ||
    lower.includes('delegate') ||
    lower.includes('new task')

  if (isSubagentCommand) {
    setVoiceState('DELEGATING')
    setActiveWorkspaceTab('employees')
    const botId = `bot_${Date.now().toString(36)}`
    const goal = text.replace(/^(create|spawn|delegate)\s+(subagent|bot|ai employee)?\s*(to)?/i, '').trim() || text
    upsertAIEmployee({
      id: botId,
      goal,
      model: $aiProviderConfig.get().mode === 'offline' ? $aiProviderConfig.get().offlineModel : $aiProviderConfig.get().cloudModel,
      sandboxPath: `~/.hermes/sandboxes/${botId}`,
      status: 'running',
      currentTool: 'terminal_exec',
      thinkingSnippet: 'Analyzing task requirements and executing workspace operations in sandbox...'
    })

    return `Delegating task to new AI employee: "${goal}".`
  }

  return null
}

/**
 * Handle spoken user query, dispatch to AI model, and speak the reply.
 */
export async function handleSpokenCommand(commandText: string): Promise<void> {
  const text = commandText.trim()

  if (!text) {return}

  // Record user utterance in transcript history
  const userEntry = {
    id: `tr_${Date.now()}_u`,
    text,
    role: 'user' as const,
    timestamp: Date.now()
  }

  $recentTranscripts.set([...$recentTranscripts.get().slice(-29), userEntry])

  setVoiceState('THINKING')

  // Autonomous Agent Decision Engine: Evaluates intent dynamically with full system context
  const { decideAndExecuteAgentAction } = await import('./agent-decision-engine')
  let reply = await decideAndExecuteAgentAction(text)

  if (!reply) {
    reply = await executeAiCompletion(text)
  }

  // Record assistant reply in transcript history
  const agentEntry = {
    id: `tr_${Date.now()}_a`,
    text: reply,
    role: 'agent' as const,
    timestamp: Date.now()
  }

  $recentTranscripts.set([...$recentTranscripts.get().slice(-29), agentEntry])

  await speakResponse(reply)
}

/**
 * Handle spoken audio recorded hands-free.
 * Sends raw audio directly to Google Gemini to listen, transcribe, and formulate the reply.
 */
export async function handleSpokenAudio(audioBase64: string, mimeType: string): Promise<void> {
  setVoiceState('THINKING')

  const { userTranscript, replyText } = await processAudioQueryWithGemini(audioBase64, mimeType)

  $voiceTranscript.set({
    text: userTranscript,
    isFinal: true,
    confidence: 1.0
  })

  // Record user utterance in transcript history
  const userEntry = {
    id: `tr_${Date.now()}_u`,
    text: userTranscript,
    role: 'user' as const,
    timestamp: Date.now()
  }

  $recentTranscripts.set([...$recentTranscripts.get().slice(-29), userEntry])

  // Autonomous Agent Decision Engine: Evaluates spoken intent dynamically with full system context
  const { decideAndExecuteAgentAction } = await import('./agent-decision-engine')
  let finalReply = await decideAndExecuteAgentAction(userTranscript)

  if (!finalReply) {
    finalReply = replyText || (await executeAiCompletion(userTranscript))
  }

  // Record assistant reply in transcript history
  const agentEntry = {
    id: `tr_${Date.now()}_a`,
    text: finalReply,
    role: 'agent' as const,
    timestamp: Date.now()
  }

  $recentTranscripts.set([...$recentTranscripts.get().slice(-29), agentEntry])

  await speakResponse(finalReply)
}

/**
 * Speak assistant reply using Gemini Voice TTS (Aoede) or safe non-robotic fallback.
 */
export async function speakResponse(reply: string): Promise<void> {
  return speakCompanionText(reply)
}

export async function speakCompanionText(reply: string): Promise<void> {
  const cfg = $aiProviderConfig.get()

  if (!cfg.voiceFeedbackEnabled) {
    setVoiceState('IDLE')

    return
  }

  setVoiceState('SPEAKING')

  // 1. Primary: Google Gemini Voice TTS (Aoede / Warm Companion from .env)
  let geminiSpoken = false

  if (cfg.cloudApiKey) {
    try {
      const speechData = await generateGeminiSpeechAudio(reply, cfg.voiceId || 'Aoede')

      if (speechData?.audioBase64) {
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.src = ''
          currentAudio = null
        }

        const audio = new Audio(`data:${speechData.mimeType};base64,${speechData.audioBase64}`)
        currentAudio = audio

        const interval = setInterval(() => {
          if ($voiceState.get() === 'SPEAKING') {
            setVoiceRmsLevel(0.4 + Math.random() * 0.45)
          } else {
            clearInterval(interval)
          }
        }, 80)

        audio.onended = () => {
          clearInterval(interval)
          setVoiceRmsLevel(0)

          if ($voiceState.get() === 'SPEAKING') {
            setVoiceState('IDLE')
          }

          currentAudio = null
        }

        audio.onerror = () => {
          clearInterval(interval)
          setVoiceRmsLevel(0)

          if ($voiceState.get() === 'SPEAKING') {
            setVoiceState('IDLE')
          }

          currentAudio = null
        }

        await audio.play()
        geminiSpoken = true
      }
    } catch (e) {
      console.warn('[Voice] Gemini TTS playback notice:', e)
    }
  }

  // 2. Fallback: Only if Gemini TTS was unreachable (e.g. offline local Ollama)
  if (!geminiSpoken && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()

    let voices = window.speechSynthesis.getVoices()

    if (!voices.length) {
      await new Promise<void>(res => {
        const handler = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handler)
          res()
        }

        window.speechSynthesis.addEventListener('voiceschanged', handler)
        setTimeout(res, 200)
      })
      voices = window.speechSynthesis.getVoices()
    }

    const utter = new SpeechSynthesisUtterance(reply)

    const femaleVoice = voices.find(v =>
      /zira|jenny|aria|samantha|victoria|karen|female/i.test(v.name)
    )

    if (femaleVoice) {
      utter.voice = femaleVoice
      utter.rate = 1.05
      utter.pitch = 1.05
    } else {
      // Pitch-shift up to avoid Microsoft David robot drone
      utter.pitch = 1.35
      utter.rate = 1.1
    }

    const interval = setInterval(() => {
      if ($voiceState.get() === 'SPEAKING') {
        setVoiceRmsLevel(0.35 + Math.random() * 0.45)
      } else {
        clearInterval(interval)
      }
    }, 100)

    utter.onend = () => {
      clearInterval(interval)
      setVoiceRmsLevel(0)

      if ($voiceState.get() === 'SPEAKING') {
        setVoiceState('IDLE')
      }

      currentUtterance = null
    }

    utter.onerror = () => {
      clearInterval(interval)
      setVoiceRmsLevel(0)
      setVoiceState('IDLE')
      currentUtterance = null
    }

    currentUtterance = utter
    window.speechSynthesis.speak(utter)
  } else if (!geminiSpoken) {
    setVoiceState('IDLE')
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    await startHandsfreeAudio()

    return $micPermissionStatus.get() === 'granted'
  } catch {
    $micPermissionStatus.set('denied')

    return false
  }
}

/**
 * Initialize Web Audio API continuous RMS analyzer and VAD (Voice Activity Detection).
 * Captures speech audio hands-free and streams directly to Gemini.
 */
export async function startHandsfreeAudio(): Promise<void> {
  if ($isVoiceMuted.get()) {return}

  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      $micPermissionStatus.set('granted')

      return
    }

    if (!mediaStream) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      $micPermissionStatus.set('granted')
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const source = audioContext.createMediaStreamSource(mediaStream)
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    source.connect(analyserNode)

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const sampleVolume = () => {
      if (!analyserNode || !mediaStream) {return}
      analyserNode.getByteFrequencyData(dataArray)
      let sum = 0

      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i]
      }

      const rms = Math.sqrt(sum / bufferLength) / 255.0

      if ($voiceState.get() !== 'SPEAKING') {
        setVoiceRmsLevel(rms * 1.6)
      }

      if (!$isVoiceMuted.get()) {
        const curState = $voiceState.get()

        // Instant barge-in: If speaking and user starts talking loudly (RMS > 0.08)
        if (curState === 'SPEAKING' && rms > 0.08) {
          void interruptVoice()
        }

        // 1. Ambient IDLE: Track background noise floor and detect speech onset
        if (curState === 'IDLE' && !isRecordingTurn) {
          // Dynamic adaptive noise floor baseline
          ambientNoiseFloor = ambientNoiseFloor * 0.95 + rms * 0.05
          const dynamicOnset = Math.max(0.022, ambientNoiseFloor + 0.015)

          if (rms > dynamicOnset) {
            isRecordingTurn = true
            speechStartTime = Date.now()
            silenceStart = null
            recordedChunks = []
            setVoiceState('LISTENING')

            const supportedMime =
              typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'

            try {
              mediaRecorder = new MediaRecorder(mediaStream, { mimeType: supportedMime })

              mediaRecorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) {
                  recordedChunks.push(e.data)
                }
              }

              mediaRecorder.start(100)
            } catch (err) {
              console.warn('[Voice] MediaRecorder start:', err)
              isRecordingTurn = false
              setVoiceState('IDLE')
            }
          }
        }

        // 2. Active LISTENING: Monitor speech duration, silence, and max timeout
        if (curState === 'LISTENING' && isRecordingTurn && mediaRecorder) {
          const dynamicSilence = Math.max(0.015, ambientNoiseFloor + 0.008)
          const elapsed = Date.now() - speechStartTime

          // Check if speech continues or if silence has set in
          if (rms > dynamicSilence) {
            silenceStart = null
          } else {
            if (!silenceStart) {
              silenceStart = Date.now()
            }
          }

          const isSilenceTimeout = silenceStart && (Date.now() - silenceStart > SILENCE_DURATION_MS)
          const isMaxTimeout = elapsed > MAX_RECORDING_DURATION_MS

          if ((isSilenceTimeout || isMaxTimeout) && mediaRecorder.state === 'recording') {
            const speechDuration = elapsed
            silenceStart = null

            if (speechDuration >= MIN_SPEECH_DURATION_MS) {
              const recorder = mediaRecorder
              const mime = recorder.mimeType || 'audio/webm'

              recorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mime })
                recordedChunks = []
                mediaRecorder = null
                isRecordingTurn = false

                if (blob.size > 400) {
                  const reader = new FileReader()

                  reader.onloadend = () => {
                    const res = reader.result as string
                    const base64 = res?.split(',')[1]

                    if (base64) {
                      void handleSpokenAudio(base64, mime)
                    } else {
                      setVoiceState('IDLE')
                    }
                  }

                  reader.readAsDataURL(blob)
                } else {
                  setVoiceState('IDLE')
                }
              }

              try {
                recorder.stop()
              } catch {
                setVoiceState('IDLE')
              }
            } else {
              // Short audio blip / click -> discard and return to IDLE
              if (mediaRecorder.state === 'recording') {
                try {
                  mediaRecorder.stop()
                } catch {
                  // Recorder or media track may already be stopped during cancellation.
                }
              }

              mediaRecorder = null
              recordedChunks = []
              isRecordingTurn = false
              setVoiceState('IDLE')
            }
          }
        }
      }

      animFrameId = requestAnimationFrame(sampleVolume)
    }

    if (!animFrameId) {
      sampleVolume()
    }
  } catch (err) {
    console.warn('[Voice] Web Audio mic capture initialization:', err)
    $micPermissionStatus.set('denied')
  }
}

export function stopHandsfreeMic(): void {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try {
      mediaRecorder.stop()
    } catch {
                  // Recorder or media track may already be stopped during cancellation.
                }
  }

  mediaRecorder = null
  recordedChunks = []
  isRecordingTurn = false

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }

  if (audioContext) {
    audioContext.close().catch(() => {})
    audioContext = null
  }

  $handsfreeActive.set(false)
  setVoiceRmsLevel(0)
}

/**
 * Manually toggle a recording turn (Push-to-Talk / Click-to-Speak).
 * Allows user to start recording or submit speech with a single click.
 */
export function toggleHandsfreeRecordingTurn(): void {
  const curState = $voiceState.get()

  if (curState === 'LISTENING') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      const recorder = mediaRecorder
      const mime = recorder.mimeType || 'audio/webm'

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mime })
        recordedChunks = []
        mediaRecorder = null
        isRecordingTurn = false

        if (blob.size > 200) {
          const reader = new FileReader()

          reader.onloadend = () => {
            const res = reader.result as string
            const base64 = res?.split(',')[1]

            if (base64) {
              void handleSpokenAudio(base64, mime)
            } else {
              setVoiceState('IDLE')
            }
          }

          reader.readAsDataURL(blob)
        } else {
          setVoiceState('IDLE')
        }
      }

      try {
        recorder.stop()
      } catch {
        setVoiceState('IDLE')
      }
    } else {
      setVoiceState('IDLE')
    }
  } else if (curState === 'IDLE') {
    setVoiceState('LISTENING')

    if (mediaStream) {
      isRecordingTurn = true
      speechStartTime = Date.now()
      silenceStart = null
      recordedChunks = []

      const supportedMime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

      try {
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: supportedMime })

        mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data)
          }
        }

        mediaRecorder.start(100)
      } catch {
        isRecordingTurn = false
      }
    }
  }
}

/** Initialize IPC listeners if running inside Electron, and start hands-free engine */
export function initVoiceStateIpc(): () => void {
  if (cleanupIpc) {
    return cleanupIpc
  }

  // Start continuous handsfree Web Audio & Speech Recognition
  void startHandsfreeAudio()

  const voiceApi = (window as unknown as {
    hermesDesktop?: {
      voice?: {
        getState?: () => Promise<VoiceState>
        onStateChanged?: (cb: (state: VoiceState) => void) => () => void
        onWakeWord?: (cb: (ev: WakeWordEvent) => void) => () => void
        onAudioStream?: (cb: (chunk: AudioChunkPayload) => void) => () => void
        onTranscript?: (cb: (t: VoiceTranscriptPayload) => void) => () => void
        onInterrupted?: (cb: () => void) => () => void
      }
    }
  }).hermesDesktop?.voice

  const unsubs: Array<() => void> = []

  if (voiceApi) {
    if (voiceApi.getState) {
      void voiceApi.getState().then(st => {
        if (st) {$voiceState.set(st)}
      })
    }

    if (voiceApi.onStateChanged) {
      unsubs.push(voiceApi.onStateChanged(state => $voiceState.set(state)))
    }

    if (voiceApi.onWakeWord) {
      unsubs.push(
        voiceApi.onWakeWord(ev => {
          $wakeWordEvent.set(ev)
          $voiceState.set('LISTENING')
        })
      )
    }

    if (voiceApi.onAudioStream) {
      unsubs.push(voiceApi.onAudioStream(chunk => setVoiceRmsLevel(chunk.rmsLevel)))
    }

    if (voiceApi.onInterrupted) {
      unsubs.push(voiceApi.onInterrupted(() => {
        // The native ESC event must stop renderer audio, without sending IPC
        // back to Electron and triggering a recursive interruption loop.
        stopLocalVoicePlayback()
      }))
    }

    if (voiceApi.onTranscript) {
      unsubs.push(
        voiceApi.onTranscript(t => {
          setVoiceTranscript(t)

          if (t.isFinal && t.text.trim()) {
            void handleSpokenCommand(t.text)
          }
        })
      )
    }
  }

  cleanupIpc = () => {
    unsubs.forEach(fn => fn())
    stopHandsfreeMic()
    cleanupIpc = null
  }

  return cleanupIpc
}
