import type { AssetDescriptor, PlanetQualityTier, PlanetStageIndex } from '../types'

export function createAssetRegistry(assets: readonly AssetDescriptor[]) {
  return {
    getStageAssets(stageIndex: PlanetStageIndex) {
      const active = assets.filter((item) => item.stages.indexOf(stageIndex) >= 0)
      return {
        all: active.map((item) => item.id),
        heroIds: active.filter((item) => item.scope === 'hero').map((item) => item.id),
      }
    },
    getPreloadAssets(stageIndex: PlanetStageIndex) {
      const nextStage = Math.min(6, stageIndex + 1) as PlanetStageIndex
      return assets
        .filter((item) => item.preloadAt.indexOf(nextStage) >= 0)
        .map((item) => item.id)
    },
    getReleasableAssets(input: {
      activeStage: PlanetStageIndex
      qualityTier: PlanetQualityTier
    }) {
      if (input.qualityTier !== 'tier-0') return []

      return assets
        .filter((item) => item.scope === 'optional-fx')
        .filter((item) => item.stages.indexOf(input.activeStage) >= 0)
        .map((item) => item.id)
    },
  }
}
