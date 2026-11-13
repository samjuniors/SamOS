/**
 * Voice computer-use app launch policy.
 *
 * Only simple, user-visible Windows apps may launch from a spoken decision.
 * Arbitrary commands, file paths, shell interpreters, and command-line
 * arguments require a separate, explicitly approved computer-use capability.
 */
const allowedApps: Readonly<Record<string, string>> = Object.freeze({
  notepad: 'notepad.exe',
  'notepad.exe': 'notepad.exe',
  calc: 'calc.exe',
  calculator: 'calc.exe',
  'calc.exe': 'calc.exe',
  explorer: 'explorer.exe',
  'explorer.exe': 'explorer.exe',
  paint: 'mspaint.exe',
  mspaint: 'mspaint.exe',
  'mspaint.exe': 'mspaint.exe'
})

export function resolveCuaLaunchTarget(appName: unknown, args: unknown): string | null {
  if (typeof appName !== 'string' || !Array.isArray(args) || args.length > 0) {
    return null
  }

  const normalized = appName.trim().toLowerCase()

  return Object.prototype.hasOwnProperty.call(allowedApps, normalized)
    ? allowedApps[normalized]
    : null
}
