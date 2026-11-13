import { useStore } from '@nanostores/react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Mic,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  X,
  Zap
} from 'lucide-react'
import { useState } from 'react'

import {
  $selfRepairModalOpen,
  $systemHealth,
  closeSelfRepairModal,
  runAutonomousSelfRepair
} from '@/store/self-repair-engine'
import { speakResponse } from '@/store/voice-state'

export function SelfRepairModal() {
  const isOpen = useStore($selfRepairModalOpen)
  const health = useStore($systemHealth)
  const [repairing, setRepairing] = useState(false)

  if (!isOpen) return null

  const handleManualRepair = async () => {
    setRepairing(true)
    try {
      const result = await runAutonomousSelfRepair()
      void speakResponse(result.narration)
    } finally {
      setRepairing(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'audio':
        return <Mic className="size-4 text-[#ff6a00]" />
      case 'ai_brain':
        return <Sparkles className="size-4 text-[#ff7f24]" />
      case 'ipc_bridge':
        return <Monitor className="size-4 text-[#ff6a00]" />
      case 'memory':
        return <Cpu className="size-4 text-[#ff944d]" />
      default:
        return <HardDrive className="size-4 text-[#9aa5b8]" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-repair-title"
    >
      {/* Modal Shell with Industrial 60-30-10 Palette (Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
      <div className="relative w-full max-w-2xl bg-[#0c0e12] border border-[#333a49] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#14171f] border-b border-[#262c37] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center shadow-lg shadow-[#ff6a00]/20">
              <Wrench className="size-4 text-[#ff6a00] animate-pulse" />
            </div>
            <div>
              <h2 id="self-repair-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Autonomous Self-Repair Engine</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/40">
                  Founder Agentic AI
                </span>
              </h2>
              <p className="text-xs text-[#9aa5b8]">
                Continuous autonomous diagnostic sentinel and self-healing subsystem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSelfRepairModal}
            className="p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#262c37] transition-colors cursor-pointer"
            aria-label="Close Self Repair Modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Health Gauge & Diagnostic Overview Banner */}
        <div className="px-6 py-4 bg-[#101318] border-b border-[#262c37] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-[#ff6a00]">
                {health.healthScore}%
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9aa5b8]">
                Health
              </span>
            </div>

            <div className="h-6 w-[1px] bg-[#262c37]" />

            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#ff6a00] animate-ping" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                Status: {health.overallStatus}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={repairing || health.isScanning}
            onClick={handleManualRepair}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6a00] hover:bg-[#ff7f24] disabled:opacity-50 text-black font-bold text-xs shadow-lg shadow-[#ff6a00]/25 transition-all cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${repairing || health.isScanning ? 'animate-spin' : ''}`} />
            <span>{repairing || health.isScanning ? 'Scanning & Healing...' : 'Run Self-Repair Now'}</span>
          </button>
        </div>

        {/* Content Body: Subsystems Diagnostic Cards & Healing Logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Subsystems List */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9aa5b8] mb-3">
              Subsystems Health Diagnostics
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {health.checks.map(check => (
                <div
                  key={check.id}
                  className="flex items-start justify-between p-3.5 rounded-xl bg-[#14171f] border border-[#262c37] hover:border-[#383f4d] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#1b202a] border border-[#2c3341] shrink-0 mt-0.5">
                      {getCategoryIcon(check.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{check.name}</span>
                        {check.status === 'repaired' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#ff6a00]/20 text-[#ff7f24] border border-[#ff6a00]/30 font-bold">
                            AUTO-REPAIRED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9aa5b8] mt-0.5 leading-relaxed">
                        {check.message}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {check.status === 'healthy' || check.status === 'repaired' ? (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="size-3" />
                        <span>Nominal</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <AlertTriangle className="size-3" />
                        <span>Action Required</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Healing & Diagnostic Log Stream */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9aa5b8]">
                Self-Repair Autonomous Log Stream
              </h3>
              <span className="text-[10px] font-mono text-[#ff6a00]">Live Telemetry</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b0e] border border-[#262c37] font-mono text-xs space-y-2 max-h-48 overflow-y-auto">
              {health.logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-[#9aa5b8] shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  {log.level === 'heal' && (
                    <span className="text-[#ff7f24] font-bold shrink-0">[HEALED]</span>
                  )}
                  {log.level === 'success' && (
                    <span className="text-emerald-400 font-bold shrink-0">[OK]</span>
                  )}
                  {log.level === 'warning' && (
                    <span className="text-amber-400 font-bold shrink-0">[WARN]</span>
                  )}
                  {log.level === 'info' && (
                    <span className="text-slate-400 shrink-0">[INFO]</span>
                  )}
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-[#101318] border-t border-[#262c37] flex items-center justify-between text-xs text-[#9aa5b8] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-[#ff6a00]" />
            <span>Voice Command: Say <em>"Hermes, check for issues and fix them"</em> anytime.</span>
          </div>
          <span className="font-mono text-[11px]">Industrial Palette: 60/30/10</span>
        </div>
      </div>
    </div>
  )
}
