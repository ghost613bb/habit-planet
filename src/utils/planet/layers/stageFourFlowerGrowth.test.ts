import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA } from './campfirePlacement'
import { isGrassPatchBlockedByTent } from './StructureLayer'
import { VegetationLayer } from './VegetationLayer'
import { isGrassPatchBlockedByWoodPlankPath } from './woodPlankPath'

describe('第四阶段花朵累积', () => {
  it('第 29-35 天会复用固定草位，并按 2/4/6/8/10/12/14 朵逐日增加', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const getVisibleFlowerCount = () =>
      ((vegetationLayer as any).lowPolyFlowers as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update({
      dayCount: 28,
      stageIndex: 4 as const,
      stageProgress: 0.26,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()
    expect(getVisibleFlowerCount()).toBe(0)

    vegetationLayer.update({
      dayCount: 29,
      stageIndex: 4 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleFlowerCount()).toBe(2)

    const lowPolyFlowers = (vegetationLayer as any).lowPolyFlowers as Group[]
    const grassPatches = (vegetationLayer as any).grassPatches as Group[]
    const visibleDayTwentyNineFlowers = lowPolyFlowers.filter((item) => item.visible)
    expect(visibleDayTwentyNineFlowers).toHaveLength(2)
    expect(visibleDayTwentyNineFlowers[0]?.children.length ?? 0).toBeGreaterThan(0)
    expect(
      (visibleDayTwentyNineFlowers[0]?.children[0] as Object3D | undefined)?.userData.lowPolyFlowerVariant,
    ).toBeTruthy()
    const stableGrassPatchIndices = visibleDayTwentyNineFlowers.map((item) => item.userData.grassPatchIndex as number)
    stableGrassPatchIndices.forEach((grassPatchIndex, index) => {
      const flower = visibleDayTwentyNineFlowers[index]
      const grassPatch = grassPatches[grassPatchIndex]
      const flowerNormal = (flower?.userData.pathAnchorNormal as Vector3 | undefined)?.clone()
      const grassPatchNormal = (grassPatch?.userData.pathAnchorNormal as Vector3 | undefined)?.clone()

      expect(grassPatchIndex).toBeGreaterThanOrEqual(0)
      expect(flowerNormal?.distanceTo(grassPatchNormal ?? new Vector3(0, 0, 0)) ?? Number.POSITIVE_INFINITY).toBeLessThan(
        0.0001,
      )
    })
    const stablePositions = visibleDayTwentyNineFlowers.map((item) => item.position.clone())

    vegetationLayer.update({
      dayCount: 35,
      stageIndex: 4 as const,
      stageProgress: 0.58,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleFlowerCount()).toBe(14)

    const visibleDayThirtyFiveFlowers = lowPolyFlowers.filter((item) => item.visible)
    expect(visibleDayThirtyFiveFlowers).toHaveLength(14)
    stablePositions.forEach((position, index) => {
      expect(visibleDayThirtyFiveFlowers[index]?.position.distanceTo(position) ?? Number.POSITIVE_INFINITY).toBeLessThan(
        0.0001,
      )
    })
  })

  it('第 46 天起继续保留第 35 天的 14 朵花与固定位置', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    vegetationLayer.update({
      dayCount: 35,
      stageIndex: 4 as const,
      stageProgress: 0.58,
      qualityTier: 'tier-1' as const,
    })

    const dayThirtyFiveFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[])
      .filter((item) => item.visible)
      .map((item) => item.position.clone())
    const dayThirtyFiveGrassPatchIndices = ((vegetationLayer as any).lowPolyFlowers as Group[])
      .filter((item) => item.visible)
      .map((item) => item.userData.grassPatchIndex as number)

    vegetationLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const visibleStageFiveFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter((item) => item.visible)
    expect(visibleStageFiveFlowers).toHaveLength(14)
    dayThirtyFiveFlowers.forEach((position, index) => {
      expect(visibleStageFiveFlowers[index]?.position.distanceTo(position) ?? Number.POSITIVE_INFINITY).toBeLessThan(
        0.0001,
      )
      expect(visibleStageFiveFlowers[index]?.userData.grassPatchIndex).toBe(dayThirtyFiveGrassPatchIndices[index])
    })
    expect(visibleStageFiveFlowers.every((item) => item.position.length() > 0)).toBe(true)
  })

  it('花位会尽量远离木板路径，不占用木板清理区域内的草位', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()
    vegetationLayer.update({
      dayCount: 35,
      stageIndex: 4 as const,
      stageProgress: 0.58,
      qualityTier: 'tier-1' as const,
    })

    const visibleFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter((item) => item.visible)
    expect(visibleFlowers).toHaveLength(14)

    visibleFlowers.forEach((flower) => {
      const flowerNormal = flower.userData.pathAnchorNormal as Vector3 | undefined
      expect(isGrassPatchBlockedByWoodPlankPath(flowerNormal ?? new Vector3(0, 1, 0), 35)).toBe(false)
    })
  })

  it('花位会避开房屋区域和篝火区域，并尽量分散在草地上', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()
    vegetationLayer.update({
      dayCount: 35,
      stageIndex: 4 as const,
      stageProgress: 0.58,
      qualityTier: 'tier-1' as const,
    })

    const visibleFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter((item) => item.visible)
    const campfireNormal = new Vector3().setFromSphericalCoords(1, CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA)
    expect(visibleFlowers).toHaveLength(14)

    visibleFlowers.forEach((flower) => {
      const flowerNormal = flower.userData.pathAnchorNormal as Vector3 | undefined
      expect(isGrassPatchBlockedByTent(flowerNormal ?? new Vector3(0, 1, 0), 35, 3)).toBe(false)
      expect((flowerNormal ?? new Vector3(0, 1, 0)).angleTo(campfireNormal)).toBeGreaterThan(0.3)
    })
  })
})
