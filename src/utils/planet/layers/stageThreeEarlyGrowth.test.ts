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
    const flowerInstance = visibleDayElevenFlower?.children[0] as Object3D | undefined
    expect(flowerInstance?.scale.x ?? 0).toBeGreaterThan(1)

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

  it('第 22-44 天继续保留第 21 天的草簇、树与花丛，第 45 天起额外补一棵中间树', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    const getVisibleCounts = () => {
      const bushes = (vegetationLayer as any).bushes as Object3D[]
      const trees = (vegetationLayer as any).trees as Object3D[]
      const grassPatches = (vegetationLayer as any).grassPatches as Object3D[]
      const flowerBushes = (vegetationLayer as any).flowerBushes as Object3D[]

      return {
        bushCount: bushes.filter((item) => item.visible).length,
        treeCount: trees.filter((item) => item.visible).length,
        grassPatchCount: grassPatches.filter((item) => item.visible).length,
        flowerBushCount: flowerBushes.filter((item) => item.visible).length,
      }
    }

    vegetationLayer.update({
      dayCount: 21,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    const dayTwentyOneCounts = getVisibleCounts()

    vegetationLayer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    const dayTwentyTwoCounts = getVisibleCounts()

    vegetationLayer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    const dayFortyFiveCounts = getVisibleCounts()

    expect(dayTwentyOneCounts).toEqual({
      bushCount: 4,
      treeCount: 3,
      grassPatchCount: dayTwentyOneCounts.grassPatchCount,
      flowerBushCount: 4,
    })
    expect(dayTwentyTwoCounts).toEqual(dayTwentyOneCounts)
    expect(dayFortyFiveCounts).toEqual({
      ...dayTwentyOneCounts,
      treeCount: 4,
    })
    expect((vegetationLayer as any).group.visible).toBe(true)
  })
})
