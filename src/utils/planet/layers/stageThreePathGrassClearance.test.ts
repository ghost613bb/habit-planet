import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'
import { isGrassPatchBlockedByDirtPath } from './dirtPath'

describe('第三阶段土路草簇清障', () => {
  it('第 15 天会隐藏第一段土路通道内的草簇，但保留路径外草簇', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    vegetationLayer.update({
      dayCount: 14,
      stageIndex: 3 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })

    const grassPatches = (vegetationLayer as any).grassPatches as Object3D[]
    const visibleCountOnDayFourteen = grassPatches.filter((patch) => patch.visible).length

    vegetationLayer.update({
      dayCount: 15,
      stageIndex: 3 as const,
      stageProgress: 0.4,
      qualityTier: 'tier-1' as const,
    })

    const visibleCountOnDayFifteen = grassPatches.filter((patch) => patch.visible).length
    const blockedPatches = grassPatches.filter((patch) =>
      isGrassPatchBlockedByDirtPath(patch.userData.pathAnchorNormal as Vector3, 15),
    )
    const unblockedVisiblePatches = grassPatches.filter((patch) => {
      const pathAnchorNormal = patch.userData.pathAnchorNormal as Vector3
      return !isGrassPatchBlockedByDirtPath(pathAnchorNormal, 15) && patch.visible
    })

    expect(visibleCountOnDayFifteen).toBeLessThan(visibleCountOnDayFourteen)
    expect(blockedPatches.length).toBeGreaterThan(0)
    expect(blockedPatches.every((patch) => !patch.visible)).toBe(true)
    expect(unblockedVisiblePatches.length).toBeGreaterThan(0)
  })
})
