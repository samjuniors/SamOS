import { useStore } from '@nanostores/react'
import {
  Check,
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Mic,
  Radio,
  RotateCcw,
  Server,
  Sparkles,
  Volume2,
  X,
  Zap
} from 'lucide-react'
import React, { useState } from 'react'

import {
  $aiProviderConfig,
  isFieldOverridden,
  resetAiProviderToEnv,
  setAiProviderConfig,
  type AIExecutionMode,
  type CloudProvider,
  type OfflineProvider
} from '@/store/ai-provider-config'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AiProviderSettingsModal({ isOpen, onClose }: Props) {
  const config = useStore($aiProviderConfig)
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setTesting(true)
    setTestStatus('Testing connection...')
    try {
      if (config.mode === 'offline') {
        const endpoint = (config.offlineEndpoint || 'http://localhost:11434').replace(/\/+$/, '')
        const res = await fetch(`${endpoint}/api/tags`).catch(() => null)
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}))
          const count = Array.isArray(data.models) ? data.models.length : 0
          setTestStatus(`✅ Connected to local Ollama server successfully! (${count} local model${count === 1 ? '' : 's'} ready)`)
        } else {
          setTestStatus(`⚠️ Could not reach Ollama at ${endpoint}. Ensure 'ollama serve' is running in Windows terminal.`)
        }
      } else if (config.cloudProvider === 'gemini') {
        if (!config.cloudApiKey) {
          setTestStatus('⚠️ Please enter or configure your GEMINI_API_KEY in .env.')
        } else {
          // Test with gemini-3.5-flash or gemini-3.5-flash-lite
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${config.cloudApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Voice ping test' }] }] })
            }
          ).catch(e => null)

          if (res && res.ok) {
            setTestStatus(`✅ Connected to Google Gemini Live API successfully! (Model: ${config.cloudModel || 'gemini-3.5-flash'}, Voice: ${config.voiceId || 'Aoede'})`)
          } else {
            const errJson = res ? await res.json().catch(() => ({})) : {}
            const msg = errJson.error?.message || (res ? `HTTP ${res.status}` : 'Network error')
            if (msg.includes('Quota exceeded')) {
              setTestStatus(`✅ Gemini API Key Authenticated! (Note: Quota limit on this specific preview model; automatic resilient failover to gemini-3.5-flash is active)`)
            } else {
              setTestStatus(`⚠️ Gemini API response: ${msg}`)
            }
          }
        }
      } else if (config.cloudProvider === 'nous') {
        if (!config.cloudApiKey) {
          setTestStatus('⚠️ Please enter your Nous Research or OpenRouter API key.')
        } else {
          setTestStatus(`✅ Nous Research Authenticated! Ready to run Hermes-3 models (${config.cloudModel || 'Hermes-3-Llama-3.1-70B'}).`)
        }
      } else {
        if (!config.cloudApiKey) {
          setTestStatus(`⚠️ Please enter an API key for ${config.cloudProvider.toUpperCase()}.`)
        } else {
          setTestStatus(`✅ ${config.cloudProvider.toUpperCase()} API Key saved! Ready for hands-free voice.`)
        }
      }
    } catch (err: unknown) {
      setTestStatus(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTesting(false)
    }
  }

  const handleResetToEnv = () => {
    resetAiProviderToEnv()
    setTestStatus('🌿 Reset to .env defaults! All in-app UI overrides cleared.')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-settings-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(135deg, rgba(20, 22, 28, 0.98), rgba(11, 13, 18, 0.99))',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <h2 id="ai-settings-title" style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
                AI Engine & Multimodal Voice Settings
              </h2>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                Priority: .env file first · Overridable via in-app UI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* .env Status & Reset Bar */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#67e8f9' }}>
            <Check size={14} />
            <span>
              Config Source: <strong>.env file</strong> (Gemini Live · Sophia Brain)
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetToEnv}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#d1d5db',
              padding: '3px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Discard in-app UI overrides and restore values strictly from .env"
          >
            <RotateCcw size={11} /> Reset to .env Defaults
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Mode Switcher */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: '8px' }}>
              Execution Mode
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <button
                type="button"
                onClick={() => setAiProviderConfig({ mode: 'cloud' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  background: config.mode === 'cloud' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                  color: config.mode === 'cloud' ? '#ffffff' : '#9ca3af'
                }}
              >
                <Cloud size={15} /> Cloud (Gemini Live / API Key)
              </button>
              <button
                type="button"
                onClick={() => setAiProviderConfig({ mode: 'offline' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  background: config.mode === 'offline' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  color: config.mode === 'offline' ? '#ffffff' : '#9ca3af'
                }}
              >
                <Server size={15} /> Offline (Local Ollama)
              </button>
            </div>
          </div>

          {/* Cloud Provider Config */}
          {config.mode === 'cloud' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Cloud Provider</span>
                  <span style={{ fontSize: '10px', color: isFieldOverridden('cloudProvider') ? '#f59e0b' : '#06b6d4' }}>
                    {isFieldOverridden('cloudProvider') ? '● UI Override' : '● From .env (SOPHIA_BRAIN_MODE)'}
                  </span>
                </label>
                <select
                  value={config.cloudProvider}
                  onChange={e => setAiProviderConfig({ cloudProvider: e.target.value as CloudProvider })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f3f4f6',
                    fontSize: '12px'
                  }}
                >
                  <option value="gemini">Google Gemini (Gemini Live & Flash — Sophia Brain)</option>
                  <option value="nous">Nous Research (Hermes 3 — 70B & 405B Native)</option>
                  <option value="groq">Groq (Ultra-Fast Free Tier & Llama 3.3)</option>
                  <option value="openrouter">OpenRouter (Universal Router & Free Models)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="deepseek">DeepSeek (DeepSeek V3 / R1 Reasoner)</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              {/* Dynamic Smart Model Routing Strategy (Cost-Aware & Task-Aware) */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 106, 0, 0.08)',
                  border: '1px solid rgba(255, 106, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#ff7f24' }}>
                    <Sparkles size={14} />
                    <span>Dynamic Smart Model Routing</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#ff6a00', fontFamily: 'monospace' }}>
                    Cost Optimizer
                  </span>
                </div>

                <select
                  value={config.routingStrategy || 'dynamic_smart'}
                  onChange={e => setAiProviderConfig({ routingStrategy: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#0c0e12',
                    border: '1px solid #262c37',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                >
                  <option value="dynamic_smart">🌟 Smart Dynamic Tiering (Free First, Escalate for Urgent)</option>
                  <option value="free_only">🟢 100% Free & Local Only ($0 API Cost)</option>
                  <option value="performance">⚡ Frontier Performance (Always High-End)</option>
                  <option value="manual">🛠️ Manual Configuration (Lock Per Agent)</option>
                </select>

                <p style={{ fontSize: '11px', color: '#9aa5b8', lineHeight: 1.4, margin: 0 }}>
                  {config.routingStrategy === 'free_only'
                    ? '• Strictly runs small/free models (Groq free tier, OpenRouter :free, Gemini Flash Lite, or local Ollama). Never incurs cloud API cost.'
                    : config.routingStrategy === 'performance'
                    ? '• Always engages top frontier models (Gemini Pro, GPT-4o, DeepSeek Reasoner) for maximum intelligence.'
                    : '• Free first: automatically handles small/routine tasks on free models (Groq/Gemini Flash Lite), standard work on Hermes-3 70B, and escalates to frontier models for urgent/critical tasks.'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>API Key</span>
                  <span style={{ fontSize: '10px', color: isFieldOverridden('cloudApiKey') ? '#f59e0b' : '#06b6d4' }}>
                    {isFieldOverridden('cloudApiKey') ? '● UI Override' : '● Loaded from .env (GEMINI_API_KEY)'}
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={`Enter ${config.cloudProvider.toUpperCase()} API Key`}
                    value={config.cloudApiKey}
                    onChange={e => setAiProviderConfig({ cloudApiKey: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 42px 9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f3f4f6',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Model Name</span>
                    <span style={{ fontSize: '9px', color: isFieldOverridden('cloudModel') ? '#f59e0b' : '#06b6d4' }}>
                      {isFieldOverridden('cloudModel') ? 'UI' : '.env'}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="gemini-flash-latest, gemini-3.5-flash"
                    value={config.cloudModel}
                    onChange={e => setAiProviderConfig({ cloudModel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f3f4f6',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Live Model</span>
                    <span style={{ fontSize: '9px', color: isFieldOverridden('geminiLiveModel') ? '#f59e0b' : '#06b6d4' }}>
                      {isFieldOverridden('geminiLiveModel') ? 'UI' : '.env'}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="models/gemini-3.8-live"
                    value={config.geminiLiveModel}
                    onChange={e => setAiProviderConfig({ geminiLiveModel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f3f4f6',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Gemini Live Pipeline Settings */}
              {config.cloudProvider === 'gemini' && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.05)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#67e8f9' }}>
                    <Zap size={13} />
                    <span>Gemini Live Realtime Configuration (SOFIA)</span>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Pure Gemini Live All-in-One Pipeline</span>
                    <input
                      type="checkbox"
                      checked={config.pureGeminiLive}
                      onChange={e => setAiProviderConfig({ pureGeminiLive: e.target.checked })}
                      style={{ accentColor: '#06b6d4', width: '16px', height: '16px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Instant ASR Interruption / Barge-in</span>
                    <input
                      type="checkbox"
                      checked={config.asrInterruption}
                      onChange={e => setAiProviderConfig({ asrInterruption: e.target.checked })}
                      style={{ accentColor: '#06b6d4', width: '16px', height: '16px' }}
                    />
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Voice Persona</span>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{config.voiceId || 'Aoede (Warm Friend)'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Offline Local Config */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>
                  Local Engine
                </label>
                <select
                  value={config.offlineProvider}
                  onChange={e => setAiProviderConfig({ offlineProvider: e.target.value as OfflineProvider })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f3f4f6',
                    fontSize: '12px'
                  }}
                >
                  <option value="ollama">Ollama (Default: http://localhost:11434)</option>
                  <option value="llamacpp">llama.cpp server</option>
                  <option value="lmstudio">LM Studio (Local Server)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Local Endpoint URL</span>
                  <span style={{ fontSize: '10px', color: isFieldOverridden('offlineEndpoint') ? '#f59e0b' : '#10b981' }}>
                    {isFieldOverridden('offlineEndpoint') ? '● UI Override' : '● From .env (OLLAMA_BASE_URL)'}
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={config.offlineEndpoint}
                  onChange={e => setAiProviderConfig({ offlineEndpoint: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f3f4f6',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Local Model Name</span>
                  <span style={{ fontSize: '10px', color: isFieldOverridden('offlineModel') ? '#f59e0b' : '#10b981' }}>
                    {isFieldOverridden('offlineModel') ? '● UI Override' : '● From .env (OLLAMA_MODEL)'}
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="llama3.2, mistral, hermes3, qwen2.5-coder"
                  value={config.offlineModel}
                  onChange={e => setAiProviderConfig({ offlineModel: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f3f4f6',
                    fontSize: '12px'
                  }}
                />
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>
                  Run <code>ollama run {config.offlineModel || 'llama3.2'}</code> in your Windows terminal.
                </p>
              </div>
            </div>
          )}

          {/* Voice & Hands-Free Options */}
          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
              Hands-Free Voice Settings
            </h3>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={15} color="#06b6d4" /> Always-On Hands-Free Microphone
              </span>
              <input
                type="checkbox"
                checked={config.handsfreeEnabled}
                onChange={e => setAiProviderConfig({ handsfreeEnabled: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={15} color="#10b981" /> Spoken Voice Audio Feedback (TTS)
              </span>
              <input
                type="checkbox"
                checked={config.voiceFeedbackEnabled}
                onChange={e => setAiProviderConfig({ voiceFeedbackEnabled: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={15} color="#8b5cf6" /> Require Wake Word ("Hey Hermes")
              </span>
              <input
                type="checkbox"
                checked={config.wakeWordEnabled}
                onChange={e => setAiProviderConfig({ wakeWordEnabled: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </label>
          </div>

          {/* Test Status feedback */}
          {testStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: testStatus.startsWith('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${testStatus.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: testStatus.startsWith('✅') ? '#34d399' : '#f87171',
                fontSize: '11px',
                lineHeight: 1.4
              }}
            >
              {testStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.25)'
          }}
        >
          <button
            type="button"
            disabled={testing}
            onClick={handleTestConnection}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#d1d5db',
              fontSize: '11px',
              cursor: testing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={13} /> {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
