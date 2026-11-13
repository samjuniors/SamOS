import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { $cuaActive } from '@/store/cua-state'
import { seedDemoAIEmployeesIfEmpty } from '@/store/subagent-telemetry'
import { $voiceRmsLevel, $voiceState, $voiceTranscript } from '@/store/voice-state'

import { AIEmployeesGrid } from './ai-employees-grid'
import { CuaActionOverlay } from './cua-action-overlay'
import { VoiceAiOsRoot } from './voice-ai-os-root'
import { VoiceHudOrb } from './voice-hud-orb'

describe('VoiceHudOrb Component', () => {
  beforeEach(() => {
    $voiceState.set('IDLE')
    $voiceRmsLevel.set(0)
    $voiceTranscript.set({ text: '', isFinal: false, confidence: 1 })
  })

  it('renders with IDLE status by default', () => {
    render(<VoiceHudOrb isFloating={false} />)
    expect(screen.getByText('IDLE')).toBeDefined()
    expect(screen.getByLabelText(/Voice status: IDLE/i)).toBeDefined()
  })

  it('transitions from IDLE to LISTENING on orb click', () => {
    render(<VoiceHudOrb isFloating={false} />)
    const orb = screen.getByLabelText(/Voice status: IDLE/i)
    fireEvent.click(orb)
    expect($voiceState.get()).toBe('LISTENING')
    expect(screen.getByText('LISTENING')).toBeDefined()
  })

  it('shows live transcription text stream', () => {
    $voiceState.set('LISTENING')
    $voiceTranscript.set({ text: 'Launch full browser audit', isFinal: false, confidence: 0.95 })
    render(<VoiceHudOrb isFloating={false} />)
    expect(screen.getByText('Launch full browser audit')).toBeDefined()
  })

  it('toggles microphone mute when mute button is clicked', () => {
    render(<VoiceHudOrb isFloating={false} />)
    const muteBtn = screen.getByRole('button', { name: /Mute Microphone/i })
    fireEvent.click(muteBtn)
    expect(screen.getByRole('button', { name: /Unmute Microphone/i })).toBeDefined()
  })
})

describe('AIEmployeesGrid Component', () => {
  beforeEach(() => {
    seedDemoAIEmployeesIfEmpty()
  })

  it('renders employee dashboard header and metrics', () => {
    render(<AIEmployeesGrid />)
    expect(screen.getByText('AI Employees Dashboard')).toBeDefined()
    expect(screen.getByText(/Concurrency:/i)).toBeDefined()
  })

  it('renders sample employee cards with sandbox paths', () => {
    render(<AIEmployeesGrid />)
    expect(screen.getByText('sub_architect_01')).toBeDefined()
    expect(screen.getByText(/Audit Windows 11 DWM Mica Acrylic/i)).toBeDefined()
  })

  it('filters employees by status', () => {
    render(<AIEmployeesGrid />)
    const completedTab = screen.getByRole('button', { name: /^completed$/i })
    fireEvent.click(completedTab)
    expect(screen.getByText('sub_data_cleaner_03')).toBeDefined()
    expect(screen.queryByText('sub_architect_01')).toBeNull()
  })

  it('allows opening the steering dialog', () => {
    render(<AIEmployeesGrid />)
    const steerButtons = screen.getAllByRole('button', { name: /Steer/i })
    fireEvent.click(steerButtons[0])
    expect(screen.getByPlaceholderText('Give real-time instructions...')).toBeDefined()
  })
})

describe('CuaActionOverlay Component', () => {
  beforeEach(() => {
    $cuaActive.set(true)
  })

  it('renders safety killswitch and Set-of-Marks tags', () => {
    render(<CuaActionOverlay alwaysVisibleInDemo={true} />)
    expect(screen.getByText('SAFETY STOP (ESC)')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  it('triggers abortCua on emergency stop click', async () => {
    render(<CuaActionOverlay alwaysVisibleInDemo={true} />)
    const killswitch = screen.getByRole('button', { name: /Emergency Stop Computer Automation/i })
    fireEvent.click(killswitch)
    expect($cuaActive.get()).toBe(false)
  })
})

describe('VoiceAiOsRoot Component', () => {
  it('renders top Mica OS titlebar and window mode controls', () => {
    render(<VoiceAiOsRoot initialMode="canvas" />)
    expect(screen.getByText('AI OS')).toBeDefined()
    expect(screen.getByText('16kHz Duplex')).toBeDefined()
    expect(screen.getByRole('button', { name: /Canvas Workspace Mode/i })).toBeDefined()
  })

  it('switches to HUD mode when HUD button is clicked', () => {
    render(<VoiceAiOsRoot initialMode="canvas" />)
    const hudBtn = screen.getByRole('button', { name: /HUD Mode/i })
    fireEvent.click(hudBtn)
    expect(screen.getByText('Voice AI OS Ambient Mode')).toBeDefined()
  })
})

