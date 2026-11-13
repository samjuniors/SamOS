import { Settings2 } from '@/lib/icons'

import type { OverlayNavGroup } from '../overlays/overlay-split-layout'

/**
 * Preserve the original route/navigation model and all of its deep links.
 * Only progressive disclosure changes: dormant specialist sections are
 * collapsed into one discoverable "More settings" entry.
 *
 * Selected specialist sections remain visible with their real subpages so a
 * search hit or saved link can always be used, even in compact mode.
 */
export const ESSENTIAL_SETTINGS_GROUPS = new Set([
  'overview',
  'config:model',
  'config:appearance',
  'config:voice',
  'config:workspace',
  'config:safety',
  'config:memory',
  'providers',
  'plugins',
  'keys',
  'notifications',
  'about'
])

export function contextualSettingsNavigation(
  groups: readonly OverlayNavGroup[],
  expanded: boolean,
  moreLabel: string,
  onExpand: () => void
): OverlayNavGroup[] {
  if (expanded) {
    return [...groups]
  }

  const primary = groups.filter(group => ESSENTIAL_SETTINGS_GROUPS.has(group.id) || group.active)
  const optional = groups.filter(group => !ESSENTIAL_SETTINGS_GROUPS.has(group.id) && !group.active)

  if (optional.length === 0) {
    return primary
  }

  return [
    ...primary,
    {
      id: 'more-settings',
      label: moreLabel,
      active: false,
      icon: Settings2,
      gapBefore: true,
      onSelect: onExpand,
      children: optional.map(group => ({
        id: `more:${group.id}`,
        label: group.label,
        icon: group.icon,
        active: false,
        onSelect: group.onSelect
      }))
    }
  ]
}
