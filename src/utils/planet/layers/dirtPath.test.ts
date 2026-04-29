import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  DIRT_PATH_CENTER,
  getDirtPathDirectionAt,
  getDirtPathRevealState,
  isGrassPatchBlockedByDirtPath,
} from './dirtPath'

describe('第三阶段短土路显现规则', () => {
  it('第 14 天及以前不显示土路', () => {
    expect(getDirtPathRevealState(14)).toEqual({
      visible: false,
      visibleSegmentCount: 0,
      opacity: 0,
    })
  })

  it('第 15-17 天逐日追加片段，第 18 天后保持完整状态', () => {
    expect(getDirtPathRevealState(15)).toEqual({
      visible: true,
      visibleSegmentCount: 1,
      opacity: 0.92,
    })
    expect(getDirtPathRevealState(16)).toEqual({
      visible: true,
      visibleSegmentCount: 2,
      opacity: 0.96,
    })
    expect(getDirtPathRevealState(17)).toEqual({
      visible: true,
      visibleSegmentCount: 3,
      opacity: 1,
    })
    expect(getDirtPathRevealState(18)).toEqual(getDirtPathRevealState(17))
    expect(getDirtPathRevealState(22)).toEqual(getDirtPathRevealState(17))
  })
})

describe('第三阶段土路路径数据', () => {
  it('会为分段之间留下小缝隙，不会把整条路一次性清空', () => {
    expect(isGrassPatchBlockedByDirtPath(getDirtPathDirectionAt(0.14), 15)).toBe(true)
    expect(isGrassPatchBlockedByDirtPath(getDirtPathDirectionAt(0.5), 16)).toBe(true)
    expect(isGrassPatchBlockedByDirtPath(getDirtPathDirectionAt(0.82), 15)).toBe(false)
  })

  it('远离土路的位置不会被误判成挡路草簇', () => {
    const farNormal = new Vector3().setFromSphericalCoords(1, 0.64, 4.8)

    expect(isGrassPatchBlockedByDirtPath(DIRT_PATH_CENTER.clone(), 14)).toBe(false)
    expect(isGrassPatchBlockedByDirtPath(DIRT_PATH_CENTER.clone(), 17)).toBe(true)
    expect(isGrassPatchBlockedByDirtPath(farNormal, 17)).toBe(false)
  })
})
