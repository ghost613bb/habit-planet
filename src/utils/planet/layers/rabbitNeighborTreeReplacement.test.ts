import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { VegetationLayer } from './VegetationLayer'

describe('兔子旁边树模型替换', () => {
  it('树模型会把 Standard 材质压成哑光，避免风车旁树叶出现反光高光', () => {
    const vegetationLayer = new VegetationLayer({
      parentGroup: new Group(),
      planetRadius: 3,
    })
    const treeInstance = new Group()
    const glossyMaterial = new MeshStandardMaterial({
      color: '#88cc77',
      metalness: 0.65,
      roughness: 0.18,
      envMapIntensity: 1.4,
    })
    const canopy = new Mesh(new BoxGeometry(0.6, 0.8, 0.6), glossyMaterial)
    treeInstance.add(canopy)

    ;(vegetationLayer as any).applyMatteTreeMaterial(treeInstance)

    const matteMaterial = canopy.material
    expect(matteMaterial).toBeInstanceOf(MeshStandardMaterial)
    expect(matteMaterial).not.toBe(glossyMaterial)
    if (!(matteMaterial instanceof MeshStandardMaterial)) return

    expect(matteMaterial.metalness).toBe(0)
    expect(matteMaterial.roughness).toBe(1)
    expect(matteMaterial.envMapIntensity).toBe(0)
  })

  it('第 45 天起会按既定节奏逐步替换树模型，并在第 57 天补上第 4 棵树', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    await vegetationLayer.preload()

    const getVisibleTrees = () =>
      ((vegetationLayer as any).trees as Group[]).filter((item) => item.visible)

    vegetationLayer.update({
      dayCount: 44,
      stageIndex: 4 as const,
      stageProgress: 0.95,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesBeforeReplacement = getVisibleTrees()
    const rabbitNeighborTreeBeforeReplacement = visibleTreesBeforeReplacement[0]
    const secondTreeBeforeReplacement = visibleTreesBeforeReplacement[1]
    const thirdTreeBeforeReplacement = visibleTreesBeforeReplacement[2]
    const insertedLeafTreeBeforeReplacement = visibleTreesBeforeReplacement[3]
    const rabbitNeighborInstanceBeforeReplacement = rabbitNeighborTreeBeforeReplacement?.children[0]

    expect(visibleTreesBeforeReplacement).toHaveLength(3)
    expect(rabbitNeighborTreeBeforeReplacement?.userData.treeAssetKey).toBe('leafy')
    expect(secondTreeBeforeReplacement?.userData.treeAssetKey).toBe('leafy')
    expect(thirdTreeBeforeReplacement?.userData.treeAssetKey).toBe('wide')
    expect(insertedLeafTreeBeforeReplacement).toBeUndefined()

    vegetationLayer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFortyFive = getVisibleTrees()
    const rabbitNeighborTreeAtDayFortyFive = visibleTreesAtDayFortyFive[0]
    const secondTreeAtDayFortyFive = visibleTreesAtDayFortyFive[1]
    const thirdTreeAtDayFortyFive = visibleTreesAtDayFortyFive[2]
    const insertedLeafTreeAtDayFortyFive = visibleTreesAtDayFortyFive[3]
    const rabbitNeighborInstanceAtDayFortyFive = rabbitNeighborTreeAtDayFortyFive?.children[0]

    expect(visibleTreesAtDayFortyFive).toHaveLength(3)
    expect(rabbitNeighborTreeAtDayFortyFive?.userData.treeAssetKey).toBe('largest-canopy')
    expect(secondTreeAtDayFortyFive?.userData.treeAssetKey).toBe('leafy')
    expect(thirdTreeAtDayFortyFive?.userData.treeAssetKey).toBe('wide')
    expect(insertedLeafTreeAtDayFortyFive).toBeUndefined()
    expect(rabbitNeighborInstanceAtDayFortyFive).toBeTruthy()
    expect(rabbitNeighborInstanceAtDayFortyFive).not.toBe(rabbitNeighborInstanceBeforeReplacement)
    expect(rabbitNeighborTreeAtDayFortyFive?.userData.treeModelVariant).toBe('refined')
    expect(secondTreeAtDayFortyFive?.userData.treeModelVariant).toBe('base')
    expect(thirdTreeAtDayFortyFive?.userData.treeModelVariant).toBe('base')

    vegetationLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFortySix = getVisibleTrees()
    const rabbitNeighborTreeAtDayFortySix = visibleTreesAtDayFortySix[0]
    const secondTreeAtDayFortySix = visibleTreesAtDayFortySix[1]
    const thirdTreeAtDayFortySix = visibleTreesAtDayFortySix[2]
    const insertedLeafTreeAtDayFortySix = visibleTreesAtDayFortySix[3]

    expect(visibleTreesAtDayFortySix).toHaveLength(3)
    expect(rabbitNeighborTreeAtDayFortySix?.userData.treeAssetKey).toBe('largest-canopy')
    expect(secondTreeAtDayFortySix?.userData.treeAssetKey).toBe('leafy')
    expect(thirdTreeAtDayFortySix?.userData.treeAssetKey).toBe('wide')
    expect(insertedLeafTreeAtDayFortySix).toBeUndefined()
    expect(rabbitNeighborTreeAtDayFortySix?.userData.treeModelVariant).toBe('refined')
    expect(secondTreeAtDayFortySix?.userData.treeModelVariant).toBe('base')
    expect(thirdTreeAtDayFortySix?.userData.treeModelVariant).toBe('base')

    vegetationLayer.update({
      dayCount: 48,
      stageIndex: 5 as const,
      stageProgress: 0.05,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFortyEight = getVisibleTrees()
    expect(visibleTreesAtDayFortyEight).toHaveLength(3)
    expect(visibleTreesAtDayFortyEight[0]?.userData.treeAssetKey).toBe('largest-canopy')
    expect(visibleTreesAtDayFortyEight[1]?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(visibleTreesAtDayFortyEight[2]?.userData.treeAssetKey).toBe('wide')
    expect(visibleTreesAtDayFortyEight.map((item) => item.userData.treeModelVariant)).toEqual([
      'refined',
      'refined',
      'base',
    ])

    vegetationLayer.update({
      dayCount: 53,
      stageIndex: 5 as const,
      stageProgress: 0.18,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFiftyThree = getVisibleTrees()
    expect(visibleTreesAtDayFiftyThree).toHaveLength(3)
    expect(visibleTreesAtDayFiftyThree[0]?.userData.treeAssetKey).toBe('largest-canopy')
    expect(visibleTreesAtDayFiftyThree[1]?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(visibleTreesAtDayFiftyThree[2]?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(visibleTreesAtDayFiftyThree.every((item) => item.userData.treeModelVariant === 'refined')).toBe(true)

    vegetationLayer.update({
      dayCount: 57,
      stageIndex: 5 as const,
      stageProgress: 0.28,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFiftySeven = getVisibleTrees()
    expect(visibleTreesAtDayFiftySeven).toHaveLength(4)
    expect(visibleTreesAtDayFiftySeven[0]?.userData.treeAssetKey).toBe('largest-canopy')
    expect(visibleTreesAtDayFiftySeven[1]?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(visibleTreesAtDayFiftySeven[2]?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(visibleTreesAtDayFiftySeven[3]?.userData.treeAssetKey).toBe('leaf-tree')
    expect(visibleTreesAtDayFiftySeven.every((item) => item.userData.treeModelVariant === 'refined')).toBe(true)
  })
})
