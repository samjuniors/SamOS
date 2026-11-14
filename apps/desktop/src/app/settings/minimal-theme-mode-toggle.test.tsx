import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MinimalThemeModeToggle } from './minimal-theme-mode-toggle'

const mocks = vi.hoisted(() => ({ setMode: vi.fn() }))

vi.mock('@/themes/context', () => ({
  useTheme: () => ({ mode: 'system', setMode: mocks.setMode })
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      settings: {
        appearance: { themeTitle: 'Appearance mode' },
        modeOptions: {
          light: { label: 'Light' },
          dark: { label: 'Dark' },
          system: { label: 'System' }
        }
      }
    }
  })
}))

vi.mock('@/lib/haptics', () => ({ triggerHaptic: vi.fn() }))

afterEach(() => {
  cleanup()
  mocks.setMode.mockClear()
})

describe('minimal SamOS appearance mode control', () => {
  it('uses three icon buttons with accessible labels, preserving system mode', () => {
    render(<MinimalThemeModeToggle />)

    expect(screen.getByRole('group', { name: 'Appearance mode' })).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'System' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('changes modes only on explicit interaction', () => {
    render(<MinimalThemeModeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(mocks.setMode).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByRole('button', { name: 'System' }))
    expect(mocks.setMode).toHaveBeenCalledTimes(1)
  })
})
