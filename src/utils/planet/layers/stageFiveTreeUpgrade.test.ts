import { Group } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'

describe('第五阶段树模型升级', () => {
  it('第 46-57 天按 45/48/53/57 的节奏依次替换并新增树模型', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    const getVisibleTrees = () => ((vegetationLayer as any).trees as Group[]).filter((item) => item.visible)

    vegetationLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleTrees()).toHaveLength(3)
    expect(getVisibleTrees().map((item) => item.userData.treeModelVariant)).toEqual(['refined', 'base', 'base'])
    expect(getVisibleTrees().map((item) => item.userData.treeAssetKey)).toEqual(['largest-canopy', 'leafy', 'wide'])

    vegetationLayer.update({
      dayCount: 48,
      stageIndex: 5 as const,
      stageProgress: 0.05,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleTrees()).toHaveLength(3)
    expect(getVisibleTrees().map((item) => item.userData.treeModelVariant)).toEqual([
      'refined',
      'refined',
      'base',
    ])
    expect(getVisibleTrees().map((item) => item.userData.treeAssetKey)).toEqual([
      'largest-canopy',
      'lowpoly-tree',
      'wide',
    ])

    vegetationLayer.update({
      dayCount: 53,
      stageIndex: 5 as const,
      stageProgress: 0.18,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleTrees()).toHaveLength(3)
    expect(getVisibleTrees().map((item) => item.userData.treeModelVariant)).toEqual([
      'refined',
      'refined',
      'refined',
    ])
    expect(getVisibleTrees().map((item) => item.userData.treeAssetKey)).toEqual([
      'largest-canopy',
      'lowpoly-tree',
      'lowpoly-tree',
    ])

    vegetationLayer.update({
      dayCount: 57,
      stageIndex: 5 as const,
      stageProgress: 0.28,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleTrees()).toHaveLength(4)
    expect(getVisibleTrees().map((item) => item.userData.treeModelVariant)).toEqual([
      'refined',
      'refined',
      'refined',
      'refined',
    ])
    expect(getVisibleTrees().map((item) => item.userData.treeAssetKey)).toEqual([
      'largest-canopy',
      'lowpoly-tree',
      'lowpoly-tree',
      'leaf-tree',
    ])
  })
})
