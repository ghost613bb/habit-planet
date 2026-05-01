import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'
import { isGrassPatchBlockedByTent } from './StructureLayer'

describe('第十八天帐篷占地草簇清障', () => {
  it('第 18 天起会隐藏帐篷占地附近的草簇，并保留其他草簇', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    vegetationLayer.update({
      dayCount: 17,
      stageIndex: 3 as const,
      stageProgress: 0.7,
      qualityTier: 'tier-1' as const,
    })

    const grassPatches = (vegetationLayer as any).grassPatches as Object3D[]
    const blockedPatchesOnDaySeventeen = grassPatches.filter((patch) =>
      isGrassPatchBlockedByTent(patch.userData.pathAnchorNormal as Vector3, 17, 3),
    )

    vegetationLayer.update({
      dayCount: 18,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const blockedPatchesOnDayEighteen = grassPatches.filter((patch) =>
      isGrassPatchBlockedByTent(patch.userData.pathAnchorNormal as Vector3, 18, 3),
    )
    const unblockedVisiblePatchesOnDayEighteen = grassPatches.filter((patch) => {
      const pathAnchorNormal = patch.userData.pathAnchorNormal as Vector3
      return !isGrassPatchBlockedByTent(pathAnchorNormal, 18, 3) && patch.visible
    })

    expect(blockedPatchesOnDaySeventeen).toHaveLength(0)
    expect(blockedPatchesOnDayEighteen.length).toBeGreaterThan(0)
    expect(blockedPatchesOnDayEighteen.every((patch) => !patch.visible)).toBe(true)
    expect(unblockedVisiblePatchesOnDayEighteen.length).toBeGreaterThan(0)
  })
})
