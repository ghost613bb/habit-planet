export type StageFourCabinDay = 22 | 23 | 24 | 25 | 26 | 27 | 28

export type StageFourCabinDayTuning = {
  houseScale: number
  surfaceClearance: number
  yawOffset: number
  windowWarmth: number
  settleAmount: number
}

export const STAGE_FOUR_CABIN_DAY_TUNING: Record<StageFourCabinDay, StageFourCabinDayTuning> = {
  22: { houseScale: 0.72, surfaceClearance: 0.006, yawOffset: -0.14, windowWarmth: 0, settleAmount: 1 },
  23: { houseScale: 0.79, surfaceClearance: 0.009, yawOffset: -0.1, windowWarmth: 0, settleAmount: 0.82 },
  24: { houseScale: 0.86, surfaceClearance: 0.012, yawOffset: -0.07, windowWarmth: 0.02, settleAmount: 0.64 },
  25: { houseScale: 0.92, surfaceClearance: 0.014, yawOffset: -0.04, windowWarmth: 0.05, settleAmount: 0.46 },
  26: { houseScale: 0.96, surfaceClearance: 0.016, yawOffset: -0.02, windowWarmth: 0.08, settleAmount: 0.28 },
  27: { houseScale: 0.99, surfaceClearance: 0.017, yawOffset: -0.01, windowWarmth: 0.12, settleAmount: 0.12 },
  28: { houseScale: 1, surfaceClearance: 0.018, yawOffset: 0, windowWarmth: 0.16, settleAmount: 0 },
}

export function getStageFourCabinDay(dayCount: number): StageFourCabinDay {
  const safeDay = Math.max(22, Math.min(28, Math.floor(dayCount)))
  return safeDay as StageFourCabinDay
}

export function getStageFourCabinDayTuning(dayCount: number): StageFourCabinDayTuning {
  return STAGE_FOUR_CABIN_DAY_TUNING[getStageFourCabinDay(dayCount)]
}
