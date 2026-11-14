import { describe, expect, it } from 'vitest'

import { parseSamOSConfigImport } from './config-import-validation'

describe('SamOS configuration import validation', () => {
  it('accepts legacy and SamOS config objects without deleting unknown extension fields', () => {
    const input = {
      voice: { voice_chat_mode: 'chained' },
      checkpoints: { enabled: true },
      installed_extension: { custom: ['one', 'two'] }
    }
    expect(parseSamOSConfigImport(JSON.stringify(input))).toEqual(input)
  })

  it.each(['null', 'false', '123', '[]', '"invalid"', ''])(
    'rejects invalid top-level configuration JSON %s', source => {
      expect(() => parseSamOSConfigImport(source)).toThrow()
    }
  )

  it.each(['__proto__', 'prototype', 'constructor'])(
    'rejects dangerous nested object keys such as %s', key => {
      const input = JSON.stringify({ voice: { provider: 'edge' } })
        .replace('"provider"', JSON.stringify(key))
      expect(() => parseSamOSConfigImport(input)).toThrow(/forbidden key/)
    }
  )

  it('rejects deeply nested and overly large structures', () => {
    const deep = '{"x":'.repeat(40) + 'true' + '}'.repeat(40)
    expect(() => parseSamOSConfigImport(deep)).toThrow(/nesting/)
    expect(() => parseSamOSConfigImport(' '.repeat(4 * 1024 * 1024 + 1)))
      .toThrow(/limit/)
  })

  it('does not accept numeric overflow as a persisted setting', () => {
    expect(() => parseSamOSConfigImport('{"agent":{"max_turns":1e999}}'))
      .toThrow(/invalid number/)
  })
})
