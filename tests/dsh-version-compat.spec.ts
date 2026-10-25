import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'

/**
 * The DSH version gate this plugin's manifest must satisfy.
 *
 * DSH enforces the same rule in two places: before `pnpm add`
 * (dsh-plugin-manager, refusal code `incompatible-version`) and at profile
 * startup (dsh-app-boot, the plugin is denied). The rule
 * (`evaluatePluginCompatibility` in `@deepseek-ai/dsh-app-boot`):
 *
 *   - when the manifest declares `engines.dsh`, that range decides alone and
 *     `peerDependencies` are ignored;
 *   - otherwise every `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peer range is
 *     checked individually;
 *   - matching is `semver.satisfies(runtime, range, { includePrerelease: true })`,
 *     so the upper bound must close the line explicitly (`<=0.2.1` or
 *     `<0.2.2-0`): a plain `<0.2.2` also swallows `0.2.2-rc.x`.
 *
 * This plugin's promise: the whole DSH 0.2.1 line — every prerelease and the
 * release — and nothing from the neighbouring lines.
 */

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as {
  engines?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** DSH versions this plugin supports: the 0.2.1 line, prereleases and release. */
const supported = ['0.2.1-alpha.5', '0.2.1-rc.1', '0.2.1-rc.2', '0.2.1-rc.3', '0.2.1']
/** DSH versions outside that line must stay refused, including the next line's RCs. */
const refused = ['0.2.0', '0.2.0-rc.9', '0.2.2-rc.1', '0.2.2', '0.3.0']

/** The DSH peer packages the fallback gate checks when `engines.dsh` is absent. */
const dshPeers = Object.keys(manifest.peerDependencies ?? {}).filter(
  name => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
)

describe('DSH version gate against this manifest', () => {
  it('admits every version of the supported DSH line', () => {
    for (const version of supported) {
      expect(evaluatePluginCompatibility(manifest, {}, version), version).toBeUndefined()
    }
  })

  it('refuses DSH versions outside the line, including the next line\'s RCs', () => {
    for (const version of refused) {
      const issue = evaluatePluginCompatibility(manifest, {}, version)
      expect(issue, version).toBeDefined()
      expect(issue?.requirements, version).toBeDefined()
    }
  })

  it('declares engines.dsh so the gate never falls back to the peers', () => {
    expect(manifest.engines?.dsh).toBeTruthy()
  })

  it('keeps the peers equivalent to engines.dsh for hosts that read peers only', () => {
    const range = manifest.engines?.dsh
    expect(range).toBeTruthy()
    expect(dshPeers.length).toBeGreaterThan(0)
    for (const name of dshPeers) {
      expect(manifest.peerDependencies?.[name], name).toBe(range)
    }
    // Without engines.dsh the peers alone must reproduce the same matrix.
    const peersOnly = structuredClone(manifest)
    delete peersOnly.engines
    for (const version of supported) {
      expect(evaluatePluginCompatibility(peersOnly, {}, version), version).toBeUndefined()
    }
    for (const version of refused) {
      expect(evaluatePluginCompatibility(peersOnly, {}, version), version).toBeDefined()
    }
  })

  it('tracks the same DSH line in devDependencies instead of pinning one RC', () => {
    const range = manifest.engines?.dsh
    const devDeps = Object.entries(manifest.devDependencies ?? {}).filter(
      ([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
    )
    expect(devDeps.length).toBeGreaterThan(0)
    for (const [name, spec] of devDeps) {
      expect(spec, name).toBe(range)
    }
  })
})
