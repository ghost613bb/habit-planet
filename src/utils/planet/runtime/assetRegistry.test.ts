import { describe, expect, it } from 'vitest'

import { habitPlanetManifest } from '../manifests/habitPlanetManifest'
import { createAssetRegistry } from './assetRegistry'

describe('assetRegistry', () => {
  it('collects current and next-stage hero assets', () => {
    const registry = createAssetRegistry(habitPlanetManifest.assets)
    expect(registry.getStageAssets(2).heroIds).toContain('campfire')
    expect(registry.getPreloadAssets(2)).toContain('hut-skeleton')
  })

  it('returns releasable optional fx when quality drops', () => {
    const registry = createAssetRegistry(habitPlanetManifest.assets)
    expect(
      registry.getReleasableAssets({
        activeStage: 5,
        qualityTier: 'tier-0',
      }),
    ).toContain('butterfly-fx')
  })
})
