/** Compact theme control for SamOS Settings. Retains light, dark, and OS auto. */

import { useI18n } from '@/i18n'
import { triggerHaptic } from '@/lib/haptics'
import { Monitor, Moon, Sun } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { type ThemeMode, useTheme } from '@/themes/context'

const modes = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor }
] as const satisfies ReadonlyArray<{ id: ThemeMode; icon: typeof Sun }>

export function MinimalThemeModeToggle() {
  const { t } = useI18n()
  const { mode, setMode } = useTheme()

  return (
    <div
      aria-label={t.settings.appearance.themeTitle}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-[6px] border border-(--ui-stroke-secondary) bg-(--ui-bg-card) p-1"
      role="group"
    >
      {modes.map(option => {
        const Icon = option.icon
        const selected = mode === option.id
        const name = t.settings.modeOptions[option.id].label

        return (
          <button
            aria-label={name}
            aria-pressed={selected}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'text-(--ui-text-secondary) hover:bg-(--ui-control-hover-background) hover:text-foreground'
            )}
            key={option.id}
            onClick={() => {
              if (!selected) {
                setMode(option.id)
                triggerHaptic('crisp')
              }
            }}
            title={name}
            type="button"
          >
            <Icon aria-hidden className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
