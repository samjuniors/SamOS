import { atom } from 'nanostores'

import type {
  CuaActionEndPayload,
  CuaActionStartPayload,
  CuaCapturePayload,
  CuaUIElement
} from '@/app/voice-ai-os/types'

/** Store for active Computer Use Agent (CUA) automation telemetry */
export const $cuaActive = atom<boolean>(false)
export const $cuaElements = atom<CuaUIElement[]>([])
export const $cuaLastAction = atom<CuaActionStartPayload | null>(null)
export const $cuaTargetApp = atom<string>('Windows Desktop')
export const $cuaActionHistory = atom<Array<{ id: string; action: string; timestamp: number; success?: boolean; error?: string }>>([])

/** Abort CUA desktop automation immediately (Safety Killswitch) */
export async function abortCua(): Promise<void> {
  $cuaActive.set(false)
  $cuaLastAction.set(null)

  const cuaApi = (window as unknown as {
    hermesDesktop?: {
      cua?: {
        abort: () => Promise<void>
      }
    }
  }).hermesDesktop?.cua

  if (cuaApi?.abort) {
    try {
      await cuaApi.abort()
    } catch {
      // IPC abort fallback handled gracefully
    }
  }
}

/** Record a new CUA automation action dispatch */
export function recordCuaActionStart(payload: CuaActionStartPayload): void {
  $cuaActive.set(true)
  $cuaLastAction.set(payload)

  const item = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    action: `${payload.action}${payload.elementId ? ` [SOM #${payload.elementId}]` : ''}${payload.text ? ` "${payload.text}"` : ''}`,
    timestamp: payload.timestamp
  }

  $cuaActionHistory.set([item, ...$cuaActionHistory.get().slice(0, 19)])
}

/** Record completion of a CUA action */
export function recordCuaActionEnd(payload: CuaActionEndPayload): void {
  const current = $cuaActionHistory.get()

  if (current.length > 0) {
    const updated = [...current]
    updated[0] = {
      ...updated[0],
      success: payload.success,
      error: payload.error
    }
    $cuaActionHistory.set(updated)
  }
}

/** Update Set-of-Marks tags from capture */
export function setCuaCapture(capture: CuaCapturePayload): void {
  $cuaTargetApp.set(capture.targetApp || 'Windows Desktop')
  $cuaElements.set(capture.elements || [])
}

/** Initialize IPC listeners */
export function initCuaIpc(): () => void {
  const cuaApi = (window as unknown as {
    hermesDesktop?: {
      cua?: {
        onCapture?: (cb: (payload: CuaCapturePayload) => void) => () => void
        onActionStart?: (cb: (payload: CuaActionStartPayload) => void) => () => void
        onActionEnd?: (cb: (payload: CuaActionEndPayload) => void) => () => void
        onAborted?: (cb: () => void) => () => void
      }
    }
  }).hermesDesktop?.cua

  if (!cuaApi) {
    return () => {}
  }

  const unsubs: Array<() => void> = []

  if (cuaApi.onCapture) {
    unsubs.push(cuaApi.onCapture(cap => setCuaCapture(cap)))
  }

  if (cuaApi.onActionStart) {
    unsubs.push(cuaApi.onActionStart(act => recordCuaActionStart(act)))
  }

  if (cuaApi.onActionEnd) {
    unsubs.push(cuaApi.onActionEnd(end => recordCuaActionEnd(end)))
  }

  if (cuaApi.onAborted) {
    unsubs.push(cuaApi.onAborted(() => {
      // ESC / native abort must update the renderer immediately, including
      // any delayed Sofia typing decisions waiting on $cuaActive.
      $cuaActive.set(false)
      $cuaLastAction.set(null)
    }))
  }

  return () => {
    unsubs.forEach(f => f())
  }
}

/** Seed demo Set-of-Marks elements for visual verification and testing */
export function seedDemoCuaElementsIfEmpty(): void {
  if ($cuaElements.get().length > 0) {return}

  const sampleMarks: CuaUIElement[] = [
    {
      id: 1,
      label: 'Start Menu Button',
      role: 'button',
      bounds: { x: 24, y: 16, width: 44, height: 44 }
    },
    {
      id: 2,
      label: 'Search Prompt Input',
      role: 'textbox',
      bounds: { x: 80, y: 18, width: 320, height: 40 }
    },
    {
      id: 3,
      label: 'Terminal Execute Button',
      role: 'button',
      bounds: { x: 420, y: 18, width: 140, height: 40 }
    },
    {
      id: 4,
      label: 'AI Employee Card #1',
      role: 'region',
      bounds: { x: 60, y: 180, width: 380, height: 220 }
    },
    {
      id: 5,
      label: 'Steer Subagent Action',
      role: 'button',
      bounds: { x: 340, y: 350, width: 80, height: 32 }
    }
  ]

  $cuaElements.set(sampleMarks)
}

