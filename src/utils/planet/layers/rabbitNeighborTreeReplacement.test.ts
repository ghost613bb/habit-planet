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

  it('第 45 天起会把兔子最近的树替换成最大树冠树，并延续到后续天数', async () => {
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

    expect(visibleTreesAtDayFortyFive).toHaveLength(4)
    expect(rabbitNeighborTreeAtDayFortyFive?.userData.treeAssetKey).toBe('largest-canopy')
    expect(secondTreeAtDayFortyFive?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(thirdTreeAtDayFortyFive?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(insertedLeafTreeAtDayFortyFive?.userData.treeAssetKey).toBe('leaf-tree')
    expect(rabbitNeighborInstanceAtDayFortyFive).toBeTruthy()
    expect(rabbitNeighborInstanceAtDayFortyFive).not.toBe(rabbitNeighborInstanceBeforeReplacement)

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

    expect(rabbitNeighborTreeAtDayFortySix?.userData.treeAssetKey).toBe('largest-canopy')
    expect(secondTreeAtDayFortySix?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(thirdTreeAtDayFortySix?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(insertedLeafTreeAtDayFortySix?.userData.treeAssetKey).toBe('leaf-tree')
    expect(rabbitNeighborTreeAtDayFortySix?.userData.treeModelVariant).toBe('base')

    vegetationLayer.update({
      dayCount: 54,
      stageIndex: 5 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })

    const visibleTreesAtDayFiftyFour = getVisibleTrees()
    const rabbitNeighborTreeAtDayFiftyFour = visibleTreesAtDayFiftyFour[0]
    const secondTreeAtDayFiftyFour = visibleTreesAtDayFiftyFour[1]
    const thirdTreeAtDayFiftyFour = visibleTreesAtDayFiftyFour[2]
    const insertedLeafTreeAtDayFiftyFour = visibleTreesAtDayFiftyFour[3]

    expect(rabbitNeighborTreeAtDayFiftyFour?.userData.treeAssetKey).toBe('largest-canopy')
    expect(secondTreeAtDayFiftyFour?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(thirdTreeAtDayFiftyFour?.userData.treeAssetKey).toBe('lowpoly-tree')
    expect(insertedLeafTreeAtDayFiftyFour?.userData.treeAssetKey).toBe('leaf-tree')
    expect(rabbitNeighborTreeAtDayFiftyFour?.userData.treeModelVariant).toBe('refined')
  })
})
