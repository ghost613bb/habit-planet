import type { PlanetQualityTier, StageRuntimeSnapshot } from '../types'
import { buildStageSnapshot } from './stageRuntime'

export type StageOrchestratorController = {
  applySnapshot: (snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) => void
  playMilestoneTransition: (
    fromSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
    toSnapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier },
  ) => void
  jumpToSnapshot: (snapshot: StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) => void
}

export function createStageOrchestrator(
  controller: StageOrchestratorController,
  initialQualityTier: PlanetQualityTier = 'tier-1',
) {
  let currentSnapshot: (StageRuntimeSnapshot & { qualityTier: PlanetQualityTier }) | null = null
  let qualityTier = initialQualityTier

  function withQuality(snapshot: StageRuntimeSnapshot) {
    return {
      ...snapshot,
      qualityTier,
    }
  }

  return {
    getCurrentSnapshot() {
      return currentSnapshot
    },
    setQualityTier(nextQualityTier: PlanetQualityTier) {
      qualityTier = nextQualityTier
      if (currentSnapshot) {
        currentSnapshot = {
          ...currentSnapshot,
          qualityTier,
        }
        controller.applySnapshot(currentSnapshot)
      }
    },
    update(dayCount: number) {
      const nextSnapshot = withQuality(buildStageSnapshot(dayCount))

      if (!currentSnapshot) {
        currentSnapshot = nextSnapshot
        controller.applySnapshot(nextSnapshot)
        return
      }

      const previousSnapshot = currentSnapshot
      const sameStage = previousSnapshot.stageIndex === nextSnapshot.stageIndex
      currentSnapshot = nextSnapshot

      if (sameStage) {
        controller.applySnapshot(nextSnapshot)
        return
      }

      controller.playMilestoneTransition(previousSnapshot, nextSnapshot)
    },
    jump(dayCount: number) {
      const nextSnapshot = withQuality(buildStageSnapshot(dayCount))
      currentSnapshot = nextSnapshot
      controller.jumpToSnapshot(nextSnapshot)
    },
  }
}
