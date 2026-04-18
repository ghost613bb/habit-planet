import type { PlanetQualityTier } from '../types'

export function resolveInitialQualityTier(input: {
  deviceMemory?: number
  hardwareConcurrency?: number
}): PlanetQualityTier {
  const deviceMemory = input.deviceMemory ?? 0
  const hardwareConcurrency = input.hardwareConcurrency ?? 0

  if (deviceMemory >= 6 && hardwareConcurrency >= 8) return 'tier-2'
  if (deviceMemory >= 2) return 'tier-1'
  return 'tier-0'
}

export function downgradeQualityTier(
  current: PlanetQualityTier,
  metrics: { avgFrameMs: number },
): PlanetQualityTier {
  if (metrics.avgFrameMs < 34) return current
  if (current === 'tier-2') return 'tier-1'
  return 'tier-0'
}
