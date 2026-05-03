import { Group, Mesh, MeshBasicMaterial } from 'three'
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

  it('第 91 天主树升级为发光生命树，并仅保留放大与高光', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    vegetationLayer.update({
      dayCount: 90,
      stageIndex: 5 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const trees = (vegetationLayer as any).trees as Group[]
    const day90MainTree = trees[0]
    const day90Scale = day90MainTree?.scale.x ?? 0
    const day90TargetHeight = (day90MainTree?.userData.treeTargetHeight as number) ?? 0
    const lifeTreeFxRoot = (vegetationLayer as any).lifeTreeFxRoot as Group
    expect(day90MainTree?.userData.treeAssetKey).toBe('largest-canopy')
    expect(lifeTreeFxRoot.visible).toBe(false)

    vegetationLayer.update({
      dayCount: 91,
      stageIndex: 6 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const day91MainTree = trees[0]
    const glowCore = (vegetationLayer as any).lifeTreeGlowCore as Mesh
    const glowCoreMaterial = glowCore.material as MeshBasicMaterial
    expect(day91MainTree?.userData.treeAssetKey).toBe('life-tree')
    expect((day91MainTree?.userData.treeTargetHeight as number) ?? 0).toBeGreaterThan(day90TargetHeight)
    expect((day91MainTree?.scale.x ?? 0)).toBeGreaterThan(day90Scale)
    expect(lifeTreeFxRoot.visible).toBe(true)
    expect(glowCoreMaterial.opacity).toBeGreaterThan(0.12)
  })
})
