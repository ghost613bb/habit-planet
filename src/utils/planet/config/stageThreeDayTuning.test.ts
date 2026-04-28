import { describe, expect, it } from 'vitest'

import { getStageThreeDay, getStageThreeDayTuning } from './stageThreeDayTuning'

describe('第三阶段逐日配置', () => {
  it('会把输入天数裁剪到第 11-21 天区间', () => {
    expect(getStageThreeDay(10.9)).toBe(11)
    expect(getStageThreeDay(11)).toBe(11)
    expect(getStageThreeDay(14.9)).toBe(14)
    expect(getStageThreeDay(21)).toBe(21)
    expect(getStageThreeDay(25)).toBe(21)
  })

  it('第 11-14 天花丛数量为 1/2/3/4，第 15 天起保持 4', () => {
    expect(getStageThreeDayTuning(11).flowerBushCount).toBe(1)
    expect(getStageThreeDayTuning(12).flowerBushCount).toBe(2)
    expect(getStageThreeDayTuning(13).flowerBushCount).toBe(3)
    expect(getStageThreeDayTuning(14).flowerBushCount).toBe(4)
    expect(getStageThreeDayTuning(15).flowerBushCount).toBe(4)
    expect(getStageThreeDayTuning(21).flowerBushCount).toBe(4)
  })

  it('第 11-14 天第三棵树缩放为 0.82/0.88/0.94/1.0，第 15 天起保持 1.0', () => {
    expect(getStageThreeDayTuning(11).thirdTreeScale).toBe(0.82)
    expect(getStageThreeDayTuning(12).thirdTreeScale).toBe(0.88)
    expect(getStageThreeDayTuning(13).thirdTreeScale).toBe(0.94)
    expect(getStageThreeDayTuning(14).thirdTreeScale).toBe(1)
    expect(getStageThreeDayTuning(15).thirdTreeScale).toBe(1)
    expect(getStageThreeDayTuning(21).thirdTreeScale).toBe(1)
  })
})

