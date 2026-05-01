import { describe, expect, it } from 'vitest'

import { getStageFourCabinDay, getStageFourCabinDayTuning } from './stageFourCabinDayTuning'

describe('第四阶段房屋逐日配置', () => {
  it('会把输入天数裁剪到第 22-28 天区间', () => {
    expect(getStageFourCabinDay(21.9)).toBe(22)
    expect(getStageFourCabinDay(22)).toBe(22)
    expect(getStageFourCabinDay(25.8)).toBe(25)
    expect(getStageFourCabinDay(28)).toBe(28)
    expect(getStageFourCabinDay(35)).toBe(28)
  })

  it('第 22 天读取最初态参数，第 28 天与后续天数读取最终态参数', () => {
    expect(getStageFourCabinDayTuning(22)).toEqual({
      houseScale: 0.72,
      surfaceClearance: 0.006,
      yawOffset: -0.14,
      windowWarmth: 0,
      settleAmount: 1,
    })
    expect(getStageFourCabinDayTuning(28)).toEqual({
      houseScale: 1,
      surfaceClearance: 0.018,
      yawOffset: 0,
      windowWarmth: 0.16,
      settleAmount: 0,
    })
    expect(getStageFourCabinDayTuning(35)).toEqual(getStageFourCabinDayTuning(28))
  })
})
