import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'

import { SettingsView } from '@/app/settings'
import { HapticsProvider } from '@/components/haptics-provider'
import { RootTooltipProvider } from '@/components/ui/tooltip'
import { ProfileI18nProvider } from '@/i18n/profile-provider'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/themes/context'

/**
 * SamOS boots directly into its voice-first shell instead of the classic chat
 * shell. The full Aro-derived Settings view needs the same router and providers
 * used by classic chat, otherwise the visible gear falls back to the legacy
 * voice engine modal even though Settings itself is fully implemented.
 *
 * The memory router intentionally isolates Settings navigation from the
 * voice shell and its global URL/deep links. Its route is reset on each open.
 */
export function VoiceOsSettingsPanel({
  initialTab,
  onClose
}: {
  initialTab: 'overview' | 'providers'
  onClose: () => void
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileI18nProvider>
        <ThemeProvider>
          <HapticsProvider>
            <RootTooltipProvider>
              <MemoryRouter initialEntries={[`/?tab=${initialTab}`]}>
                <SettingsView onClose={onClose} />
              </MemoryRouter>
            </RootTooltipProvider>
          </HapticsProvider>
        </ThemeProvider>
      </ProfileI18nProvider>
    </QueryClientProvider>
  )
}
