import type { OverlayNavGroup } from '../overlays/overlay-split-layout'

interface CredentialNavigationCopy {
  accountsAndProviders: string
  credentials: string
}

/** Group destinations only after their route-specific links have been resolved.
 *  Environment credentials and the encrypted vault retain their own handlers. */
export function groupCredentialNavigation(
  groups: OverlayNavGroup[],
  copy: CredentialNavigationCopy
): OverlayNavGroup[] {
  const vault = groups.find(group => group.id === 'vault')

  return groups
    .filter(group => group.id !== 'vault' || !groups.some(candidate => candidate.id === 'keys'))
    .map(group => {
      if (group.id === 'providers') {
        return { ...group, label: copy.accountsAndProviders }
      }

      if (group.id === 'keys' && vault) {
        return {
          ...group,
          active: group.active || vault.active,
          label: copy.credentials,
          children: [
            ...(group.children ?? []),
            ...(vault.children ?? [vault]).map(child =>
              child.id === 'vault:credentials' ? { ...child, label: vault.label } : child
            )
          ]
        }
      }

      return group
    })
}
