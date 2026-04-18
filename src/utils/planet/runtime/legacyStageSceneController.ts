import type { StageRuntimeSnapshot } from '../types'
import StageManager from '../stages'

// 过渡兼容层：当前默认渲染链路已经不再使用该适配器。
// 仅在需要临时回退到旧 StageManager 时再显式接入。
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
