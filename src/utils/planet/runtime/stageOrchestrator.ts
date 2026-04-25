import type { PlanetQualityTier, StageRuntimeSnapshot } from '../types'
import { buildStageSnapshot } from './stageRuntime'

const MAX_RENDER_DAY_COUNT = 5

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

  function buildRenderSnapshot(dayCount: number) {
    // 第 6 天及以后先固定显示第 5 天画面，只影响渲染链路，不改真实进度值。
    return withQuality(buildStageSnapshot(Math.min(dayCount, MAX_RENDER_DAY_COUNT)))
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
      const nextSnapshot = buildRenderSnapshot(dayCount)

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
      const nextSnapshot = buildRenderSnapshot(dayCount)
      currentSnapshot = nextSnapshot
      controller.jumpToSnapshot(nextSnapshot)
    },
  }
}
