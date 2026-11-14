import { describe, expect, it, vi } from 'vitest'

import { Settings2 } from '@/lib/icons'

import type { OverlayNavGroup } from '../overlays/overlay-split-layout'

import { contextualSettingsNavigation } from './contextual-navigation'

function group(id: string, active = false): OverlayNavGroup {
  return {
    id,
    active,
    icon: Settings2,
    label: id,
    onSelect: vi.fn(),
    children: [{ id: id + ':child', active, label: 'Child', icon: Settings2, onSelect: vi.fn() }]
  }
}

describe('contextual Settings navigation', () => {
  it('shows everyday categories and only one More entry for dormant specialist sections', () => {
    const groups = [group('overview', true), group('config:model'), group('config:browser'), group('gateway'), group('about')]
    const openAll = vi.fn()
    const result = contextualSettingsNavigation(groups, false, 'More settings', openAll)

    expect(result.map(entry => entry.id)).toEqual(['overview', 'config:model', 'about', 'more-settings'])
    const more = result.at(-1)
    expect(more?.children?.map(child => child.label)).toEqual(['config:browser', 'gateway'])
    more?.children?.[0].onSelect()
    expect(groups[2].onSelect).toHaveBeenCalledOnce()
    more?.onSelect()
    expect(openAll).toHaveBeenCalledOnce()
  })

  it('keeps active deep-link targets and their subpages usable in compact mode', () => {
    const groups = [group('overview'), group('config:model'), group('config:voice', true), group('config:advanced')]
    const result = contextualSettingsNavigation(groups, false, 'More settings', vi.fn())

    expect(result.find(entry => entry.id === 'config:voice')?.children?.[0].id).toBe('config:voice:child')
    expect(result.at(-1)?.children?.map(child => child.label)).toEqual(['config:advanced'])
  })

  it('does not change the original tree or route handlers in expanded mode', () => {
    const groups = [group('overview'), group('gateway'), group('config:browser')]
    const result = contextualSettingsNavigation(groups, true, 'More settings', vi.fn())
    expect(result).toEqual(groups)
    expect(result).not.toBe(groups)
    expect(groups.map(g => g.id)).toEqual(['overview', 'gateway', 'config:browser'])
  })

  it('does not invent a More category if there are no optional sections', () => {
    expect(contextualSettingsNavigation([group('overview')], false, 'More settings', vi.fn()).map(g => g.id))
      .toEqual(['overview'])
  })
})
