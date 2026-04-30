export const CAMPFIRE_SURFACE_PHI = 0.16
export const CAMPFIRE_SURFACE_THETA = 0.92

// 模型本体略贴地一些，火光再稍微抬高，整体会更稳。
export const CAMPFIRE_STRUCTURE_RADIUS_OFFSET = 0.015
export const CAMPFIRE_GLOW_RADIUS_OFFSET = 0.045
export const CAMPFIRE_LIGHT_RADIUS_OFFSET = 0.1

// 让篝火维持环境点缀感，不要比周围植被显得更“重”。
export const CAMPFIRE_MODEL_TARGET_HEIGHT = 0.34
export const CAMPFIRE_MODEL_YAW = -0.28

export type CampfirePlacementDebugState = {
  enabled: boolean
  phi: number
  theta: number
}

export function getDefaultCampfirePlacementDebugState(): CampfirePlacementDebugState {
  return {
    enabled: false,
    phi: CAMPFIRE_SURFACE_PHI,
    theta: CAMPFIRE_SURFACE_THETA,
  }
}

function normalizePhi(phi: number) {
  if (!Number.isFinite(phi)) return CAMPFIRE_SURFACE_PHI
  return Math.min(Math.max(phi, 0.01), Math.PI - 0.01)
}

function normalizeTheta(theta: number) {
  if (!Number.isFinite(theta)) return CAMPFIRE_SURFACE_THETA
  return theta
}

export function resolveCampfirePlacementDebugState(
  debugState?: CampfirePlacementDebugState | null,
): CampfirePlacementDebugState {
  if (!debugState?.enabled) {
    return getDefaultCampfirePlacementDebugState()
  }

  return {
    enabled: true,
    phi: normalizePhi(debugState.phi),
    theta: normalizeTheta(debugState.theta),
  }
}
