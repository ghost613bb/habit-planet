import { Group, Mesh, MeshLambertMaterial, Object3D, SphereGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { getPlanetGrassOverlayState, resetPlanetGrassOverlay } from '../assets/Materials'
import { getStageTwoDay, getStageTwoDayTuning } from '../config/stageTwoDayTuning'
import { getPlacementTransform, getSurfaceTransform } from '../math/PlanetMath'
import { DIRT_PATH_CENTER } from './dirtPath'
import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('第二阶段逐日配置', () => {
  it('会把第 4-10 天映射为固定的逐日配置', () => {
    expect(getStageTwoDay(4)).toBe(4)
    expect(getStageTwoDay(8.9)).toBe(8)
    expect(getStageTwoDay(10)).toBe(10)
  })

  it('第 8-10 天的草簇、灌木和泛绿会继续递进', () => {
    const dayEight = getStageTwoDayTuning(8)
    const dayNine = getStageTwoDayTuning(9)
    const dayTen = getStageTwoDayTuning(10)

    expect(dayEight.vegetation.grassPatchCount).toBe(70)
    expect(dayNine.vegetation.grassPatchCount).toBe(84)
    expect(dayTen.vegetation.grassPatchCount).toBe(98)
    expect(dayEight.vegetation.bushCount).toBe(4)
    expect(dayNine.vegetation.bushCount).toBe(4)
    expect(dayTen.vegetation.bushCount).toBe(4)
    expect(dayEight.terrain.grassOverlay.radius).toBeLessThan(dayNine.terrain.grassOverlay.radius)
    expect(dayNine.terrain.grassOverlay.radius).toBeLessThan(dayTen.terrain.grassOverlay.radius)
  })
})

describe('阶段 2 早期植被', () => {
  it('第 4-5 天顶部泛绿按逐日调优表查值，且比第一阶段继续外扩', () => {
    resetPlanetGrassOverlay()
    const parentGroup = new Group()
    const grassMesh = new Mesh(
      new SphereGeometry(3.05, 16, 16),
      new MeshLambertMaterial({ color: '#6b7045' }),
    )
    const terrainLayer = new TerrainLayer({
      parentGroup,
      grassMesh,
      planetRadius: 3,
    })

    terrainLayer.update({
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    const stageOneDayThreeOverlay = getPlanetGrassOverlayState()

    terrainLayer.update({
      dayCount: 4,
      stageIndex: 2 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    const stageTwoDayFourOverlay = getPlanetGrassOverlayState()

    terrainLayer.update({
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })
    const stageTwoDayFiveOverlay = getPlanetGrassOverlayState()
    const dayFourTerrainTuning = getStageTwoDayTuning(4).terrain
    const dayFiveTerrainTuning = getStageTwoDayTuning(5).terrain

    expect(stageOneDayThreeOverlay).toEqual({
      strength: 0.9,
      radius: 1.52,
      feather: 0.56,
      topStart: 0.5,
      topEnd: 0.9,
      irregularity: 0.1,
      color: '#4b8534',
    })
    expect(stageTwoDayFourOverlay).toEqual(dayFourTerrainTuning.grassOverlay)
    expect(stageTwoDayFiveOverlay).toEqual(dayFiveTerrainTuning.grassOverlay)
    expect(stageTwoDayFourOverlay.radius).toBeGreaterThan(stageOneDayThreeOverlay.radius)
    expect(stageTwoDayFourOverlay.topStart).toBeLessThan(stageOneDayThreeOverlay.topStart)
    expect(stageTwoDayFiveOverlay.radius).toBeGreaterThan(stageTwoDayFourOverlay.radius)
    expect(stageTwoDayFiveOverlay.topStart).toBeLessThan(stageTwoDayFourOverlay.topStart)
    expect(grassMesh.visible).toBe(true)
  })

  it('第 4 天先出现更多灌木和更高密度草簇，树木仍保持隐藏', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 4,
      stageIndex: 2 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()

    const bushes = (vegetationLayer as any).bushes as Object3D[]
    const trees = (vegetationLayer as any).trees as Object3D[]
    const grassPatches = (vegetationLayer as any).grassPatches as Object3D[]
    const visibleBushCount = bushes.filter((item) => item.visible).length
    const visibleTreeCount = trees.filter((item) => item.visible).length
    const visibleGrassPatchCount = grassPatches.filter((item) => item.visible).length
    const firstVisibleGrassPatch = grassPatches.find((item) => item.visible) as Object3D & {
      scale: { x: number }
    }

    expect(visibleBushCount).toBe(2)
    expect(visibleTreeCount).toBe(0)
    expect(visibleGrassPatchCount).toBe(26)
    expect(firstVisibleGrassPatch.scale.x).toBeCloseTo(0.505)
  })

  it('第 4 天和第 5 天石头数量按逐日调优表查值', () => {
    const parentGroup = new Group()
    const grassMesh = new Mesh(
      new SphereGeometry(3.05, 16, 16),
      new MeshLambertMaterial({ color: '#6b7045' }),
    )
    const terrainLayer = new TerrainLayer({
      parentGroup,
      grassMesh,
      planetRadius: 3,
    })

    terrainLayer.update({
      dayCount: 4,
      stageIndex: 2 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const rocks = (terrainLayer as any).rocks as { count: number }
    expect(rocks.count).toBe(getStageTwoDayTuning(4).terrain.rockCount)

    terrainLayer.update({
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })

    expect(rocks.count).toBe(getStageTwoDayTuning(5).terrain.rockCount)
  })

  it('第 4-5 天的草簇都比第一阶段第 3 天铺得更开，且第 5 天继续增密', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const dayFourInput = {
      dayCount: 4,
      stageIndex: 2 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    }
    const dayFiveInput = {
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    }

    const getVisibleBushCount = () =>
      ((vegetationLayer as any).bushes as Object3D[]).filter((item) => item.visible).length
    const getVisibleTreeCount = () =>
      ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
    const getFirstVisibleTree = () =>
      (((vegetationLayer as any).trees as Object3D[]).find((item) => item.visible) as Object3D | undefined)
    const getVisibleGrassPatchCount = () =>
      ((vegetationLayer as any).grassPatches as Object3D[]).filter((item) => item.visible).length
    const getFirstVisibleGrassPatchScale = () =>
      ((((vegetationLayer as any).grassPatches as Object3D[]).find((item) => item.visible) as Object3D | undefined)
        ?.scale.x ?? 0)
    const getVisibleGrassPatchMinNormalizedY = () =>
      ((vegetationLayer as any).grassPatches as Object3D[])
        .filter((item) => item.visible)
        .reduce((minValue, item) => Math.min(minValue, item.position.clone().normalize().y), 1)

    vegetationLayer.update({
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()
    const stageOneDayThreeGrassPatchMinNormalizedY = getVisibleGrassPatchMinNormalizedY()

    vegetationLayer.update(dayFourInput)
    const dayFourGrassPatchCount = getVisibleGrassPatchCount()
    const dayFourGrassPatchMinNormalizedY = getVisibleGrassPatchMinNormalizedY()

    vegetationLayer.update(dayFiveInput)

    expect(getVisibleBushCount()).toBe(3)
    expect(getVisibleTreeCount()).toBe(1)
    expect(getFirstVisibleTree()?.children.length ?? 0).toBeGreaterThan(0)
    expect(getVisibleGrassPatchCount()).toBeGreaterThan(dayFourGrassPatchCount)
    expect(getVisibleGrassPatchCount()).toBe(36)
    expect(getFirstVisibleGrassPatchScale()).toBeCloseTo(0.515)
    expect(dayFourGrassPatchMinNormalizedY).toBeLessThan(stageOneDayThreeGrassPatchMinNormalizedY)
    expect(getVisibleGrassPatchMinNormalizedY()).toBeLessThanOrEqual(dayFourGrassPatchMinNormalizedY)
  })

  it('草球会统一向外圈留出中间区域，避免挤占房子和小路位置', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()

    const visibleBushes = ((vegetationLayer as any).bushes as Object3D[]).filter((item) => item.visible)
    const hutPos = getSurfaceTransform(new Vector3().setFromSphericalCoords(1, 0.2, 2.1), 3.02).pos
    const dirtPathPos = getPlacementTransform(DIRT_PATH_CENTER.clone(), 3, 'default').pos
    const maxNormalizedY = visibleBushes.reduce(
      (maxValue, item) => Math.max(maxValue, item.position.clone().normalize().y),
      0,
    )
    const minDistanceToHut = visibleBushes.reduce(
      (minValue, item) => Math.min(minValue, item.position.distanceTo(hutPos)),
      Number.POSITIVE_INFINITY,
    )
    const minDistanceToDirtPath = visibleBushes.reduce(
      (minValue, item) => Math.min(minValue, item.position.distanceTo(dirtPathPos)),
      Number.POSITIVE_INFINITY,
    )

    expect(visibleBushes).toHaveLength(3)
    expect(maxNormalizedY).toBeLessThan(0.93)
    expect(minDistanceToHut).toBeGreaterThan(0.34)
    expect(minDistanceToDirtPath).toBeGreaterThan(0.65)
  })

  it('第 4 颗草球会保留面板确认后的默认落位', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 8,
      stageIndex: 2 as const,
      stageProgress: 0.6,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()

    const bushes = (vegetationLayer as any).bushes as Object3D[]
    const fourthBush = bushes[3]
    const expectedPlacement = getPlacementTransform(
      new Vector3().setFromSphericalCoords(1, 0.41, 5.33),
      3,
      'bush',
    )

    expect(fourthBush).toBeDefined()
    expect(fourthBush!.position.distanceTo(expectedPlacement.pos)).toBeLessThan(0.0001)
  })

  it('第 7-10 天草簇数量按天增长，且第 8-10 天都维持 4 个灌木与 2 棵树', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const getVisibleBushCount = () =>
      ((vegetationLayer as any).bushes as Object3D[]).filter((item) => item.visible).length
    const getVisibleTreeCount = () =>
      ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
    const getVisibleGrassPatchCount = () =>
      ((vegetationLayer as any).grassPatches as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update({
      dayCount: 7,
      stageIndex: 2 as const,
      stageProgress: 0.5,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()
    expect(getVisibleGrassPatchCount()).toBe(58)
    expect(getVisibleBushCount()).toBe(4)
    expect(getVisibleTreeCount()).toBe(2)

    vegetationLayer.update({
      dayCount: 8,
      stageIndex: 2 as const,
      stageProgress: 0.6,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleGrassPatchCount()).toBe(70)
    expect(getVisibleBushCount()).toBe(4)
    expect(getVisibleTreeCount()).toBe(2)

    vegetationLayer.update({
      dayCount: 9,
      stageIndex: 2 as const,
      stageProgress: 0.8,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleGrassPatchCount()).toBe(84)
    expect(getVisibleBushCount()).toBe(4)
    expect(getVisibleTreeCount()).toBe(2)

    vegetationLayer.update({
      dayCount: 10,
      stageIndex: 2 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleGrassPatchCount()).toBe(98)
    expect(getVisibleBushCount()).toBe(4)
    expect(getVisibleTreeCount()).toBe(2)
  })
})
