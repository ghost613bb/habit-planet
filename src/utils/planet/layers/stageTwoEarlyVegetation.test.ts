import { Group, Mesh, MeshLambertMaterial, Object3D, SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('阶段 2 早期植被', () => {
  it('第 4 天先出现灌木和少量草丛块，树木仍保持隐藏', async () => {
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
    const meadowPatches = (vegetationLayer as any).meadowPatches as Object3D[]
    const visibleBushCount = bushes.filter((item) => item.visible).length
    const visibleTreeCount = trees.filter((item) => item.visible).length
    const visibleMeadowCount = meadowPatches.filter((item) => item.visible).length

    expect(visibleBushCount).toBe(2)
    expect(visibleTreeCount).toBe(0)
    expect(visibleMeadowCount).toBe(2)
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

  it('第 5 天比第 4 天出现更多灌木、树木和草丛块', async () => {
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
    const getVisibleMeadowCount = () =>
      ((vegetationLayer as any).meadowPatches as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update(dayFourInput)
    await vegetationLayer.preload()
    const dayFourBushCount = getVisibleBushCount()
    const dayFourTreeCount = getVisibleTreeCount()
    const dayFourMeadowCount = getVisibleMeadowCount()

    vegetationLayer.update(dayFiveInput)

    expect(getVisibleBushCount()).toBeGreaterThan(dayFourBushCount)
    expect(getVisibleTreeCount()).toBeGreaterThan(dayFourTreeCount)
    expect(getVisibleMeadowCount()).toBeGreaterThan(dayFourMeadowCount)
  })
})
