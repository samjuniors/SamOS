import { useStore } from '@nanostores/react'
import {
  ArrowRight,
  Bot,
  Building,
  CheckCircle2,
  DollarSign,
  Rocket,
  ShieldAlert,
  Sparkles,
  Users,
  X
} from 'lucide-react'
import { useState } from 'react'

import {
  $companyProfile,
  $isOnboardingOpen,
  closeCompanyOnboarding,
  createCompanyTask,
  saveCompanyProfile
} from '@/store/company-state'
import { speakCompanionText } from '@/store/voice-state'

export function CompanyOnboardingModal() {
  const isOpen = useStore($isOnboardingOpen)
  const profile = useStore($companyProfile)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [companyName, setCompanyName] = useState(profile.name || '')
  const [industry, setIndustry] = useState(profile.industry || '')
  const [mission, setMission] = useState(profile.mission || '')
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthlyBudgetUsd.toString())
  const [approvalThreshold, setApprovalThreshold] = useState(profile.approvalThresholdUsd.toString())
  const [firstGoal, setFirstGoal] = useState('Deploy autonomous agentic MVP and generate initial customer pipeline')

  if (!isOpen) return null

  const handleFinish = () => {
    saveCompanyProfile({
      name: companyName.trim() || 'Autonomous Systems Corp',
      industry: industry.trim() || 'AI & Cloud Infrastructure',
      mission: mission.trim() || 'Automate enterprise workflows with high-agency voice AI.',
      monthlyBudgetUsd: parseFloat(monthlyBudget) || 1000,
      approvalThresholdUsd: parseFloat(approvalThreshold) || 25,
      onboardingCompleted: true
    })

    // Seed first strategic task
    createCompanyTask(
      `Executive Goal: ${firstGoal.trim()}`,
      'Initiate multi-agent execution pipeline to research, build, and verify deliverables.',
      'agent_hermes_ceo',
      'urgent',
      'Strategic Launch',
      parseFloat(approvalThreshold) || 25
    )

    closeCompanyOnboarding()

    // Hermes Aoede voice confirmation
    void speakCompanionText(
      `Welcome Founder. ${companyName || 'Your company'} is officially registered on Paperclip. I have established our executive roster and queued our first milestone.`
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Company Onboarding & Autonomous Setup"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#101318] border border-[#262c37] shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262c37] bg-[#0c0e12]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00]">
              <Building className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Paperclip Autonomous Company Setup
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6a00]/20 text-[#ff7f24] font-mono border border-[#ff6a00]/40">
                  Step {step} of 4
                </span>
              </h2>
              <p className="text-xs text-[#9aa5b8]">
                Establish your digital enterprise, hire AI agents, and enforce budget guardrails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCompanyOnboarding}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262c37] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step Progress Bar (Industrial Orange) */}
        <div className="w-full bg-[#1b202a] h-1.5">
          <div
            className="bg-gradient-to-r from-[#ff6a00] to-[#ff944d] h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Rocket className="size-4 text-[#ff6a00]" />
                <span>1. Company Identity & Strategic Thesis</span>
              </div>
              <p className="text-xs text-[#9aa5b8] leading-relaxed">
                Provide the high-level identity for your digital organization. Hermes and the executive team will anchor all decision-making to this thesis.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Company / Project Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. SamJuniors Autonomous OS"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#ff6a00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Industry / Domain</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Autonomous AI, Developer Tools, B2B SaaS"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#ff6a00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Company Mission & Value Proposition</label>
                  <textarea
                    rows={3}
                    value={mission}
                    onChange={e => setMission(e.target.value)}
                    placeholder="e.g. Build resilient software and high-agency agents that automate digital operations."
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#ff6a00] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="size-4 text-[#ff6a00]" />
                <span>2. Executive Roster & Chain of Command</span>
              </div>
              <p className="text-xs text-[#9aa5b8]">
                Paperclip provisions five specialized executive AI employees based on proven agent personas:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#262c37] flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-[#ff6a00]/20 border border-[#ff6a00]/50 flex items-center justify-center text-[#ff6a00] font-bold text-xs shrink-0">
                    H
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Hermes
                      <span className="text-[10px] text-[#ff7f24] font-mono">(CEO)</span>
                    </div>
                    <div className="text-[11px] text-[#9aa5b8]">Strategic Direction, P&L, Unblocking</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#262c37] flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/50 flex items-center justify-center text-[#38bdf8] font-bold text-xs shrink-0">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Atlas
                      <span className="text-[10px] text-[#38bdf8] font-mono">(CTO)</span>
                    </div>
                    <div className="text-[11px] text-[#9aa5b8]">Architecture, Engineering, CUA Vision</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#262c37] flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/50 flex items-center justify-center text-[#a855f7] font-bold text-xs shrink-0">
                    N
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Nova
                      <span className="text-[10px] text-[#a855f7] font-mono">(Intel)</span>
                    </div>
                    <div className="text-[11px] text-[#9aa5b8]">Market Research, Docs Audit, Synthesis</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#262c37] flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-[#f43f5e]/20 border border-[#f43f5e]/50 flex items-center justify-center text-[#f43f5e] font-bold text-xs shrink-0">
                    E
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Echo
                      <span className="text-[10px] text-[#f43f5e] font-mono">(Product)</span>
                    </div>
                    <div className="text-[11px] text-[#9aa5b8]">60-30-10 Design System, Ergonomics, Copy</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <DollarSign className="size-4 text-[#ff6a00]" />
                <span>3. Financial Treasury & Approval Limits</span>
              </div>
              <p className="text-xs text-[#9aa5b8]">
                Enforce hard spend limits. In accordance with Paperclip governance, any task exceeding your approval threshold pauses in the Approval Gate.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Monthly Spending Ceiling (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={e => setMonthlyBudget(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white focus:outline-none focus:border-[#ff6a00]"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Agents automatically sleep if cumulative monthly spend exceeds 95%.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Founder Review & Approval Gate Threshold (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">$</span>
                    <input
                      type="number"
                      value={approvalThreshold}
                      onChange={e => setApprovalThreshold(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white focus:outline-none focus:border-[#ff6a00]"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Any change exceeding this amount requires your explicit one-click sign-off.
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="size-4 text-[#ff6a00]" />
                <span>4. First Milestone & Immediate Task Generation</span>
              </div>
              <p className="text-xs text-[#9aa5b8]">
                Define your first high-leverage objective. Hermes will immediately check out this task and trigger the first autonomous heartbeat.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary Launch Goal</label>
                  <textarea
                    rows={3}
                    value={firstGoal}
                    onChange={e => setFirstGoal(e.target.value)}
                    placeholder="e.g. Conduct market analysis and build prototype for autonomous voice agent"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e12] border border-[#262c37] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#ff6a00] resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#1b202a] border border-[#262c37] text-xs text-slate-300 flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-[#ff6a00] shrink-0" />
                  <span>
                    Ready to deploy with <strong>Hermes CEO</strong> orchestrating 4 specialized subagents.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#262c37] bg-[#0c0e12]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              className="px-4 py-2 rounded-xl bg-[#1b202a] hover:bg-[#262c37] text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as 2 | 3 | 4)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff6a00] hover:bg-[#ff7f24] text-xs font-semibold text-black transition-colors cursor-pointer shadow-md shadow-[#ff6a00]/25"
            >
              <span>Next Step</span>
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6a00] to-[#ff944d] hover:brightness-110 text-xs font-bold text-black transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/30"
            >
              <Sparkles className="size-3.5" />
              <span>Launch Autonomous Company</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
