import './voice-ai-os.css'

import { useStore } from '@nanostores/react'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Monitor,
  Sparkles,
  Square,
  Users,
  Volume2,
  X
} from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'

import {
  $isVoiceMuted,
  $recentTranscripts,
  $voiceRmsLevel,
  $voiceState,
  $voiceTranscript,
  interruptVoice,
  requestMicrophonePermission,
  toggleHandsfreeRecordingTurn,
  toggleMicrophoneMute
} from '@/store/voice-state'

import type { VoiceState } from './types'

interface VoiceHudOrbProps {
  className?: string
  isFloating?: boolean
  showControls?: boolean
  onExpandTranscript?: () => void
}

const STATE_CONFIG: Record<
  VoiceState,
  {
    label: string
    color: string
    glowClass: string
    icon: typeof Mic
    description: string
  }
> = {
  IDLE: {
    label: 'IDLE',
    color: 'text-[#9aa5b8]',
    glowClass: 'border-[#333a49] text-slate-300',
    icon: Mic,
    description: 'Ambient standby · Say "Hey Hermes" or press Win+Shift+Space'
  },
  LISTENING: {
    label: 'LISTENING',
    color: 'text-[#ff6a00]',
    glowClass: 'border-[#ff6a00]/70 text-[#ff7f24]',
    icon: Mic,
    description: 'Listening to speech · Full duplex audio active'
  },
  THINKING: {
    label: 'THINKING',
    color: 'text-[#ff7f24]',
    glowClass: 'border-[#ff7f24]/75 text-[#ff944d]',
    icon: Sparkles,
    description: 'Hermes reasoning · Multi-turn prompt execution'
  },
  SPEAKING: {
    label: 'SPEAKING',
    color: 'text-[#ff944d]',
    glowClass: 'border-[#ff944d]/75 text-orange-200',
    icon: Volume2,
    description: 'Streaming TTS response · Speak anytime to barge in'
  },
  CUA_ACTIVE: {
    label: 'CUA ACTIVE',
    color: 'text-[#ff5500]',
    glowClass: 'border-[#ff5500]/85 text-[#ff6a00]',
    icon: Monitor,
    description: 'Computer Use Agent automating desktop window'
  },
  DELEGATING: {
    label: 'DELEGATING',
    color: 'text-[#ff7f24]',
    glowClass: 'border-[#ff7f24]/75 text-[#ff944d]',
    icon: Users,
    description: 'Coordinating concurrent subagents in sandboxes'
  }
}

export function VoiceHudOrb({
  className = '',
  isFloating = true,
  showControls = true,
  onExpandTranscript
}: VoiceHudOrbProps) {
  const voiceState = useStore($voiceState)
  const rmsLevel = useStore($voiceRmsLevel)
  const transcript = useStore($voiceTranscript)
  const isMuted = useStore($isVoiceMuted)
  const recentTranscripts = useStore($recentTranscripts)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const config = STATE_CONFIG[voiceState] || STATE_CONFIG.IDLE
  const StatusIcon = config.icon

  // Audio waveform bars array
  const waveBarsCount = 14

  const barHeights = useMemo(() => {
    // Generate organic-looking waveform bars reacting to rmsLevel
    return Array.from({ length: waveBarsCount }).map((_, i) => {
      if (voiceState === 'IDLE') {return 16}

      if (voiceState === 'THINKING') {
        const timeFactor = Math.sin((i / waveBarsCount) * Math.PI) * 20

        return 14 + timeFactor
      }

      // LISTENING or SPEAKING
      const harmonic = Math.sin((i / (waveBarsCount - 1)) * Math.PI)
      const dynamicBoost = rmsLevel * 56 * (0.4 + harmonic * 0.8)

      return Math.max(8, Math.min(64, Math.round(14 + dynamicBoost)))
    })
  }, [voiceState, rmsLevel])

  // Handle click on the main orb (Tap-to-Talk / Barge-in)
  const handleOrbClick = () => {
    void requestMicrophonePermission()

    if (voiceState === 'SPEAKING' || voiceState === 'THINKING') {
      void interruptVoice()
    } else {
      toggleHandsfreeRecordingTurn()
    }
  }

  // Keyboard accessibility
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOrbClick()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void interruptVoice()
    }
  }

  return (
    <div
      aria-label="Voice AI OS HUD"
      className={`voice-hud-container flex flex-col items-center select-none ${className}`}
      role="region"
    >
      {/* Central Floating Voice HUD Pill */}
      <div
        aria-label={`Voice status: ${config.label}. Click to activate or stop.`}
        className={`voice-os-glass voice-orb-glow relative flex items-center justify-between gap-3.5 px-4 py-2.5 rounded-full transition-all duration-300 ${
          isFloating ? 'cursor-pointer hover:scale-[1.02]' : ''
        }`}
        data-state={voiceState}
        onClick={handleOrbClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
      >
        {/* State Icon with Pulsing Halo */}
        <div className="relative flex items-center justify-center size-9 rounded-full bg-white/5 border border-white/10 shrink-0">
          <StatusIcon className={`size-4.5 ${config.color} transition-colors duration-200`} />
          {voiceState === 'LISTENING' && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none"
            />
          )}
          {voiceState === 'CUA_ACTIVE' && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping pointer-events-none"
            />
          )}
        </div>

        {/* Dynamic Equalizer / Waveform Display */}
        <div
          aria-hidden="true"
          className="flex items-center gap-[3px] h-7 px-1.5 min-w-[76px] justify-center"
        >
          {barHeights.map((h, idx) => (
            <div
              className="waveform-bar w-[3.5px] rounded-full transition-all duration-75"
              key={idx}
              style={{
                height: `${h}px`,
                backgroundColor:
                  voiceState === 'LISTENING'
                    ? '#ff6a00'
                    : voiceState === 'THINKING'
                      ? '#ff7f24'
                      : voiceState === 'SPEAKING'
                        ? '#ff944d'
                        : voiceState === 'CUA_ACTIVE'
                          ? '#ff5500'
                          : voiceState === 'DELEGATING'
                            ? '#ff7f24'
                            : '#475165'
              }}
            />
          ))}
        </div>

        {/* Status Badge & Caption */}
        <div className="flex flex-col pr-1 min-w-[100px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block size-2 rounded-full ${
                voiceState === 'LISTENING'
                  ? 'bg-[#ff6a00] animate-pulse'
                  : voiceState === 'THINKING'
                    ? 'bg-[#ff7f24] animate-pulse'
                    : voiceState === 'SPEAKING'
                      ? 'bg-[#ff944d]'
                      : voiceState === 'CUA_ACTIVE'
                        ? 'bg-[#ff5500] animate-bounce'
                        : voiceState === 'DELEGATING'
                          ? 'bg-[#ff7f24]'
                          : 'bg-[#9aa5b8]'
              }`}
            />
            <span className="text-xs font-semibold tracking-wider uppercase text-white/90">
              {config.label}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
            {voiceState === 'LISTENING' && transcript.text
              ? transcript.text
              : config.description.split('·')[0].trim()}
          </span>
        </div>

        {/* Action Controls */}
        {showControls && (
          <div
            className="flex items-center gap-1 pl-1 border-l border-white/10 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Mic Mute Button */}
            <button
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              aria-pressed={isMuted}
              className={`p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors ${
                isMuted ? 'text-red-400 bg-red-500/20' : ''
              }`}
              onClick={e => {
                e.stopPropagation()
                toggleMicrophoneMute()
              }}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              type="button"
            >
              {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
            </button>

            {/* Transcript Drawer Toggle */}
            <button
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Hide Transcript' : 'Show Live Transcript'}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              onClick={e => {
                e.stopPropagation()
                setIsExpanded(prev => !prev)
                onExpandTranscript?.()
              }}
              title={isExpanded ? 'Hide Transcript' : 'Show Live Transcript'}
              type="button"
            >
              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {/* Barge-in Stop Button if active */}
            {voiceState !== 'IDLE' && (
              <button
                aria-label="Emergency Interrupt"
                className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                onClick={e => {
                  e.stopPropagation()
                  void interruptVoice()
                }}
                title="Emergency Interrupt (ESC)"
                type="button"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Streaming Speech Transcript Band */}
      {isExpanded && (
        <div
          aria-label="Live Voice Transcript"
          className="voice-os-glass mt-2.5 w-full max-w-md p-3.5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 text-left border border-white/10 shadow-2xl"
          role="region"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-cyan-400" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-slate-300">
                Live Speech Transcript
              </span>
            </div>
            <button
              aria-label="Close Transcript Drawer"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              onClick={() => setIsExpanded(false)}
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>

          {/* Current Live Transcription Stream */}
          {transcript.text ? (
            <div className="mb-2 p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 mb-1 font-mono">
                <span className="inline-block size-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Streaming {transcript.isFinal ? '(Final)' : '(Interim)'}</span>
              </div>
              <p className="text-sm font-medium text-slate-100">
                {transcript.text}
                {!transcript.isFinal && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-1">
              {voiceState === 'LISTENING'
                ? 'Speak clearly into your microphone...'
                : 'Waiting for speech input or wake word...'}
            </p>
          )}

          {/* Recent transcript history */}
          {recentTranscripts.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs font-sans">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Recent Utterances
              </span>
              {recentTranscripts.slice(-3).map(item => (
                <div
                  className="p-1.5 rounded bg-white/5 border border-white/5 text-slate-300 text-xs flex justify-between items-baseline"
                  key={item.id}
                >
                  <span className="truncate pr-2">"{item.text}"</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

