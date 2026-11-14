import { describe, expect, it } from 'vitest'

import { resolveCuaLaunchTarget } from './cua-launch-policy'

describe('SamOS voice computer-use launch policy', () => {
  it('allows only the intended visible Windows utilities', () => {
    expect(resolveCuaLaunchTarget('notepad.exe', [])).toBe('notepad.exe')
    expect(resolveCuaLaunchTarget(' CALCULATOR ', [])).toBe('calc.exe')
    expect(resolveCuaLaunchTarget('mspaint.exe', [])).toBe('mspaint.exe')
    expect(resolveCuaLaunchTarget('explorer.exe', [])).toBe('explorer.exe')
  })

  it.each([
    'cmd',
    'powershell.exe',
    'C:\\Windows\\System32\\cmd.exe',
    '../calc.exe',
    'calc.exe & whoami',
    'python',
    '',
    'msedge.exe'
  ])('rejects command or unapproved target %s', target => {
    expect(resolveCuaLaunchTarget(target, [])).toBeNull()
  })

  it('rejects app arguments and malformed IPC values', () => {
    expect(resolveCuaLaunchTarget('notepad.exe', ['secret.txt'])).toBeNull()
    expect(resolveCuaLaunchTarget('calc.exe', null)).toBeNull()
    expect(resolveCuaLaunchTarget(null, [])).toBeNull()
  })
})
