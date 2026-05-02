import { Group } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'

describe('第五阶段树模型升级', () => {
  it('第 53 天前保持基础树模型，第 54 天起所有树一起切换为精致树模型', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    vegetationLayer.update({
      dayCount: 53,
      stageIndex: 5 as const,
      stageProgress: 0.15,
      qualityTier: 'tier-1' as const,
    })

    const treesBeforeUpgrade = (vegetationLayer as any).trees as Group[]
    const visibleTreesBeforeUpgrade = treesBeforeUpgrade.filter((item) => item.visible)
    const treeInstancesBeforeUpgrade = visibleTreesBeforeUpgrade.map((item) => item.children[0])

    expect(visibleTreesBeforeUpgrade).toHaveLength(3)
    expect(visibleTreesBeforeUpgrade.every((item) => item.userData.treeModelVariant === 'base')).toBe(true)

    vegetationLayer.update({
      dayCount: 54,
      stageIndex: 5 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })

    const treesAfterUpgrade = (vegetationLayer as any).trees as Group[]
    const visibleTreesAfterUpgrade = treesAfterUpgrade.filter((item) => item.visible)
    const treeInstancesAfterUpgrade = visibleTreesAfterUpgrade.map((item) => item.children[0])

    expect(visibleTreesAfterUpgrade).toHaveLength(3)
    expect(visibleTreesAfterUpgrade.every((item) => item.userData.treeModelVariant === 'refined')).toBe(true)
    treeInstancesAfterUpgrade.forEach((instance, index) => {
      expect(instance).toBeTruthy()
      expect(instance).not.toBe(treeInstancesBeforeUpgrade[index])
    })
  })
})
