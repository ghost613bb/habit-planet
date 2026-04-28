import { Group, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'

describe('阶段 3 早期（第 11-14 天）', () => {
  it('第 11-14 天出现第 3 棵树，并新增 1/2/3/4 丛花丛', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const getVisibleTreeCount = () =>
      ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
    const getVisibleFlowerCount = () =>
      ((vegetationLayer as any).flowerBushes as Object3D[]).filter((item) => item.visible).length

    vegetationLayer.update({
      dayCount: 11,
      stageIndex: 3 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()
    expect(getVisibleTreeCount()).toBe(3)
    expect(getVisibleFlowerCount()).toBe(1)
    const dayElevenFlowerBushes = (vegetationLayer as any).flowerBushes as Group[]
    const visibleDayElevenFlower = dayElevenFlowerBushes.find((item) => item.visible)
    expect(visibleDayElevenFlower?.children.length ?? 0).toBeGreaterThan(0)
    expect(visibleDayElevenFlower?.scale.x ?? 0).toBeGreaterThan(0.7)

    vegetationLayer.update({
      dayCount: 12,
      stageIndex: 3 as const,
      stageProgress: 0.1,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleTreeCount()).toBe(3)
    expect(getVisibleFlowerCount()).toBe(2)

    vegetationLayer.update({
      dayCount: 13,
      stageIndex: 3 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleFlowerCount()).toBe(3)

    vegetationLayer.update({
      dayCount: 14,
      stageIndex: 3 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleFlowerCount()).toBe(4)
  })

  it('第 15 天起继续保留 4 丛花丛（逐日累积）', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 15,
      stageIndex: 3 as const,
      stageProgress: 0.4,
      qualityTier: 'tier-1' as const,
    })
    await vegetationLayer.preload()

    const flowerBushes = (vegetationLayer as any).flowerBushes as Object3D[]
    const trees = (vegetationLayer as any).trees as Object3D[]
    expect(flowerBushes.filter((item) => item.visible).length).toBe(4)
    expect(trees.filter((item) => item.visible).length).toBe(3)
  })
})
