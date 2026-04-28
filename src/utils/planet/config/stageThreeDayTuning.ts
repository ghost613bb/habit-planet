export type StageThreeDay =
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21

export type StageThreeDayTuning = {
  flowerBushCount: number
  thirdTreeScale: number
}

export const STAGE_THREE_DAY_TUNING: Record<StageThreeDay, StageThreeDayTuning> = {
  11: { flowerBushCount: 1, thirdTreeScale: 0.82 },
  12: { flowerBushCount: 2, thirdTreeScale: 0.88 },
  13: { flowerBushCount: 3, thirdTreeScale: 0.94 },
  14: { flowerBushCount: 4, thirdTreeScale: 1 },
  15: { flowerBushCount: 4, thirdTreeScale: 1 },
  16: { flowerBushCount: 4, thirdTreeScale: 1 },
  17: { flowerBushCount: 4, thirdTreeScale: 1 },
  18: { flowerBushCount: 4, thirdTreeScale: 1 },
  19: { flowerBushCount: 4, thirdTreeScale: 1 },
  20: { flowerBushCount: 4, thirdTreeScale: 1 },
  21: { flowerBushCount: 4, thirdTreeScale: 1 },
}

export function getStageThreeDay(dayCount: number): StageThreeDay {
  const safeDay = Math.max(11, Math.min(21, Math.floor(dayCount)))
  return safeDay as StageThreeDay
}

export function getStageThreeDayTuning(dayCount: number): StageThreeDayTuning {
  return STAGE_THREE_DAY_TUNING[getStageThreeDay(dayCount)]
}

