import { describe, expect, it } from 'vitest'

import {
  TREE_ADDITION_DAY,
  TREE_REPLACEMENT_DAYS,
  getStageFiveTreeDay,
  getStageFiveTreeDayTuning,
} from './stageFiveTreeDayTuning'

describe('第五阶段树模型逐日配置', () => {
  it('会把输入天数裁剪到第 46-60 天区间', () => {
    expect(getStageFiveTreeDay(45.8)).toBe(46)
    expect(getStageFiveTreeDay(46)).toBe(46)
    expect(getStageFiveTreeDay(53.9)).toBe(53)
    expect(getStageFiveTreeDay(57)).toBe(57)
    expect(getStageFiveTreeDay(88)).toBe(60)
  })

  it('第 45-56 天保持 3 棵树，并按 45/48/53 天依次替换前三棵树，第 57 天再补第 4 棵树', () => {
    expect(TREE_REPLACEMENT_DAYS).toEqual({
      firstTree: 45,
      secondTree: 48,
      thirdTree: 53,
    })
    expect(TREE_ADDITION_DAY).toBe(57)

    expect(getStageFiveTreeDayTuning(46)).toEqual({
      visibleTreeCount: 3,
      refinedTreeIndices: [0],
    })
    expect(getStageFiveTreeDayTuning(47)).toEqual({
      visibleTreeCount: 3,
      refinedTreeIndices: [0],
    })
    expect(getStageFiveTreeDayTuning(48)).toEqual({
      visibleTreeCount: 3,
      refinedTreeIndices: [0, 1],
    })
    expect(getStageFiveTreeDayTuning(53)).toEqual({
      visibleTreeCount: 3,
      refinedTreeIndices: [0, 1, 2],
    })
    expect(getStageFiveTreeDayTuning(56)).toEqual({
      visibleTreeCount: 3,
      refinedTreeIndices: [0, 1, 2],
    })
    expect(getStageFiveTreeDayTuning(57)).toEqual({
      visibleTreeCount: 4,
      refinedTreeIndices: [0, 1, 2, 3],
    })
    expect(getStageFiveTreeDayTuning(76)).toEqual({
      visibleTreeCount: 4,
      refinedTreeIndices: [0, 1, 2, 3],
    })
  })
})
