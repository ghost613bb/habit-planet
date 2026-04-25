import { Group, Mesh, MeshLambertMaterial, Object3D, SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { getPlanetGrassOverlayState, resetPlanetGrassOverlay } from '../assets/Materials'
import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('阶段 2 早期植被', () => {
  it('第 4-5 天使用比第一阶段更大的顶部泛绿范围，且第 5 天比第 4 天继续扩大', () => {
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

    expect(stageOneDayThreeOverlay).toEqual({
      strength: 0.9,
      radius: 1.52,
      feather: 0.56,
      topStart: 0.5,
      topEnd: 0.9,
      irregularity: 0.1,
      color: '#4b8534',
    })
    expect(stageTwoDayFourOverlay).toEqual({
      strength: 0.9,
      radius: 1.98,
      feather: 0.82,
      topStart: 0.28,
      topEnd: 0.9,
      irregularity: 0.1,
      color: '#4b8534',
    })
    expect(stageTwoDayFiveOverlay).toEqual({
      strength: 0.9,
      radius: 2.18,
      feather: 0.9,
      topStart: 0.22,
      topEnd: 0.9,
      irregularity: 0.1,
      color: '#4b8534',
    })
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

    expect(visibleBushCount).toBe(3)
    expect(visibleTreeCount).toBe(0)
    expect(visibleGrassPatchCount).toBe(32)
    expect(firstVisibleGrassPatch.scale.x).toBeCloseTo(0.525)
  })

  it('第 4 天和第 5 天分别显示 5 块和 6 块石头', () => {
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
    expect(rocks.count).toBe(5)

    terrainLayer.update({
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })

    expect(rocks.count).toBe(6)
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

    expect(getVisibleBushCount()).toBe(5)
    expect(getVisibleTreeCount()).toBe(1)
    expect(getFirstVisibleTree()?.children.length ?? 0).toBeGreaterThan(0)
    expect(getVisibleGrassPatchCount()).toBeGreaterThan(dayFourGrassPatchCount)
    expect(getVisibleGrassPatchCount()).toBe(41)
    expect(getFirstVisibleGrassPatchScale()).toBeCloseTo(0.525)
    expect(dayFourGrassPatchMinNormalizedY).toBeLessThan(stageOneDayThreeGrassPatchMinNormalizedY)
    expect(getVisibleGrassPatchMinNormalizedY()).toBeLessThanOrEqual(dayFourGrassPatchMinNormalizedY)
  })
})
