import type { PlanetStageIndex, StageRuntimeSnapshot } from '../types'

export const STAGE_WINDOWS = [
  { stageIndex: 1 as PlanetStageIndex, minDay: 1, maxDay: 3 },
  { stageIndex: 2 as PlanetStageIndex, minDay: 4, maxDay: 10 },
  { stageIndex: 3 as PlanetStageIndex, minDay: 11, maxDay: 21 },
  { stageIndex: 4 as PlanetStageIndex, minDay: 22, maxDay: 45 },
  { stageIndex: 5 as PlanetStageIndex, minDay: 46, maxDay: 90 },
  { stageIndex: 6 as PlanetStageIndex, minDay: 91, maxDay: Number.POSITIVE_INFINITY },
] as const

const MILESTONE_DAYS = [4, 11, 22, 46, 91]

export function normalizeDayCount(dayCount: number): number {
  if (!isFinite(dayCount)) return 1
  return Math.max(1, Math.floor(dayCount))
}

export function getStageIndex(dayCount: number): PlanetStageIndex {
  const safeDay = normalizeDayCount(dayCount)
  for (const item of STAGE_WINDOWS) {
    if (safeDay >= item.minDay && safeDay <= item.maxDay) return item.stageIndex
  }
  return 1
}

export function buildStageSnapshot(dayCount: number): StageRuntimeSnapshot {
  const safeDay = normalizeDayCount(dayCount)
  const stageIndex = getStageIndex(safeDay)
  let currentWindow: (typeof STAGE_WINDOWS)[number] | null = null

  for (const item of STAGE_WINDOWS) {
    if (item.stageIndex === stageIndex) {
      currentWindow = item
      break
    }
  }

  if (!currentWindow) {
    return {
      dayCount: safeDay,
      stageIndex: 1,
      stageProgress: 0,
      isMilestone: false,
    }
  }

  if (!isFinite(currentWindow.maxDay)) {
    return {
      dayCount: safeDay,
      stageIndex,
      stageProgress: 1,
      isMilestone: MILESTONE_DAYS.indexOf(safeDay) >= 0,
    }
  }

  const span = Math.max(1, currentWindow.maxDay - currentWindow.minDay)
  const clampedDay = Math.min(Math.max(safeDay, currentWindow.minDay), currentWindow.maxDay)
  const stageProgress = Number(((clampedDay - currentWindow.minDay) / span).toFixed(4))

  return {
    dayCount: safeDay,
    stageIndex,
    stageProgress,
    isMilestone: MILESTONE_DAYS.indexOf(safeDay) >= 0,
  }
}
