import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'
import { isGrassPatchBlockedByWoodPlankPath } from './woodPlankPath'

describe('第三阶段木板占地草簇清障', () => {
  it('第 15 天到第 17 天只隐藏木板占地草簇，并保留其余草簇', async () => {
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
    const blockedPatchesOnDayFifteen = grassPatches.filter((patch) =>
      isGrassPatchBlockedByWoodPlankPath(patch.userData.pathAnchorNormal as Vector3, 15),
    )
    const unblockedVisiblePatchesOnDayFifteen = grassPatches.filter((patch) => {
      const pathAnchorNormal = patch.userData.pathAnchorNormal as Vector3
      return !isGrassPatchBlockedByWoodPlankPath(pathAnchorNormal, 15) && patch.visible
    })

    vegetationLayer.update({
      dayCount: 16,
      stageIndex: 3 as const,
      stageProgress: 0.6,
      qualityTier: 'tier-1' as const,
    })
    const visibleCountOnDaySixteen = grassPatches.filter((patch) => patch.visible).length
    const blockedPatchesOnDaySixteen = grassPatches.filter((patch) =>
      isGrassPatchBlockedByWoodPlankPath(patch.userData.pathAnchorNormal as Vector3, 16),
    )

    vegetationLayer.update({
      dayCount: 17,
      stageIndex: 3 as const,
      stageProgress: 0.7,
      qualityTier: 'tier-1' as const,
    })
    const visibleCountOnDaySeventeen = grassPatches.filter((patch) => patch.visible).length
    const blockedPatchesOnDaySeventeen = grassPatches.filter((patch) =>
      isGrassPatchBlockedByWoodPlankPath(patch.userData.pathAnchorNormal as Vector3, 17),
    )
    const unblockedVisiblePatchesOnDaySeventeen = grassPatches.filter((patch) => {
      const pathAnchorNormal = patch.userData.pathAnchorNormal as Vector3
      return !isGrassPatchBlockedByWoodPlankPath(pathAnchorNormal, 17) && patch.visible
    })

    expect(visibleCountOnDayFifteen).toBeLessThan(visibleCountOnDayFourteen)
    expect(blockedPatchesOnDayFifteen.length).toBeGreaterThan(0)
    expect(blockedPatchesOnDayFifteen.every((patch) => !patch.visible)).toBe(true)
    expect(unblockedVisiblePatchesOnDayFifteen.length).toBeGreaterThan(0)

    expect(blockedPatchesOnDaySixteen.length).toBeGreaterThanOrEqual(blockedPatchesOnDayFifteen.length)
    expect(visibleCountOnDaySixteen).toBeLessThanOrEqual(visibleCountOnDayFifteen)

    expect(blockedPatchesOnDaySeventeen.length).toBeGreaterThanOrEqual(blockedPatchesOnDaySixteen.length)
    expect(visibleCountOnDaySeventeen).toBeLessThanOrEqual(visibleCountOnDaySixteen)
    expect(blockedPatchesOnDaySeventeen.every((patch) => !patch.visible)).toBe(true)
    expect(unblockedVisiblePatchesOnDaySeventeen.length).toBeGreaterThan(0)
  })
})
