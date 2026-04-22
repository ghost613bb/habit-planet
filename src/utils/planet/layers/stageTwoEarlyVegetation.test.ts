import { Group, Mesh, MeshLambertMaterial, Object3D, SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('阶段 2 早期植被', () => {
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

    expect(visibleBushCount).toBe(3)
    expect(visibleTreeCount).toBe(0)
    expect(visibleGrassPatchCount).toBeGreaterThanOrEqual(22)
    expect(visibleGrassPatchCount).toBeLessThanOrEqual(24)
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

  it('第 5 天比第 4 天出现更多灌木、树木和草簇', async () => {
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
    const getVisibleGrassPatchCount = () =>
      ((vegetationLayer as any).grassPatches as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update(dayFourInput)
    await vegetationLayer.preload()
    const dayFourBushCount = getVisibleBushCount()
    const dayFourTreeCount = getVisibleTreeCount()
    const dayFourGrassPatchCount = getVisibleGrassPatchCount()

    vegetationLayer.update(dayFiveInput)

    expect(getVisibleBushCount()).toBe(5)
    expect(getVisibleTreeCount()).toBe(1)
    expect(getVisibleGrassPatchCount()).toBeGreaterThan(dayFourGrassPatchCount)
    expect(getVisibleGrassPatchCount()).toBeGreaterThanOrEqual(28)
    expect(getVisibleGrassPatchCount()).toBeLessThanOrEqual(32)
  })
})
