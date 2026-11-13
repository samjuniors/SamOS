import { useStore } from '@nanostores/react'
import {
  AlertOctagon,
  Calculator,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Folder,
  MousePointer,
  Play,
  Radio,
  ShieldAlert,
  Tv,
  XCircle
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  $cuaActionHistory,
  $cuaActive,
  $cuaElements,
  $cuaLastAction,
  $cuaTargetApp,
  abortCua,
  recordCuaActionStart,
  seedDemoCuaElementsIfEmpty
} from '@/store/cua-state'
import { setActiveWorkspaceTab } from '@/store/workspace-tab-state'
import { speakResponse } from '@/store/voice-state'
import { navigateToUrl } from './browser-workspace'

import type { CuaActionStartPayload, CuaUIElement } from './types'
import './voice-ai-os.css'

interface CuaActionOverlayProps {
  className?: string
  alwaysVisibleInDemo?: boolean
}

export function CuaActionOverlay({
  className = '',
  alwaysVisibleInDemo = false
}: CuaActionOverlayProps) {
  const isCuaActive = useStore($cuaActive)
  const elements = useStore($cuaElements)
  const lastAction = useStore($cuaLastAction)
  const targetApp = useStore($cuaTargetApp)
  const actionHistory = useStore($cuaActionHistory)

  const [showSomTags, setShowSomTags] = useState(true)
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number }>>([])

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

  // Seed demo SOM elements for preview and manual verification
  useEffect(() => {
    seedDemoCuaElementsIfEmpty()
  }, [])

  // Listen to keyboard ESC for emergency killswitch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCuaActive) {
        e.preventDefault()
        void abortCua()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCuaActive])

  // Spawn visual ripple whenever lastAction is a click or coordinate action
  useEffect(() => {
    if (!lastAction) return

    let coords: [number, number] | undefined = lastAction.coordinate
    if (!coords && lastAction.targetBounds) {
      coords = [
        lastAction.targetBounds.x + lastAction.targetBounds.width / 2,
        lastAction.targetBounds.y + lastAction.targetBounds.height / 2
      ]
    }

    if (coords) {
      const newRipple = {
        id: `rip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: coords[0],
        y: coords[1]
      }
      setRipples(prev => [...prev.slice(-4), newRipple])

      const timer = setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 700)

      return () => clearTimeout(timer)
    }
  }, [lastAction])

  // Interactive test triggers
  const handleLaunchNotepad = async () => {
    $cuaTargetApp.set('Notepad')
    $cuaActive.set(true)
    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('notepad.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Notepad.exe'
      })
      setTimeout(async () => {
        if (cuaApi.typeText) {
          await cuaApi.typeText('Hello from Hermes Voice AI OS! Full desktop automation is live.')
          recordCuaActionStart({
            sessionId: 'cua_live',
            action: 'type',
            timestamp: Date.now(),
            text: 'Typed greeting into Notepad'
          })
        }
      }, 850)
    }
    void speakResponse('Opening Notepad on your computer and typing greeting message.')
  }

  const handleLaunchCalc = async () => {
    $cuaTargetApp.set('Calculator')
    $cuaActive.set(true)
    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('calc.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Calc.exe'
      })
    }
    void speakResponse('Opening Calculator on your Windows computer.')
  }

  const handleLaunchExplorer = async () => {
    $cuaTargetApp.set('Explorer')
    $cuaActive.set(true)
    if (cuaApi?.launchApp) {
      await cuaApi.launchApp('explorer.exe')
      recordCuaActionStart({
        sessionId: 'cua_live',
        action: 'launch',
        timestamp: Date.now(),
        text: 'Launched Explorer.exe'
      })
    }
    void speakResponse('Opening Windows File Explorer.')
  }

  const handleOpenYouTube = (popup = false) => {
    navigateToUrl('https://www.youtube.com', popup)
    if (!popup) {
      setActiveWorkspaceTab('browser')
      void speakResponse('Opening YouTube in your browser workspace.')
    } else {
      void speakResponse('Opening YouTube in dedicated popup window.')
    }
  }

  const handleSimulateDragClick = () => {
    const coords: [number, number] = [480, 290]
    recordCuaActionStart({
      sessionId: 'cua_live',
      action: 'click',
      coordinate: coords,
      timestamp: Date.now(),
      text: 'Simulated click and drag at (480, 290)'
    })
    void speakResponse('Simulating mouse click and drag gesture.')
  }

  // If not active and not in preview mode, don't display
  const shouldRender = isCuaActive || alwaysVisibleInDemo

  if (!shouldRender) {
    return null
  }

  // Interactive test trigger for demo/verification
  const handleSimulateClick = (el: CuaUIElement) => {
    const actionPayload: CuaActionStartPayload = {
      sessionId: 'demo_session',
      action: 'click',
      elementId: el.id,
      coordinate: [el.bounds.x + el.bounds.width / 2, el.bounds.y + el.bounds.height / 2],
      targetBounds: el.bounds,
      timestamp: Date.now()
    }
    recordCuaActionStart(actionPayload)
  }

  return (
    <div
      className={`cua-overlay-root pointer-events-none select-none ${className}`}
      role="region"
      aria-label="Computer Use Agent Visual Overlay"
    >
      {/* Top Floating Safety Killswitch & Telemetry Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[10010] pointer-events-auto">
        {/* Safety Killswitch Pill */}
        <button
          type="button"
          onClick={() => void abortCua()}
          className="cua-killswitch-pill flex items-center gap-2 px-4 py-2 rounded-full text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
          title="Emergency Abort (Press ESC)"
          aria-label="Emergency Stop Computer Automation"
        >
          <AlertOctagon className="size-4 animate-pulse fill-white/20" />
          <span>SAFETY STOP (ESC)</span>
        </button>

        {/* CUA Target Application Badge */}
        <div className="voice-os-glass flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs border border-[#ff6a00]/40 text-[#ff7f24] bg-[#14171f]/90">
          <Crosshair className="size-3.5 text-[#ff6a00] animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-medium text-[#9aa5b8]">Target App:</span>
          <span className="font-mono font-bold text-[#ff7f24]">{targetApp}</span>
        </div>

        {/* Set-of-Marks Visibility Toggle */}
        <button
          type="button"
          onClick={() => setShowSomTags(prev => !prev)}
          className="voice-os-glass p-2 rounded-full text-[#9aa5b8] hover:text-white border border-[#262c37] hover:bg-[#1b202a] transition-colors cursor-pointer"
          title={showSomTags ? 'Hide Set-of-Marks tags' : 'Show Set-of-Marks tags'}
          aria-label={showSomTags ? 'Hide Set-of-Marks tags' : 'Show Set-of-Marks tags'}
        >
          {showSomTags ? <Eye className="size-3.5 text-[#ff6a00]" /> : <EyeOff className="size-3.5" />}
        </button>
      </div>

      {/* Quick Action Dock for Live Desktop Tasks & YouTube (60-30-10 Palette) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[10010] pointer-events-auto flex-wrap justify-center max-w-2xl px-2">
        <button
          type="button"
          onClick={handleLaunchNotepad}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6a00]/15 hover:bg-[#ff6a00]/25 text-[#ff7f24] border border-[#ff6a00]/40 text-xs font-semibold backdrop-blur-md shadow-lg shadow-[#ff6a00]/15 transition-all cursor-pointer"
          title="Open Notepad on your PC and type simulated greeting"
        >
          <FileText className="size-3.5 text-[#ff6a00]" />
          <span>📝 Open Notepad & Type</span>
        </button>

        <button
          type="button"
          onClick={handleLaunchCalc}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14171f] hover:bg-[#1b202a] text-slate-200 border border-[#262c37] text-xs font-semibold backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Open Calculator on your PC"
        >
          <Calculator className="size-3.5 text-[#ff7f24]" />
          <span>🧮 Calculator</span>
        </button>

        <button
          type="button"
          onClick={handleLaunchExplorer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14171f] hover:bg-[#1b202a] text-slate-200 border border-[#262c37] text-xs font-semibold backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Open Windows File Explorer"
        >
          <Folder className="size-3.5 text-[#9aa5b8]" />
          <span>📁 Explorer</span>
        </button>

        <button
          type="button"
          onClick={handleSimulateDragClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6a00]/15 hover:bg-[#ff6a00]/25 text-[#ff7f24] border border-[#ff6a00]/40 text-xs font-semibold backdrop-blur-md shadow-lg shadow-[#ff6a00]/15 transition-all cursor-pointer"
          title="Simulate Click & Drag with visual ripple"
        >
          <MousePointer className="size-3.5 text-[#ff6a00]" />
          <span>🖱️ Click & Drag</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenYouTube(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14171f] hover:bg-[#1b202a] text-slate-200 border border-[#262c37] text-xs font-semibold backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Open YouTube in Workspace Browser"
        >
          <Tv className="size-3.5 text-[#ff6a00]" />
          <span>📺 YouTube (Workspace)</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenYouTube(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6a00]/20 hover:bg-[#ff6a00]/30 text-[#ff944d] border border-[#ff6a00]/50 text-xs font-semibold backdrop-blur-md shadow-lg shadow-[#ff6a00]/20 transition-all cursor-pointer"
          title="Open YouTube in Dedicated Popup Window"
        >
          <ExternalLink className="size-3.5 text-[#ff7f24]" />
          <span>🪟 YouTube (Popup)</span>
        </button>
      </div>

      {/* Target Bounding Box of Current In-Flight Action */}
      {lastAction?.targetBounds && (
        <div
          className="cua-target-box"
          style={{
            left: `${lastAction.targetBounds.x}px`,
            top: `${lastAction.targetBounds.y}px`,
            width: `${lastAction.targetBounds.width}px`,
            height: `${lastAction.targetBounds.height}px`
          }}
        >
          <div className="absolute -top-6 left-0 bg-[#ff6a00] text-slate-950 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow">
            ACTION: {lastAction.action.toUpperCase()}
          </div>
        </div>
      )}

      {/* Set-of-Marks (SOM) Badges & Interactive Test Bounds */}
      {showSomTags &&
        elements.map(el => {
          const isTargeted = lastAction?.elementId === el.id
          return (
            <div key={el.id}>
              {/* Optional element boundary outline */}
              <div
                className={`absolute border rounded pointer-events-auto transition-all ${
                  isTargeted
                    ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_12px_rgba(245,158,11,0.5)] z-[10001]'
                    : 'border-amber-500/30 hover:border-amber-400 hover:bg-amber-400/10 z-[9999]'
                }`}
                style={{
                  left: `${el.bounds.x}px`,
                  top: `${el.bounds.y}px`,
                  width: `${el.bounds.width}px`,
                  height: `${el.bounds.height}px`
                }}
                onClick={() => handleSimulateClick(el)}
                title={`SOM #${el.id}: ${el.label} (${el.role}) - Click to simulate target`}
              />

              {/* Numbered Set-of-Marks Tag Badge */}
              <div
                className="cua-som-badge pointer-events-auto cursor-pointer"
                style={{
                  left: `${el.bounds.x + 12}px`,
                  top: `${el.bounds.y + 10}px`
                }}
                onClick={() => handleSimulateClick(el)}
              >
                {el.id}
              </div>
            </div>
          )
        })}

      {/* Dynamic Animated Click Ripples */}
      {ripples.map(rip => (
        <div
          key={rip.id}
          className="cua-click-ripple"
          style={{
            left: `${rip.x}px`,
            top: `${rip.y}px`
          }}
        />
      ))}

      {/* Bottom Live CUA Telemetry Feed (Matte Black & Storm Grey with Safety Orange accents) */}
      <div className="absolute bottom-4 left-6 z-[10010] pointer-events-auto">
        <div className="voice-os-glass px-3.5 py-2 rounded-xl border border-[#262c37] bg-[#101318]/95 max-w-sm shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Radio className="size-3.5 text-[#ff6a00] animate-pulse" />
            <span>CUA Automation Stream</span>
          </div>
          {lastAction ? (
            <p className="text-xs font-mono text-[#ff7f24]">
              » Executing <span className="font-bold underline">{lastAction.action}</span>
              {lastAction.elementId ? ` on SOM #${lastAction.elementId}` : ''}
              {lastAction.text ? ` ("${lastAction.text}")` : ''}
            </p>
          ) : (
            <p className="text-xs text-[#9aa5b8] italic">No action currently executing</p>
          )}

          {actionHistory.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-[#262c37] text-[10px] text-[#9aa5b8] space-y-0.5">
              {actionHistory.slice(0, 2).map(act => (
                <div key={act.id} className="truncate">
                  ✓ {act.action}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

