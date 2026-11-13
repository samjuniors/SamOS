import { atom } from 'nanostores'

export type AIExecutionMode = 'cloud' | 'offline'
export type CloudProvider = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'openrouter' | 'deepseek' | 'nous'
export type OfflineProvider = 'ollama' | 'llamacpp' | 'lmstudio'
export type ModelRoutingStrategy = 'dynamic_smart' | 'free_only' | 'performance' | 'manual'

export interface AIProviderConfig {
  mode: AIExecutionMode
  cloudProvider: CloudProvider
  cloudApiKey: string
  cloudModel: string
  routingStrategy: ModelRoutingStrategy
  tier1FreeModel: string
  tier2BalancedModel: string
  tier3UrgentModel: string
  geminiLiveModel: string
  geminiTextModel: string
  geminiTtsModel?: string
  pureGeminiLive: boolean
  asrInterruption: boolean
  offlineProvider: OfflineProvider
  offlineEndpoint: string
  offlineModel: string
  handsfreeEnabled: boolean
  wakeWordEnabled: boolean
  wakeWordPhrase: string
  voiceFeedbackEnabled: boolean
  voiceId: string
  loadedFromEnv: boolean
}

const UI_OVERRIDES_KEY = 'hermes_ai_provider_ui_overrides'

// Initial baseline from hardcoded fallback in case .env has not yet loaded
const BASELINE_DEFAULTS: AIProviderConfig = {
  mode: 'cloud',
  cloudProvider: 'gemini',
  cloudApiKey: '',
  cloudModel: 'gemini-flash-latest',
  routingStrategy: 'dynamic_smart',
  tier1FreeModel: 'gemini-3.1-flash-lite',
  tier2BalancedModel: 'Hermes-3-Llama-3.1-70B',
  tier3UrgentModel: 'gemini-3.1-pro',
  geminiLiveModel: 'models/gemini-3.8-live',
  geminiTextModel: 'gemini-3.8-flash',
  geminiTtsModel: 'gemini-3.8-flash-tts',
  pureGeminiLive: true,
  asrInterruption: true,
  offlineProvider: 'ollama',
  offlineEndpoint: 'http://localhost:11434',
  offlineModel: 'llama3.2',
  handsfreeEnabled: true,
  wakeWordEnabled: false,
  wakeWordPhrase: 'hey hermes',
  voiceFeedbackEnabled: true,
  voiceId: 'Aoede',
  loadedFromEnv: false
}

// Atom holding raw environment variables loaded from .env
export const $envConfigMap = atom<Record<string, string>>({})

// Atom holding user manual overrides saved in UI
export const $uiOverrides = atom<Partial<AIProviderConfig>>(loadSavedOverrides())

function loadSavedOverrides(): Partial<AIProviderConfig> {
  try {
    const raw = localStorage.getItem(UI_OVERRIDES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AIProviderConfig>
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      // Scrub keys previously persisted by older SamOS versions.
      if (Object.prototype.hasOwnProperty.call(parsed, 'cloudApiKey')) {
        delete parsed.cloudApiKey
        localStorage.setItem(UI_OVERRIDES_KEY, JSON.stringify(parsed))
      }
      return parsed
    }
  } catch {
    // fallback
  }
  return {}
}

/**
 * Compute the effective config:
 * 1. UI overrides (highest priority if set by user in modal)
 * 2. .env file variables (default source of truth)
 * 3. Built-in defaults
 */
function computeEffectiveConfig(
  envMap: Record<string, string>,
  overrides: Partial<AIProviderConfig>
): AIProviderConfig {
  const geminiKey =
    envMap.GEMINI_API_KEY ||
    envMap.GOOGLE_API_KEY ||
    envMap.VITE_GEMINI_API_KEY ||
    envMap.VITE_GOOGLE_API_KEY ||
    BASELINE_DEFAULTS.cloudApiKey

  const geminiModel =
    envMap.GEMINI_MODEL ||
    envMap.VITE_GEMINI_MODEL ||
    BASELINE_DEFAULTS.cloudModel

  const geminiLiveModel =
    envMap.GEMINI_LIVE_MODEL ||
    envMap.VITE_GEMINI_LIVE_MODEL ||
    BASELINE_DEFAULTS.geminiLiveModel

  const geminiTextModel =
    envMap.GEMINI_TEXT_MODEL ||
    envMap.VITE_GEMINI_TEXT_MODEL ||
    BASELINE_DEFAULTS.geminiTextModel

  const geminiTtsModel =
    envMap.GEMINI_TTS_MODEL ||
    envMap.VITE_GEMINI_TTS_MODEL ||
    BASELINE_DEFAULTS.geminiTtsModel

  const pureLive =
    envMap.SOPHIA_PURE_GEMINI_LIVE !== undefined
      ? envMap.SOPHIA_PURE_GEMINI_LIVE === 'true' || envMap.SOPHIA_PURE_GEMINI_LIVE === '1'
      : BASELINE_DEFAULTS.pureGeminiLive

  const asrInterrupt =
    envMap.SOPHIA_ASR_INTERRUPTION !== undefined
      ? envMap.SOPHIA_ASR_INTERRUPTION === 'true' || envMap.SOPHIA_ASR_INTERRUPTION === '1'
      : BASELINE_DEFAULTS.asrInterruption

  const ollamaUrl =
    envMap.OLLAMA_BASE_URL ||
    envMap.VITE_OLLAMA_BASE_URL ||
    BASELINE_DEFAULTS.offlineEndpoint

  const ollamaModel =
    envMap.OLLAMA_MODEL ||
    envMap.VITE_OLLAMA_MODEL ||
    BASELINE_DEFAULTS.offlineModel

  const rawVoice = envMap.SOFIA_VOICE_ID || envMap.ELEVENLABS_VOICE_ID || 'Aoede'
  const validGeminiVoices = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck']
  const matchedVoice = validGeminiVoices.find(v => v.toLowerCase() === rawVoice.toLowerCase())
  const finalVoice = matchedVoice || 'Aoede'

  const routing = (overrides.routingStrategy || envMap.HERMES_ROUTING_STRATEGY || BASELINE_DEFAULTS.routingStrategy) as ModelRoutingStrategy
  const tier1 = overrides.tier1FreeModel || envMap.HERMES_TIER1_MODEL || BASELINE_DEFAULTS.tier1FreeModel
  const tier2 = overrides.tier2BalancedModel || envMap.HERMES_TIER2_MODEL || BASELINE_DEFAULTS.tier2BalancedModel
  const tier3 = overrides.tier3UrgentModel || envMap.HERMES_TIER3_MODEL || BASELINE_DEFAULTS.tier3UrgentModel

  const envDriven: AIProviderConfig = {
    mode: 'cloud',
    cloudProvider: 'gemini',
    cloudApiKey: geminiKey,
    cloudModel: geminiModel,
    routingStrategy: routing,
    tier1FreeModel: tier1,
    tier2BalancedModel: tier2,
    tier3UrgentModel: tier3,
    geminiLiveModel,
    geminiTextModel,
    geminiTtsModel,
    pureGeminiLive: pureLive,
    asrInterruption: asrInterrupt,
    offlineProvider: 'ollama',
    offlineEndpoint: ollamaUrl,
    offlineModel: ollamaModel,
    handsfreeEnabled: true,
    wakeWordEnabled: false,
    wakeWordPhrase: 'hey hermes',
    voiceFeedbackEnabled: true,
    voiceId: finalVoice,
    loadedFromEnv: Object.keys(envMap).length > 0
  }

  // Merge: overrides take precedence over .env if explicitly defined
  return {
    ...envDriven,
    ...overrides
  }
}

export const $aiProviderConfig = atom<AIProviderConfig>(
  computeEffectiveConfig({}, loadSavedOverrides())
)

/**
 * Fetch .env config from Electron bridge or Vite dev server middleware,
 * then update the reactive nanostore.
 */
export async function refreshEnvConfig(): Promise<Record<string, string>> {
  let envData: Record<string, string> = {}

  // 1. Try Electron preload system bridge
  const electronSystem = (window as unknown as { hermesDesktop?: { system?: { getEnvConfig?: () => Promise<Record<string, string>> } } }).hermesDesktop?.system
  if (electronSystem?.getEnvConfig) {
    try {
      const bridgeEnv = await electronSystem.getEnvConfig()
      if (bridgeEnv && typeof bridgeEnv === 'object') {
        envData = { ...envData, ...bridgeEnv }
      }
    } catch (e) {
      console.debug('[AI Config] Electron getEnvConfig notice:', e)
    }
  }

  // 2. Try Vite dev server /api/env-config endpoint (browser fallback)
  if (Object.keys(envData).length === 0) {
    try {
      const res = await fetch('/api/env-config').catch(() => null)
      if (res && res.ok) {
        const json = await res.json()
        if (json && typeof json === 'object') {
          envData = { ...envData, ...json }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to Vite import.meta.env if available
  try {
    const metaEnv = (import.meta as any).env || {}
    for (const [k, v] of Object.entries(metaEnv)) {
      if (typeof v === 'string') {
        envData[k] = v
        const stripped = k.replace(/^VITE_/, '')
        if (!envData[stripped]) {
          envData[stripped] = v
        }
      }
    }
  } catch {}

  $envConfigMap.set(envData)
  const effective = computeEffectiveConfig(envData, $uiOverrides.get())
  $aiProviderConfig.set(effective)
  return envData
}

// Auto-trigger refresh on evaluation
void refreshEnvConfig()

/**
 * Save manual UI settings overrides.
 */
export function setAiProviderConfig(update: Partial<AIProviderConfig>): void {
  const currentOverrides = $uiOverrides.get()
  const nextOverrides = { ...currentOverrides, ...update }
  $uiOverrides.set(nextOverrides)

  try {
    // Keep secrets in memory for this session; never persist to browser storage.
    const persistableOverrides = { ...nextOverrides }
    delete persistableOverrides.cloudApiKey
    localStorage.setItem(UI_OVERRIDES_KEY, JSON.stringify(persistableOverrides))
  } catch {
    // ignore
  }

  const effective = computeEffectiveConfig($envConfigMap.get(), nextOverrides)
  $aiProviderConfig.set(effective)
}

/**
 * Clear all UI overrides and restore configuration 100% from .env
 */
export function resetAiProviderToEnv(): void {
  try {
    localStorage.removeItem(UI_OVERRIDES_KEY)
  } catch {}
  $uiOverrides.set({})
  const effective = computeEffectiveConfig($envConfigMap.get(), {})
  $aiProviderConfig.set(effective)
}

/**
 * Check if a specific setting was manually overridden in the UI
 */
export function isFieldOverridden(field: keyof AIProviderConfig): boolean {
  const overrides = $uiOverrides.get()
  return overrides[field] !== undefined
}

/**
 * Call Google Generative AI (Gemini) with automatic resilient model failover
 * if a specific preview model hits a 429 quota or 404 deprecation.
 */
async function callGeminiApi(
  apiKey: string,
  preferredModel: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  // Clean model name (remove models/ prefix for URL if present)
  const clean = (m: string) => m.replace(/^models\//, '')

  // Fallover candidate ladder prioritizing models with verified active quota
  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    clean(preferredModel || 'gemini-3.1-flash-lite'),
    'gemini-flash-latest'
  ]
  const uniqueCandidates = [...new Set(candidateModels)]

  let lastError = ''

  for (const model of uniqueCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }

      const errJson = await res.json().catch(() => ({}))
      const errMsg = errJson.error?.message || `HTTP ${res.status}`
      lastError = errMsg

      // If error is 429 quota or 404 model not found, try the next model candidate
      if (res.status === 429 || res.status === 404 || errMsg.includes('Quota exceeded') || errMsg.includes('not found')) {
        console.warn(`[Gemini API] Model ${model} returned ${res.status} (${errMsg}). Falling back to next candidate...`)
        continue
      }

      // Other client error (e.g. invalid API key)
      throw new Error(errMsg)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      lastError = msg
      if (msg.includes('API key not valid') || msg.includes('PERMISSION_DENIED')) {
        throw new Error(msg)
      }
    }
  }

  throw new Error(lastError || 'All Gemini model candidates were exhausted.')
}

/**
 * Generate expressive speech audio using Google Gemini Voice TTS (Aoede / Gemini 3.8 Flash TTS).
 */
export async function generateGeminiSpeechAudio(
  text: string,
  voiceName = 'Aoede'
): Promise<{ audioBase64: string; mimeType: string } | null> {
  const cfg = $aiProviderConfig.get()
  const apiKey = cfg.cloudApiKey
  if (!apiKey) return null

  // Strip code blocks and markdown symbols so the spoken audio sounds natural
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#~]/g, '')
    .trim()

  if (!cleanText) return null

  // Normalize voice name to valid Gemini prebuilt voice
  const validGeminiVoices = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck']
  const matchedVoice = validGeminiVoices.find(v => v.toLowerCase() === (voiceName || '').toLowerCase())
  const finalVoiceName = matchedVoice || 'Aoede'

  const candidateTtsModels = [
    'gemini-3.1-flash-tts-preview',
    'gemini-3.8-flash-lite-tts',
    (cfg.geminiTtsModel || 'gemini-3.8-flash-lite-tts').replace(/^models\//, ''),
    'gemini-3.8-flash-tts'
  ]
  const uniqueModels = [...new Set(candidateTtsModels)]

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: finalVoiceName
                }
              }
            }
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const part = data.candidates?.[0]?.content?.parts?.[0]
        if (part?.inlineData?.data) {
          return {
            audioBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'audio/wav'
          }
        }
      }
    } catch (e) {
      console.warn(`[Gemini TTS] ${model} attempt failed:`, e)
    }
  }

  return null
}

/**
 * Process spoken audio directly using Google Gemini Multimodal Audio.
 * Natively listens to the user's speech audio, transcribes it, and responds.
 */
export async function processAudioQueryWithGemini(
  audioBase64: string,
  mimeType = 'audio/webm'
): Promise<{ userTranscript: string; replyText: string }> {
  const cfg = $aiProviderConfig.get()
  const apiKey = cfg.cloudApiKey

  if (!apiKey) {
    return {
      userTranscript: 'Microphone speech detected',
      replyText: 'Please configure your GEMINI_API_KEY in Settings to enable hands-free voice.'
    }
  }

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    (cfg.cloudModel || 'gemini-3.1-flash-lite').replace(/^models\//, ''),
    'gemini-flash-latest'
  ]
  const uniqueModels = [...new Set(candidateModels)]

  const promptInstruction = `You are Hermes Voice AI OS, an advanced hands-free desktop AI operating system.
Listen carefully to the user's audio input.
Respond strictly in this exact format:
TRANSCRIPT: "<exact user utterance from audio>"
REPLY: <concise, friendly spoken answer or action execution>`

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64
                  }
                },
                {
                  text: promptInstruction
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        let userTranscript = ''
        let replyText = rawText

        const transcriptMatch = rawText.match(/TRANSCRIPT:\s*"([^"]+)"/i) || rawText.match(/TRANSCRIPT:\s*(.+?)(?=\nREPLY:|$)/is)
        if (transcriptMatch) {
          userTranscript = transcriptMatch[1].trim()
        }

        const replyMatch = rawText.match(/REPLY:\s*([\s\S]+)/i)
        if (replyMatch) {
          replyText = replyMatch[1].trim()
        } else if (userTranscript) {
          replyText = rawText.replace(/TRANSCRIPT:\s*"?[^"\n]+"?\s*/i, '').trim()
        }

        if (!userTranscript) {
          userTranscript = 'Spoken voice input'
        }

        return { userTranscript, replyText }
      }
    } catch (err) {
      console.warn(`[Gemini Audio] ${model} attempt failed:`, err)
    }
  }

  return {
    userTranscript: 'Voice query captured',
    replyText: 'I heard you, but could not connect to Gemini service. Please verify your internet connection.'
  }
}

/**
 * Execute an LLM completion using either .env or UI configured provider.
 */
export async function executeAiCompletion(
  prompt: string,
  systemPrompt = 'You are Hermes Voice AI OS, an advanced, friendly hands-free desktop AI operating system. Provide clear, concise spoken-friendly answers.'
): Promise<string> {
  const cfg = $aiProviderConfig.get()

  // 1. Offline Mode (Local Ollama / llama.cpp)
  if (cfg.mode === 'offline') {
    const endpoint = (cfg.offlineEndpoint || 'http://localhost:11434').replace(/\/+$/, '')
    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.offlineModel || 'llama3.2',
          prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
          stream: false
        })
      })
      if (!res.ok) {
        throw new Error(`Local model endpoint returned HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.response || 'No response returned from local model.'
    } catch (err) {
      console.warn('[AI] Local offline endpoint connection failed:', err)
      return `Offline Model Notice: Could not connect to local Ollama at ${endpoint}. Make sure Ollama is running ('ollama run ${cfg.offlineModel}') or switch to Gemini in Settings.`
    }
  }

  // 2. Cloud Mode
  if (!cfg.cloudApiKey) {
    return `Welcome to Hermes Voice AI OS! I am listening hands-free. Please check your GEMINI_API_KEY in .env or open Settings to configure your AI provider.`
  }

  try {
    // 2a. Gemini (Default - Sophia Brain / Gemini Live)
    if (cfg.cloudProvider === 'gemini') {
      return await callGeminiApi(
        cfg.cloudApiKey,
        cfg.cloudModel || 'gemini-3.5-flash',
        prompt,
        systemPrompt
      )
    }

    // 2b. Groq (Ultra-Fast)
    if (cfg.cloudProvider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.cloudApiKey}`
        },
        body: JSON.stringify({
          model: cfg.cloudModel || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `Groq API HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || 'No response from Groq.'
    }

    // 2c. OpenAI
    if (cfg.cloudProvider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.cloudApiKey}`
        },
        body: JSON.stringify({
          model: cfg.cloudModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `OpenAI API HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || 'No response from OpenAI.'
    }

    // 2d. OpenRouter
    if (cfg.cloudProvider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.cloudApiKey}`,
          'HTTP-Referer': 'https://hermes.nousresearch.com',
          'X-Title': 'Hermes Voice AI OS'
        },
        body: JSON.stringify({
          model: cfg.cloudModel || 'meta-llama/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `OpenRouter API HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || 'No response from OpenRouter.'
    }

    // 2e. Nous Research (Hermes 3 Architecture)
    if (cfg.cloudProvider === 'nous') {
      const endpoint = 'https://api.nousresearch.com/v1/chat/completions'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.cloudApiKey}`
        },
        body: JSON.stringify({
          model: cfg.cloudModel || 'Hermes-3-Llama-3.1-70B',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `Nous Research API HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || 'No response from Nous Research model.'
    }

    // 2f. DeepSeek & generic OpenAI compatible
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.cloudApiKey}`
      },
      body: JSON.stringify({
        model: cfg.cloudModel || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error?.message || `Provider API HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'No response from model.'
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return `AI Request Error: ${msg}. Check your .env or Settings modal.`
  }
}

export interface DynamicModelSelection {
  model: string
  provider: CloudProvider | OfflineProvider
  tier: 'tier1_free' | 'tier2_balanced' | 'tier3_urgent'
  reason: string
}

/**
 * Dynamically allocate the best model for a task based on complexity,
 * urgency, and cost-tier strategy (Free First, Escalate for Urgent).
 */
export function selectDynamicModelForTask(options: {
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  taskType?: 'routine' | 'intent_parsing' | 'chat' | 'coding' | 'subagent' | 'architecture' | 'security'
  agentPreference?: string
}): DynamicModelSelection {
  const cfg = $aiProviderConfig.get()
  const strategy = cfg.routingStrategy || 'dynamic_smart'

  // If agent has manual override preference (and strategy isn't forced free_only)
  if (options.agentPreference && options.agentPreference !== 'auto' && strategy !== 'free_only') {
    return {
      model: options.agentPreference,
      provider: detectProviderForModel(options.agentPreference, cfg.cloudProvider),
      tier: 'tier2_balanced',
      reason: `Manual override assigned to agent: ${options.agentPreference}`
    }
  }

  // Strategy 1: Free only
  if (strategy === 'free_only') {
    if (cfg.mode === 'offline') {
      return {
        model: cfg.offlineModel || 'llama3.2',
        provider: cfg.offlineProvider || 'ollama',
        tier: 'tier1_free',
        reason: '100% Free local offline model (zero API spend)'
      }
    }
    return {
      model: cfg.tier1FreeModel || 'gemini-3.1-flash-lite',
      provider: cfg.cloudProvider,
      tier: 'tier1_free',
      reason: '100% Free Tier model selected (cost optimization)'
    }
  }

  // Strategy 2: High Performance (Frontier Only)
  if (strategy === 'performance') {
    return {
      model: cfg.tier3UrgentModel || 'gemini-3.1-pro',
      provider: cfg.cloudProvider,
      tier: 'tier3_urgent',
      reason: 'High performance frontier model selected'
    }
  }

  // Strategy 3: Dynamic Smart Tiering (Free First, Escalate for Urgent)
  // High stakes or urgent priority -> Tier 3 (Frontier)
  if (options.priority === 'urgent' || options.taskType === 'architecture' || options.taskType === 'security') {
    return {
      model: cfg.tier3UrgentModel || 'gemini-3.1-pro',
      provider: cfg.cloudProvider,
      tier: 'tier3_urgent',
      reason: 'Urgent/Critical task: Auto-escalated to Tier 3 Frontier model for maximum reasoning depth'
    }
  }

  // Medium complexity / coding / subagent execution -> Tier 2 (Balanced Workhorse)
  if (options.priority === 'high' || options.taskType === 'coding' || options.taskType === 'subagent') {
    return {
      model: cfg.tier2BalancedModel || 'Hermes-3-Llama-3.1-70B',
      provider: cfg.cloudProvider === 'nous' ? 'nous' : (cfg.cloudProvider === 'gemini' ? 'gemini' : 'groq'),
      tier: 'tier2_balanced',
      reason: 'Standard agentic execution: Allocated to Tier 2 Workhorse model'
    }
  }

  // Routine, status, quick intent classification, low priority -> Tier 1 (Free / Ultra Fast)
  return {
    model: cfg.tier1FreeModel || 'gemini-3.1-flash-lite',
    provider: cfg.cloudProvider,
    tier: 'tier1_free',
    reason: 'Routine/Small task: Routed to Tier 1 Free/Fast model to conserve founder budget'
  }
}

function detectProviderForModel(modelName: string, fallback: CloudProvider): CloudProvider {
  const m = modelName.toLowerCase()
  if (m.includes('hermes') || m.includes('nous')) return 'nous'
  if (m.includes('gemini')) return 'gemini'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3')) return 'openai'
  if (m.includes('claude')) return 'anthropic'
  if (m.includes('deepseek')) return 'deepseek'
  if (m.includes('groq')) return 'groq'
  return fallback
}
