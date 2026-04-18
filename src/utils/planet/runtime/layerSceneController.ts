import type { LayerController, LayerUpdateInput } from '../layers/contracts'
import type { PlanetQualityTier, StageRuntimeSnapshot } from '../types'

type LayerSceneControllerOptions = {
  layers: LayerController[]
  legacyController: {
    applySnapshot: (snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) => void
    playMilestoneTransition: (
      fromSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
      toSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
    ) => void
    jumpToSnapshot: (snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) => void
  }
}

function toLayerInput(snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }): LayerUpdateInput {
  return {
    dayCount: snapshot.dayCount,
    stageIndex: snapshot.stageIndex,
    stageProgress: snapshot.stageProgress,
    qualityTier: snapshot.qualityTier,
  }
}

export function createLayerSceneController(options: LayerSceneControllerOptions) {
  const { layers, legacyController } = options

  function updateLayers(snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) {
    const input = toLayerInput(snapshot)
    layers.forEach((layer) => {
      layer.activate(input)
    })
  }

  return {
    applySnapshot(snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) {
      updateLayers(snapshot)
      if (snapshot.stageIndex >= 3) {
        legacyController.applySnapshot(snapshot)
      }
    },
    playMilestoneTransition(
      fromSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
      toSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
    ) {
      updateLayers(toSnapshot)
      if (toSnapshot.stageIndex >= 3) {
        legacyController.playMilestoneTransition(fromSnapshot, toSnapshot)
      }
    },
    jumpToSnapshot(snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) {
      updateLayers(snapshot)
      if (snapshot.stageIndex >= 3) {
        legacyController.jumpToSnapshot(snapshot)
      }
    },
  }
}
