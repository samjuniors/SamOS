import { atom } from 'nanostores'

export type WorkspaceTabId = 'company' | 'employees' | 'canvas' | 'cua' | 'browser'

export const $activeWorkspaceTab = atom<WorkspaceTabId>('employees')

export function setActiveWorkspaceTab(tab: WorkspaceTabId): void {
  $activeWorkspaceTab.set(tab)
}
