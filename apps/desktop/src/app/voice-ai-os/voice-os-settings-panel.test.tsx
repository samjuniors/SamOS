import { fireEvent, render, screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { VoiceOsSettingsPanel } from './voice-os-settings-panel'

vi.mock('@/app/settings', () => ({
  SettingsView: ({ onClose }: { onClose: () => void }) => {
    const route = useLocation()

    return (
      <section>
        <output data-testid="settings-route">{route.search}</output>
        <button onClick={onClose} type="button">Close Settings</button>
      </section>
    )
  }
}))

vi.mock('@/i18n/profile-provider', () => ({
  ProfileI18nProvider: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock('@/themes/context', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock('@/components/haptics-provider', () => ({
  HapticsProvider: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock('@/components/ui/tooltip', () => ({
  RootTooltipProvider: ({ children }: { children: React.ReactNode }) => children
}))

describe('Voice OS Aro Settings bridge', () => {
  it.each(['overview', 'providers'] as const)('opens the full Settings page at %s', initialTab => {
    const close = vi.fn()

    render(<VoiceOsSettingsPanel initialTab={initialTab} onClose={close} />)

    expect(screen.getByTestId('settings-route').textContent).toBe(`?tab=${initialTab}`)

    fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))
    expect(close).toHaveBeenCalledOnce()
  })
})
