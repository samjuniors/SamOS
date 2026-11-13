/**
 * Voice AI OS Bridge — Windows Startup, System Tray & Voice State FSM Bridge.
 *
 * Implements the ambient Voice-First AI Operating System Shell foundation
 * per apps/desktop/VOICE_AI_OS_SPEC.md §4.1, §4.4, and §7:
 * - IPC event routing for hermes:voice:* and hermes:system:*
 * - Windows login autostart integration via app.setLoginItemSettings
 * - Dynamic system tray icon reflecting VoiceState (IDLE, LISTENING, THINKING, SPEAKING, CUA_ACTIVE, DELEGATING)
 * - Global shortcut registration: Win+Shift+Space (HUD summon/toggle) with Ctrl+Alt+H fallback, and Escape (emergency stop/barge-in)
 */

import fs from 'fs'
import path from 'path'

import type { app, BrowserWindow, globalShortcut, ipcMain} from 'electron';
import { Menu, nativeImage, type NativeImage, Tray } from 'electron'

import { resolveCuaLaunchTarget } from './cua-launch-policy'

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {continue}
    const eqIdx = trimmed.indexOf('=')

    if (eqIdx === -1) {continue}
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()

    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }

    result[key] = val
  }

  return result
}

export function readEnvConfig(): Record<string, string> {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/desktop/.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.env.USERPROFILE || '', '.hermes/.env')
  ]

  const config: Record<string, string> = {}

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = parseEnvFile(fs.readFileSync(candidate, 'utf-8'))
        Object.assign(config, parsed)
      }
    } catch {}
  }

  return config
}

// ── Types from VOICE_AI_OS_SPEC.md §4.1 & §4.4 ─────────────────────────────

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

export interface VoiceAiOsBridgeDeps {
  app: typeof app
  ipcMain: typeof ipcMain
  globalShortcut: typeof globalShortcut
  BrowserWindow: typeof BrowserWindow
  getMainWindow: () => BrowserWindow | null
  openHudWindow: (sessionId: string | null, profile: string | null) => void
  closeHudWindow: () => void
  getHudWindow: () => BrowserWindow | null
  restoreMainWindow: () => void
  openCuaOverlayWindow?: () => BrowserWindow | null
  closeCuaOverlayWindow?: () => void
  log?: (message: string) => void
}

export interface VoiceAiOsBridgeController {
  getVoiceState: () => VoiceState
  setVoiceState: (state: VoiceState) => void
  getWindowMode: () => ShellWindowMode
  setWindowMode: (mode: ShellWindowMode) => void
  broadcastWakeWord: (event: WakeWordEvent) => void
  broadcastAudioChunk: (chunk: AudioChunkPayload) => void
  broadcastTranscript: (transcript: VoiceTranscriptPayload) => void
  dispose: () => void
}

// ── State Palette & Tray Rendering ──────────────────────────────────────────

export const VOICE_STATE_COLORS: Record<VoiceState, { fill: string; ring: string; label: string }> = {
  IDLE: { fill: '#9CA3AF', ring: '#4B5563', label: 'Idle' },
  LISTENING: { fill: '#06B6D4', ring: '#0891B2', label: 'Listening' },
  THINKING: { fill: '#8B5CF6', ring: '#7C3AED', label: 'Thinking' },
  SPEAKING: { fill: '#10B981', ring: '#059669', label: 'Speaking' },
  CUA_ACTIVE: { fill: '#F59E0B', ring: '#D97706', label: 'Desktop Automation Active' },
  DELEGATING: { fill: '#3B82F6', ring: '#2563EB', label: 'Delegating to Subagents' }
}

export function createVoiceStateTrayIcon(state: VoiceState, isDark = true): NativeImage {
  const spec = VOICE_STATE_COLORS[state] || VOICE_STATE_COLORS.IDLE
  const size = process.platform === 'win32' ? 24 : 18
  const cx = size / 2
  const cy = size / 2
  const rDot = Math.round(size * 0.32)
  const rRing = rDot + 2
  const rBg = cx - 1

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${rBg}" fill="${isDark ? '#18181B' : '#FFFFFF'}" fill-opacity="0.85" />
    <circle cx="${cx}" cy="${cy}" r="${rRing}" fill="${spec.ring}" fill-opacity="0.4" />
    <circle cx="${cx}" cy="${cy}" r="${rDot}" fill="${spec.fill}" />
  </svg>`

  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

  return nativeImage.createFromDataURL(dataUrl)
}

// ── Autostart Implementation ───────────────────────────────────────────────

const WINDOWS_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

function queryStartupStatus(appApi: typeof app): StartupStatus {
  try {
    const settings = appApi.getLoginItemSettings({
      path: process.execPath,
      args: ['--boot-startup']
    })

    return {
      enabled: settings.openAtLogin,
      openAsHidden: Boolean((settings as unknown as Record<string, unknown>).openAsHidden),
      registryKey: WINDOWS_RUN_KEY
    }
  } catch {
    return {
      enabled: false,
      openAsHidden: false,
      registryKey: WINDOWS_RUN_KEY
    }
  }
}

function updateStartupStatus(appApi: typeof app, enable: boolean): StartupStatus {
  try {
    const opts: Record<string, unknown> = {
      openAtLogin: Boolean(enable),
      path: process.execPath,
      args: ['--boot-startup']
    }

    if (process.platform === 'darwin') {
      opts.openAsHidden = true
    }

    appApi.setLoginItemSettings(opts as Parameters<typeof appApi.setLoginItemSettings>[0])
  } catch {
    // best-effort login item write
  }

  return queryStartupStatus(appApi)
}

// ── Controller Factory ──────────────────────────────────────────────────────

export function createVoiceAiOsBridge(deps: VoiceAiOsBridgeDeps): VoiceAiOsBridgeController {
  const log = deps.log ?? ((msg: string) => console.log(msg))
  let currentVoiceState: VoiceState = 'IDLE'
  let currentWindowMode: ShellWindowMode = 'canvas'
  let isMicrophoneMuted = false
  let tray: Tray | null = null
  let escapeShortcutActive = false
  let summonShortcutRegistered: string | null = null

  // 1. Broadcast Helper
  const broadcastToAllWindows = (channel: string, payload: unknown) => {
    for (const win of deps.BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  // 2. Emergency Interrupt (Barge-in / Stop)
  const handleInterrupt = async () => {
    log('[voice-bridge] Emergency interrupt triggered (barge-in / ESC)')
    broadcastToAllWindows('hermes:voice:interrupt', { timestamp: Date.now() })

    // Cancel active playback or automation, return to IDLE or LISTENING
    if (currentVoiceState === 'SPEAKING' || currentVoiceState === 'CUA_ACTIVE' || currentVoiceState === 'THINKING') {
      applyVoiceState('IDLE')
    }
  }

  // 3. Dynamic Global Shortcut Management
  const updateEmergencyEscape = (state: VoiceState) => {
    const needsEscape = state === 'SPEAKING' || state === 'CUA_ACTIVE' || state === 'THINKING' || state === 'LISTENING'

    if (needsEscape && !escapeShortcutActive) {
      try {
        escapeShortcutActive = deps.globalShortcut.register('Escape', () => {
          void handleInterrupt()
        })

        if (escapeShortcutActive) {
          log('[voice-bridge] Registered Escape emergency stop shortcut')
        }
      } catch (err) {
        escapeShortcutActive = false
        log(`[voice-bridge] Could not register Escape shortcut: ${err}`)
      }
    } else if (!needsEscape && escapeShortcutActive) {
      try {
        deps.globalShortcut.unregister('Escape')
      } catch {
        // ignore
      }

      escapeShortcutActive = false
      log('[voice-bridge] Unregistered Escape emergency stop shortcut')
    }
  }

  const toggleHudSummon = () => {
    const hud = deps.getHudWindow()

    if (hud && !hud.isDestroyed() && hud.isVisible()) {
      deps.closeHudWindow()
      setWindowMode('canvas')
    } else {
      deps.openHudWindow(null, null)
      setWindowMode('hud')
    }
  }

  const registerSummonShortcut = () => {
    // Primary: Win+Shift+Space (Super+Shift+Space in Electron)
    // Fallbacks: Control+Alt+H, CommandOrControl+Shift+Space
    const candidates = ['Super+Shift+Space', 'Control+Alt+H', 'CommandOrControl+Shift+Space']

    for (const chord of candidates) {
      try {
        if (!deps.globalShortcut.isRegistered(chord)) {
          const registered = deps.globalShortcut.register(chord, toggleHudSummon)

          if (registered) {
            summonShortcutRegistered = chord
            log(`[voice-bridge] Registered HUD summon shortcut on ${chord}`)

            return
          }
        }
      } catch (err) {
        log(`[voice-bridge] Failed attempting chord ${chord}: ${err}`)
      }
    }

    log('[voice-bridge] Warning: Could not bind global HUD summon shortcut')
  }

  // 4. System Tray Construction
  const updateTrayMenu = () => {
    if (!tray || tray.isDestroyed()) {
      return
    }

    const stateLabel = VOICE_STATE_COLORS[currentVoiceState]?.label ?? 'Idle'

    const contextMenu = Menu.buildFromTemplate([
      { label: `Hermes Voice: ${stateLabel}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Quick Summon HUD',
        accelerator: summonShortcutRegistered ?? 'Win+Shift+Space',
        click: () => {
          deps.openHudWindow(null, null)
          setWindowMode('hud')
        }
      },
      {
        label: 'Open Workspace Canvas',
        click: () => {
          deps.closeHudWindow()
          deps.restoreMainWindow()
          setWindowMode('canvas')
        }
      },
      { type: 'separator' },
      {
        label: isMicrophoneMuted ? 'Unmute Microphone' : 'Mute Microphone',
        click: () => {
          isMicrophoneMuted = !isMicrophoneMuted
          broadcastToAllWindows('hermes:voice:muteChanged', { muted: isMicrophoneMuted })
          updateTrayMenu()
        }
      },
      {
        label: 'Settings',
        click: () => {
          deps.restoreMainWindow()
          const mainWin = deps.getMainWindow()

          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('hermes:navigate:settings')
          }
        }
      },
      {
        label: 'Check for Updates...',
        click: () => {
          deps.restoreMainWindow()
          const mainWin = deps.getMainWindow()

          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('hermes:open-updates')
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit Hermes',
        click: () => {
          deps.app.quit()
        }
      }
    ])

    tray.setContextMenu(contextMenu)
    tray.setToolTip(`Hermes — ${stateLabel}`)
  }

  const syncTrayIcon = () => {
    if (!tray || tray.isDestroyed()) {
      return
    }

    const icon = createVoiceStateTrayIcon(currentVoiceState)
    tray.setImage(icon)
    updateTrayMenu()
  }

  const initTray = () => {
    try {
      const initialIcon = createVoiceStateTrayIcon(currentVoiceState)
      tray = new Tray(initialIcon)
      tray.setToolTip(`Hermes — ${VOICE_STATE_COLORS[currentVoiceState].label}`)

      tray.on('click', () => {
        // Toggle HUD on single-click
        toggleHudSummon()
      })

      tray.on('double-click', () => {
        // Open Canvas on double-click
        deps.closeHudWindow()
        deps.restoreMainWindow()
        setWindowMode('canvas')
      })

      updateTrayMenu()
    } catch (err) {
      log(`[voice-bridge] Tray creation deferred or unavailable: ${err}`)
    }
  }

  // 5. State Setters
  const applyVoiceState = (state: VoiceState) => {
    if (currentVoiceState === state) {
      return
    }

    currentVoiceState = state
    syncTrayIcon()
    updateEmergencyEscape(state)
    broadcastToAllWindows('hermes:voice:stateChanged', state)
    log(`[voice-bridge] Voice state changed: ${state}`)
  }

  const setWindowMode = (mode: ShellWindowMode) => {
    if (currentWindowMode === mode) {
      return
    }

    currentWindowMode = mode

    switch (mode) {
      case 'hud':
        deps.openHudWindow(null, null)
        const mainWin = deps.getMainWindow()

        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.hide()
        }

        break

      case 'canvas':
        deps.closeHudWindow()
        deps.restoreMainWindow()

        break

      case 'cua_overlay':
        deps.openCuaOverlayWindow?.()

        break

      case 'minimized':
        deps.closeHudWindow()
        const win = deps.getMainWindow()

        if (win && !win.isDestroyed()) {
          win.hide()
        }

        break
    }

    broadcastToAllWindows('hermes:system:windowModeChanged', mode)
    log(`[voice-bridge] Shell window mode changed: ${mode}`)
  }

  // 6. IPC Handlers Registration
  deps.ipcMain.handle('hermes:voice:getState', async () => currentVoiceState)

  deps.ipcMain.handle('hermes:voice:setState', async (_event, nextState: VoiceState) => {
    applyVoiceState(nextState)
  })

  deps.ipcMain.handle('hermes:voice:playTtsChunk', async (_event, chunk: VoiceTtsChunkPayload) => {
    broadcastToAllWindows('hermes:voice:ttsChunk', chunk)
    applyVoiceState('SPEAKING')
  })

  deps.ipcMain.handle('hermes:voice:interrupt', async () => {
    await handleInterrupt()
  })

  deps.ipcMain.handle('hermes:system:getStartupStatus', async () => queryStartupStatus(deps.app))

  deps.ipcMain.handle('hermes:system:toggleStartup', async (_event, enable: boolean) =>
    updateStartupStatus(deps.app, enable)
  )

  deps.ipcMain.handle('hermes:system:setWindowMode', async (_event, mode: ShellWindowMode) => {
    setWindowMode(mode)
  })

  deps.ipcMain.handle('hermes:system:getWindowMode', async () => currentWindowMode)

  deps.ipcMain.handle('hermes:system:getEnvConfig', async () => readEnvConfig())

  deps.ipcMain.handle('hermes:system:setTrayState', async (_event, state: TrayState) => {
    if (state.voiceState) {
      applyVoiceState(state.voiceState)
    }

    if (tray && !tray.isDestroyed() && state.tooltip) {
      tray.setToolTip(state.tooltip)
    }
  })

  // ── 7. Computer Use Agent (CUA) Desktop Automation IPC ───────────────────────
  deps.ipcMain.handle('hermes:cua:launchApp', async (_event, appName: string, args: string[] = []) => {
    log(`[voice-bridge] CUA launchApp: ${appName}`)

    try {
      const targetBinary = resolveCuaLaunchTarget(appName, args)
      if (!targetBinary) {
        return { success: false, error: 'This app or its arguments are not approved for voice computer-use.' }
      }

      const { spawn } = await import('node:child_process')
      const child = spawn(targetBinary, [], {
        detached: true,
        stdio: 'ignore',
        shell: false
      })
      // Node emits spawn errors asynchronously. Do not claim success until
      // the OS has accepted the exact allowlisted executable.
      await new Promise<void>((resolve, reject) => {
        child.once('spawn', () => resolve())
        child.once('error', reject)
      })
      child.unref()

      applyVoiceState('CUA_ACTIVE')
      broadcastToAllWindows('hermes:cua:actionStart', {
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: `Launched ${targetBinary}`
      })

      return { success: true, pid: child.pid }
    } catch (err: any) {
      log(`[voice-bridge] CUA launchApp error: ${err}`)

      return { success: false, error: err.message }
    }
  })

  deps.ipcMain.handle('hermes:cua:typeText', async (_event, text: string) => {
    log(`[voice-bridge] CUA typeText: ${text}`)

    try {
      const { exec } = await import('child_process')
      // Escape for PowerShell WScript.Shell SendKeys
      const safeText = text.replace(/([+^%~{}()\[\]\\])/g, '{$1}')
      const psScript = `$wshell = New-Object -ComObject wscript.shell; Start-Sleep -Milliseconds 300; $wshell.SendKeys('${safeText}')`
      exec(`powershell -NoProfile -Command "${psScript}"`)

      applyVoiceState('CUA_ACTIVE')
      broadcastToAllWindows('hermes:cua:actionStart', {
        sessionId: 'cua_live',
        action: 'type',
        timestamp: Date.now(),
        text: `Typed "${text}"`
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  deps.ipcMain.handle('hermes:cua:openBrowserPopup', async (_event, url: string) => {
    log(`[voice-bridge] CUA openBrowserPopup: ${url}`)

    try {
      const popup = new deps.BrowserWindow({
        width: 1240,
        height: 820,
        title: 'Hermes Workspace Browser',
        backgroundColor: '#0d1017',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      popup.loadURL(url)

      broadcastToAllWindows('hermes:cua:actionStart', {
        sessionId: 'cua_live',
        action: 'openUrl',
        timestamp: Date.now(),
        text: `Opened browser popup: ${url}`
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  deps.ipcMain.handle('hermes:cua:openSystemUrl', async (_event, url: string) => {
    try {
      const { shell } = await import('electron')
      await shell.openExternal(url)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  deps.ipcMain.handle('hermes:cua:abort', async () => {
    log('[voice-bridge] CUA abort requested')
    broadcastToAllWindows('hermes:cua:aborted', { timestamp: Date.now() })
    applyVoiceState('IDLE')
  })

  // Initialize Tray and Shortcuts
  initTray()
  registerSummonShortcut()

  return {
    getVoiceState: () => currentVoiceState,
    setVoiceState: applyVoiceState,
    getWindowMode: () => currentWindowMode,
    setWindowMode,
    broadcastWakeWord: (event: WakeWordEvent) => {
      broadcastToAllWindows('hermes:voice:wakeWord', event)
      applyVoiceState('LISTENING')
    },
    broadcastAudioChunk: (chunk: AudioChunkPayload) => {
      broadcastToAllWindows('hermes:voice:audioStream', chunk)
    },
    broadcastTranscript: (transcript: VoiceTranscriptPayload) => {
      broadcastToAllWindows('hermes:voice:transcript', transcript)

      if (transcript.isFinal) {
        applyVoiceState('THINKING')
      }
    },
    dispose: () => {
      if (summonShortcutRegistered) {
        try {
          deps.globalShortcut.unregister(summonShortcutRegistered)
        } catch {
          // ignore
        }

        summonShortcutRegistered = null
      }

      if (escapeShortcutActive) {
        try {
          deps.globalShortcut.unregister('Escape')
        } catch {
          // ignore
        }

        escapeShortcutActive = false
      }

      if (tray && !tray.isDestroyed()) {
        tray.destroy()
        tray = null
      }
    }
  }
}
