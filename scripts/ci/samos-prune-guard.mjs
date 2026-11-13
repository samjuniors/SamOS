// Lightweight static invariants for the SamOS Windows-focused fork.
// Runs without dependencies and never executes any model or agent code.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const at = relative => join(root, relative)

for (const path of [
  'LICENSE',
  'apps/desktop/electron/main.ts',
  'apps/desktop/electron/preload.ts',
  'apps/desktop/src/main.tsx',
  'apps/desktop/src/app/voice-ai-os/voice-ai-os-root.tsx',
  'agent/conversation_loop.py',
  'tui_gateway',
  'apps/shared'
]) {
  if (!existsSync(at(path))) throw new Error(`SamOS required runtime source missing: ${path}`)
}
for (const path of ['website', 'evals', '.github/workflows/deploy-site.yml']) {
  if (existsSync(at(path))) throw new Error(`Retired source unexpectedly restored: ${path}`)
}
const provider = readFileSync(at('apps/desktop/src/store/ai-provider-config.ts'), 'utf8')
if (/cloudApiKey:\s*'[^']{10,}'/.test(provider)) {
  throw new Error('Cloud API key must not be hard-coded in SamOS renderer defaults')
}
const company = readFileSync(at('apps/desktop/src/store/company-state.ts'), 'utf8')
if (!company.includes('const DEFAULT_TASKS: CompanyTask[] = []')) {
  throw new Error('Fresh SamOS must not seed fake completed company tasks')
}
const health = readFileSync(at('apps/desktop/src/store/self-repair-engine.ts'), 'utf8')
if (!health.includes("overallStatus: 'NOT_CHECKED'")) {
  throw new Error('SamOS self-repair status must begin unverified')
}
const heartbeat = company.split('export async function runCompanyHeartbeat()')[1]?.split('export function addHeartbeatLog')[0] || ''
if (/task\.status\s*=|task\.spentUsd\s*=/.test(heartbeat)) {
  throw new Error('Local heartbeat must not claim real agent completion or spending')
}
console.log('SamOS lightweight source and safety invariants: PASS')
