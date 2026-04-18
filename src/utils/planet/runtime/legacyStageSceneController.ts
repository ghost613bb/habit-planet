import type { StageRuntimeSnapshot } from '../types'
import StageManager from '../stages'

export function createLegacyStageSceneController(stageManager: StageManager) {
  return {
    applySnapshot(snapshot: StageRuntimeSnapshot & { qualityTier: string }) {
      stageManager.update(snapshot.dayCount)
    },
    playMilestoneTransition(
      _fromSnapshot: StageRuntimeSnapshot & { qualityTier: string },
      toSnapshot: StageRuntimeSnapshot & { qualityTier: string },
    ) {
      stageManager.update(toSnapshot.dayCount)
    },
    jumpToSnapshot(snapshot: StageRuntimeSnapshot & { qualityTier: string }) {
      stageManager.update(snapshot.dayCount)
    },
  }
}
