export type StageFourFlowerDay = 29 | 30 | 31 | 32 | 33 | 34 | 35

export type StageFourFlowerDayTuning = {
  lowPolyFlowerCount: number
}

export const STAGE_FOUR_FLOWER_DAY_TUNING: Record<StageFourFlowerDay, StageFourFlowerDayTuning> = {
  29: { lowPolyFlowerCount: 2 },
  30: { lowPolyFlowerCount: 4 },
  31: { lowPolyFlowerCount: 6 },
  32: { lowPolyFlowerCount: 8 },
  33: { lowPolyFlowerCount: 10 },
  34: { lowPolyFlowerCount: 12 },
  35: { lowPolyFlowerCount: 14 },
}

export function getStageFourFlowerDay(dayCount: number): StageFourFlowerDay {
  const safeDay = Math.max(29, Math.min(35, Math.floor(dayCount)))
  return safeDay as StageFourFlowerDay
}

export function getStageFourFlowerDayTuning(dayCount: number): StageFourFlowerDayTuning {
  return STAGE_FOUR_FLOWER_DAY_TUNING[getStageFourFlowerDay(dayCount)]
}
