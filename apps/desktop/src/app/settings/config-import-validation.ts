import type { HermesConfigRecord } from '@/types/hermes'

export const MAX_SAMOS_CONFIG_IMPORT_BYTES = 4 * 1024 * 1024
const MAX_DEPTH = 32
const MAX_ENTRIES = 25_000
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * A config file is untrusted user-selected JSON. Validate its *shape* before
 * forwarding it to the existing scoped partial-save path.
 *
 * This deliberately does not invent a universal key allowlist: installed
 * capabilities may have their own configuration keys. The backend remains
 * responsible for semantic validation and security policy enforcement.
 */
export function parseSamOSConfigImport(text: string): HermesConfigRecord {
  if (text.length > MAX_SAMOS_CONFIG_IMPORT_BYTES) {
    throw new Error('Configuration file exceeds the 4 MiB import limit.')
  }

  const data: unknown = JSON.parse(text)

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('SamOS configuration must be a JSON object.')
  }

  let entries = 0

  const visit = (value: unknown, depth: number): void => {
    if (depth > MAX_DEPTH) {
      throw new Error('Configuration contains excessive nesting.')
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('Configuration contains an invalid number.')
    }

    if (value === null || typeof value !== 'object') {
      return
    }

    if (Array.isArray(value)) {
      entries += value.length

      if (entries > MAX_ENTRIES) {
        throw new Error('Configuration contains too many entries.')
      }

      for (const item of value) {
        visit(item, depth + 1)
      }

      return
    }

    // JSON.parse normally yields plain objects; this guard also makes the
    // function safe for any future caller that supplies a parsed value.
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error('Configuration contains a non-plain object.')
    }

    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    entries += keys.length

    if (entries > MAX_ENTRIES) {
      throw new Error('Configuration contains too many entries.')
    }

    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error('Configuration contains a forbidden key.')
      }

      visit(record[key], depth + 1)
    }
  }

  visit(data, 0)

  return data as HermesConfigRecord
}
