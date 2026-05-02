import { describe, expect, it } from 'vitest'

import {
  TREE_MODEL_UPGRADE_DAY,
  getStageFiveTreeDay,
  getStageFiveTreeDayTuning,
} from './stageFiveTreeDayTuning'

describe('第五阶段树模型逐日配置', () => {
  it('会把输入天数裁剪到第 46-60 天区间', () => {
    expect(getStageFiveTreeDay(45.8)).toBe(46)
    expect(getStageFiveTreeDay(46)).toBe(46)
    expect(getStageFiveTreeDay(53.9)).toBe(53)
    expect(getStageFiveTreeDay(54)).toBe(54)
    expect(getStageFiveTreeDay(88)).toBe(60)
  })

  it('第 54 天前使用基础树模型，第 54 天起统一切换为精致树模型', () => {
    expect(TREE_MODEL_UPGRADE_DAY).toBe(54)
    expect(getStageFiveTreeDayTuning(53).treeModelVariant).toBe('base')
    expect(getStageFiveTreeDayTuning(54).treeModelVariant).toBe('refined')
    expect(getStageFiveTreeDayTuning(60).treeModelVariant).toBe('refined')
    expect(getStageFiveTreeDayTuning(76).treeModelVariant).toBe('refined')
  })
})
