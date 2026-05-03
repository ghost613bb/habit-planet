import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA } from './campfirePlacement'
import { isGrassPatchBlockedBySwing, isGrassPatchBlockedByTent } from './StructureLayer'
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

  it('第 45 天起隐藏花球，但继续保留避树后的低模小花位置', async () => {
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

    const dayThirtyFiveFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter((item) => item.visible)
    const dayThirtyFiveFlowerPositions = dayThirtyFiveFlowers.map((item) => item.position.clone())

    vegetationLayer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFortyFive = ((vegetationLayer as any).trees as Group[]).filter((item) => item.visible)
    const visibleFlowersAtDayFortyFive = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter(
      (item) => item.visible,
    )
    const visibleFlowerBushesAtDayFortyFive = ((vegetationLayer as any).flowerBushes as Group[]).filter(
      (item) => item.visible,
    )
    const dayFortyFiveFlowerPositions = visibleFlowersAtDayFortyFive.map((item) => item.position.clone())
    const dayFortyFiveGrassPatchIndices = visibleFlowersAtDayFortyFive.map(
      (item) => item.userData.grassPatchIndex as number,
    )

    expect(visibleTreesAtDayFortyFive).toHaveLength(3)
    expect(visibleFlowersAtDayFortyFive).toHaveLength(14)
    expect(visibleFlowerBushesAtDayFortyFive).toHaveLength(0)
    dayThirtyFiveFlowerPositions.forEach((position, index) => {
      expect(visibleFlowersAtDayFortyFive[index]?.position.distanceTo(position) ?? 0).toBeGreaterThan(0.05)
    })

    const getMinDistanceToTrees = (position: Vector3) =>
      Math.min(...visibleTreesAtDayFortyFive.map((tree) => tree.position.distanceTo(position)))
    expect(
      Math.min(...dayFortyFiveFlowerPositions.map((position) => getMinDistanceToTrees(position))),
    ).toBeGreaterThan(
      Math.min(...dayThirtyFiveFlowerPositions.map((position) => getMinDistanceToTrees(position))),
    )

    vegetationLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const visibleStageFiveFlowers = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter((item) => item.visible)
    const visibleStageFiveFlowerBushes = ((vegetationLayer as any).flowerBushes as Group[]).filter(
      (item) => item.visible,
    )
    expect(visibleStageFiveFlowers).toHaveLength(14)
    expect(visibleStageFiveFlowerBushes).toHaveLength(0)
    dayFortyFiveFlowerPositions.forEach((position, index) => {
      expect(visibleStageFiveFlowers[index]?.position.distanceTo(position) ?? Number.POSITIVE_INFINITY).toBeLessThan(
        0.0001,
      )
      expect(visibleStageFiveFlowers[index]?.userData.grassPatchIndex).toBe(dayFortyFiveGrassPatchIndices[index])
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

  it('第 65 天秋千出现后，会隐藏秋千附近当前可见的小花', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()
    vegetationLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const visibleFlowersBeforeSwing = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter(
      (item) => item.visible,
    )
    expect(visibleFlowersBeforeSwing).toHaveLength(14)

    vegetationLayer.update({
      dayCount: 65,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const visibleFlowersAfterSwing = ((vegetationLayer as any).lowPolyFlowers as Group[]).filter(
      (item) => item.visible,
    )
    expect(visibleFlowersAfterSwing.length).toBeLessThan(14)
    expect(visibleFlowersAfterSwing.length).toBeGreaterThan(0)
    visibleFlowersAfterSwing.forEach((flower) => {
      const flowerNormal = flower.userData.pathAnchorNormal as Vector3 | undefined
      expect(isGrassPatchBlockedBySwing(flowerNormal ?? new Vector3(0, 1, 0), 65, 3)).toBe(false)
    })
  })
})
