import { describe, expect, it } from 'vitest'

import { $aiProviderConfig, setAiProviderConfig } from '@/store/ai-provider-config'
import { $companyProfile, saveCompanyProfile } from '@/store/company-state'

describe('SamOS session-only secrets', () => {
  it('never persists cloud provider credentials to browser storage', () => {
    setAiProviderConfig({ cloudApiKey: 'cloud-test-secret' })
    expect($aiProviderConfig.get().cloudApiKey).toBe('cloud-test-secret')
    expect(localStorage.getItem('hermes_ai_provider_ui_overrides')).not.toContain('cloud-test-secret')
  })

  it('never persists Paperclip credentials to company browser storage', () => {
    saveCompanyProfile({ paperclipApiKey: 'paperclip-test-secret' })
    expect($companyProfile.get().paperclipApiKey).toBe('paperclip-test-secret')
    expect(localStorage.getItem('hermes_company_profile')).not.toContain('paperclip-test-secret')
  })
})
