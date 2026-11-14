import { describe, expect, it, vi } from 'vitest'

import { TRANSLATIONS } from '@/i18n'
import { KeyRound } from '@/lib/icons'

import type { OverlayNavGroup } from '../overlays/overlay-split-layout'

import { groupCredentialNavigation } from './credential-navigation'

const copy = {
  accountsAndProviders: TRANSLATIONS.en.settings.nav.providers,
  credentials: TRANSLATIONS.en.settings.nav.apiKeys
}
const link = (id: string, active = false) => ({ id, active, icon: KeyRound, label: id, onSelect: vi.fn() })

describe('credential navigation ownership', () => {
  it('preserves every destination handler and the active vault child inside Credentials', () => {
    const groups: OverlayNavGroup[] = [
      { ...link('providers'), children: [link('pview:accounts'), link('pview:keys'), link('pview:custom-endpoints')] },
      { ...link('vault', true), children: [link('vault:credentials'), link('vault:sources', true)] },
      { ...link('keys'), children: [link('kview:tools'), link('kview:settings')] },
      link('config:safety')
    ]

    const result = groupCredentialNavigation(groups, copy)
    const credentials = result.find(group => group.id === 'keys')!

    expect(result.filter(group => group.active)).toEqual([credentials])
    expect(credentials.children?.filter(child => child.active).map(child => child.id)).toEqual(['vault:sources'])
    expect(result.find(group => group.id === 'providers')?.children).toBe(groups[0].children)
    expect(result.find(group => group.id === 'config:safety')).toBe(groups[3])

    const originalLinks = groups.flatMap(group => group.children ?? [group])
    const regroupedLinks = result.flatMap(group => group.children ?? [group])
    expect(regroupedLinks.map(child => child.id).sort()).toEqual(originalLinks.map(child => child.id).sort())

    for (const original of originalLinks) {
      const destination = regroupedLinks.find(child => child.id === original.id)!
      expect(destination.onSelect).toBe(original.onSelect)
      destination.onSelect()
      expect(original.onSelect).toHaveBeenCalledOnce()
    }
  })

  it('localizes the groups in every bundled language without losing a standalone vault', () => {
    for (const locale of Object.values(TRANSLATIONS)) {
      const providers = link('providers')
      const vault = link('vault', true)
      const result = groupCredentialNavigation([providers, vault], {
        accountsAndProviders: locale.settings.nav.providers,
        credentials: locale.settings.nav.apiKeys
      })
      expect(result.find(group => group.id === 'providers')?.label).toBe(locale.settings.nav.providers)
      expect(locale.settings.nav.providers).toBeTruthy()
      expect(locale.settings.nav.apiKeys).toBeTruthy()
      expect(result).toContain(vault)
    }
  })
})
