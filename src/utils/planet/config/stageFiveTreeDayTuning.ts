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

export type StageFiveTreeDayTuning = {
  treeModelVariant: TreeModelVariant
}

export const TREE_MODEL_UPGRADE_DAY = 54

export const STAGE_FIVE_TREE_DAY_TUNING: Record<StageFiveTreeDay, StageFiveTreeDayTuning> = {
  46: { treeModelVariant: 'base' },
  47: { treeModelVariant: 'base' },
  48: { treeModelVariant: 'base' },
  49: { treeModelVariant: 'base' },
  50: { treeModelVariant: 'base' },
  51: { treeModelVariant: 'base' },
  52: { treeModelVariant: 'base' },
  53: { treeModelVariant: 'base' },
  54: { treeModelVariant: 'refined' },
  55: { treeModelVariant: 'refined' },
  56: { treeModelVariant: 'refined' },
  57: { treeModelVariant: 'refined' },
  58: { treeModelVariant: 'refined' },
  59: { treeModelVariant: 'refined' },
  60: { treeModelVariant: 'refined' },
}

export function getStageFiveTreeDay(dayCount: number): StageFiveTreeDay {
  const safeDay = Math.max(46, Math.min(60, Math.floor(dayCount)))
  return safeDay as StageFiveTreeDay
}

export function getStageFiveTreeDayTuning(dayCount: number): StageFiveTreeDayTuning {
  return STAGE_FIVE_TREE_DAY_TUNING[getStageFiveTreeDay(dayCount)]
}
