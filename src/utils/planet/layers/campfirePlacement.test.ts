import { describe, expect, it } from 'vitest'

import {
  CAMPFIRE_SURFACE_PHI,
  CAMPFIRE_SURFACE_THETA,
  getDefaultCampfirePlacementDebugState,
  resolveCampfirePlacementDebugState,
} from './campfirePlacement'

describe('campfirePlacement 调试参数', () => {
  it('默认返回关闭态和默认篝火位置', () => {
    expect(getDefaultCampfirePlacementDebugState()).toEqual({
      enabled: false,
      phi: CAMPFIRE_SURFACE_PHI,
      theta: CAMPFIRE_SURFACE_THETA,
    })
  })

  it('关闭调试时会回退到默认篝火位置', () => {
    expect(
      resolveCampfirePlacementDebugState({
        enabled: false,
        phi: 0.7,
        theta: 2.2,
      }),
    ).toEqual({
      enabled: false,
      phi: CAMPFIRE_SURFACE_PHI,
      theta: CAMPFIRE_SURFACE_THETA,
    })
  })

  it('开启调试时会规范化 phi 并保留 theta', () => {
    expect(
      resolveCampfirePlacementDebugState({
        enabled: true,
        phi: -3,
        theta: 4.6,
      }),
    ).toEqual({
      enabled: true,
      phi: 0.01,
      theta: 4.6,
    })
  })
})
