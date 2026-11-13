import { useStore } from '@nanostores/react'

import { useI18n } from '@/i18n'
import {
  Bell,
  Brain,
  ChevronRight,
  Cpu,
  FolderOpen,
  type IconComponent,
  Info,
  KeyRound,
  Palette,
  PawPrint,
  ShieldLock,
  Wrench
} from '@/lib/icons'
import { $localModelsEnabled } from '@/store/local-models-flag'
import { $petInfo } from '@/store/pet'

import { MinimalThemeModeToggle } from './minimal-theme-mode-toggle'
import { ListRow, SettingsContent, SettingsGroup } from './primitives'
import type { SettingsView } from './types'

interface OverviewDestination {
  description: string
  icon: IconComponent
  label: string
  page?: string
  view: SettingsView
}

function OverviewRows({
  items,
  onOpen
}: {
  items: readonly OverviewDestination[]
  onOpen: (view: SettingsView, page?: string) => void
}) {
  return (
    <>
      {items.map(item => (
        <ListRow
          action={
            <button
              aria-label={`Open ${item.label}`}
              className="inline-flex min-h-8 items-center gap-1 rounded-control px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-(--chrome-action-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              onClick={() => onOpen(item.view, item.page)}
              type="button"
            >
              Open
              <ChevronRight aria-hidden className="size-3.5" />
            </button>
          }
          description={item.description}
          key={item.view + (item.page ?? '')}
          title={
            <span className="inline-flex items-center gap-2">
              <item.icon aria-hidden className="size-4 text-(--ui-text-secondary)" />
              {item.label}
            </span>
          }
        />
      ))}
    </>
  )
}

/**
 * The calm landing view for SamOS Settings: common tasks first, optional
 * capabilities only when known available, and advanced controls out of the
 * main flow. All links navigate to the EXISTING settings pages.
 *
 * No claimed model connection, microphone permission, provider validity or
 * runtime security policy is inferred from local presentation flags.
 */
export function SettingsOverview({ onOpen }: { onOpen: (view: SettingsView, page?: string) => void }) {
  const { t } = useI18n()
  const localModelsAvailable = useStore($localModelsEnabled)
  const pet = useStore($petInfo)

  const daily: OverviewDestination[] = [
    {
      label: t.settings.sections.model,
      description: 'Choose your main coding model and fallback.',
      icon: Cpu,
      view: 'config:model',
      page: 'main'
    },
    {
      label: t.settings.nav.providers,
      description: 'Connect model providers and manage sign-in.',
      icon: KeyRound,
      view: 'providers'
    },
    {
      label: t.settings.sections.workspace,
      description: 'Choose where SamOS works and which projects it discovers.',
      icon: FolderOpen,
      view: 'config:workspace',
      page: 'projects'
    },
    {
      label: t.settings.sections.voice,
      description: 'Configure Sofia microphone, speech and voice providers.',
      icon: Bell,
      view: 'config:voice'
    },
    {
      label: t.settings.sections.safety,
      description: 'Inspect approval preferences and agent boundaries.',
      icon: ShieldLock,
      view: 'config:safety',
      page: 'approvals'
    }
  ]

  const personal: OverviewDestination[] = [
    {
      label: t.settings.sections.appearance,
      description: 'Theme, typography, contrast and motion.',
      icon: Palette,
      view: 'config:appearance',
      page: 'theme'
    },
    {
      label: t.settings.subpages.appearancePet,
      description: pet.enabled
        ? 'Customize your selected pet, voice control and shared SamOS presence.'
        : 'Choose the minimal presence or an optional pet; configure voice separately.',
      icon: PawPrint,
      view: 'config:appearance',
      page: 'pet'
    },
    {
      label: t.settings.nav.notifications,
      description: 'Tune notifications without changing task behavior.',
      icon: Bell,
      view: 'notifications',
      page: 'alerts'
    }
  ]

  const deeper: OverviewDestination[] = [
    {
      label: t.settings.nav.plugins,
      description: 'Configure tools and plugin integrations available to agents.',
      icon: Wrench,
      view: 'plugins'
    },
    {
      label: t.settings.sections.memory,
      description: 'Review persistence, retention and context controls.',
      icon: Brain,
      view: 'config:memory',
      page: 'persistent'
    },
    ...(localModelsAvailable
      ? [
          {
            label: t.settings.nav.providerLocalModels,
            description: 'Configure local models available on this device.',
            icon: Cpu,
            view: 'providers' as SettingsView,
            page: 'local'
          }
        ]
      : []),
    {
      label: t.settings.sections.advanced,
      description: 'Developer controls, diagnostics and optional execution tuning.',
      icon: Wrench,
      view: 'config:advanced',
      page: 'desktop'
    },
    {
      label: t.settings.nav.about,
      description: 'SamOS version, updates and installation controls.',
      icon: Info,
      view: 'about',
      page: 'updates'
    }
  ]

  return (
    <SettingsContent>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-relaxed text-(--ui-text-secondary)">
          Manage your workspace, preferences, and connections.
        </p>
        <MinimalThemeModeToggle />
      </div>

      <SettingsGroup title="Start here">
        <OverviewRows items={daily} onOpen={onOpen} />
      </SettingsGroup>

      <SettingsGroup title="Make SamOS yours">
        <OverviewRows items={personal} onOpen={onOpen} />
      </SettingsGroup>

      <SettingsGroup title="Explore when needed">
        <OverviewRows items={deeper} onOpen={onOpen} />
      </SettingsGroup>
    </SettingsContent>
  )
}
