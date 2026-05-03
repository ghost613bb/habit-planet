export type StageFiveTreeDay =
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60

export type TreeModelVariant = 'base' | 'refined'
export type TreeIndex = 0 | 1 | 2 | 3

export type StageFiveTreeDayTuning = {
  visibleTreeCount: 3 | 4
  refinedTreeIndices: TreeIndex[]
}

export const TREE_REPLACEMENT_DAYS = {
  firstTree: 45,
  secondTree: 48,
  thirdTree: 53,
} as const

export const TREE_ADDITION_DAY = 57

export const STAGE_FIVE_TREE_DAY_TUNING: Record<StageFiveTreeDay, StageFiveTreeDayTuning> = {
  46: { visibleTreeCount: 3, refinedTreeIndices: [0] },
  47: { visibleTreeCount: 3, refinedTreeIndices: [0] },
  48: { visibleTreeCount: 3, refinedTreeIndices: [0, 1] },
  49: { visibleTreeCount: 3, refinedTreeIndices: [0, 1] },
  50: { visibleTreeCount: 3, refinedTreeIndices: [0, 1] },
  51: { visibleTreeCount: 3, refinedTreeIndices: [0, 1] },
  52: { visibleTreeCount: 3, refinedTreeIndices: [0, 1] },
  53: { visibleTreeCount: 3, refinedTreeIndices: [0, 1, 2] },
  54: { visibleTreeCount: 3, refinedTreeIndices: [0, 1, 2] },
  55: { visibleTreeCount: 3, refinedTreeIndices: [0, 1, 2] },
  56: { visibleTreeCount: 3, refinedTreeIndices: [0, 1, 2] },
  57: { visibleTreeCount: 4, refinedTreeIndices: [0, 1, 2, 3] },
  58: { visibleTreeCount: 4, refinedTreeIndices: [0, 1, 2, 3] },
  59: { visibleTreeCount: 4, refinedTreeIndices: [0, 1, 2, 3] },
  60: { visibleTreeCount: 4, refinedTreeIndices: [0, 1, 2, 3] },
}

export function getStageFiveTreeDay(dayCount: number): StageFiveTreeDay {
  const safeDay = Math.max(46, Math.min(60, Math.floor(dayCount)))
  return safeDay as StageFiveTreeDay
}

export function getStageFiveTreeDayTuning(dayCount: number): StageFiveTreeDayTuning {
  return STAGE_FIVE_TREE_DAY_TUNING[getStageFiveTreeDay(dayCount)]
}
