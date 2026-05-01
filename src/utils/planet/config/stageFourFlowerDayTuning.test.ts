import { describe, expect, it } from 'vitest'

import { getStageFourFlowerDay, getStageFourFlowerDayTuning } from './stageFourFlowerDayTuning'

describe('第四阶段花朵逐日配置', () => {
  it('会把输入天数裁剪到第 29-35 天区间', () => {
    expect(getStageFourFlowerDay(28.8)).toBe(29)
    expect(getStageFourFlowerDay(29)).toBe(29)
    expect(getStageFourFlowerDay(32.9)).toBe(32)
    expect(getStageFourFlowerDay(35)).toBe(35)
    expect(getStageFourFlowerDay(46)).toBe(35)
  })

  it('第 29-35 天按 2/4/6/8/10/12/14 朵逐日累积，35 天后保持最终数量', () => {
    expect(getStageFourFlowerDayTuning(29)).toEqual({ lowPolyFlowerCount: 2 })
    expect(getStageFourFlowerDayTuning(30)).toEqual({ lowPolyFlowerCount: 4 })
    expect(getStageFourFlowerDayTuning(31)).toEqual({ lowPolyFlowerCount: 6 })
    expect(getStageFourFlowerDayTuning(32)).toEqual({ lowPolyFlowerCount: 8 })
    expect(getStageFourFlowerDayTuning(33)).toEqual({ lowPolyFlowerCount: 10 })
    expect(getStageFourFlowerDayTuning(34)).toEqual({ lowPolyFlowerCount: 12 })
    expect(getStageFourFlowerDayTuning(35)).toEqual({ lowPolyFlowerCount: 14 })
    expect(getStageFourFlowerDayTuning(46)).toEqual(getStageFourFlowerDayTuning(35))
  })
})
