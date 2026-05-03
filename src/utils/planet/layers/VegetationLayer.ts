import {
  Color,
  CylinderGeometry,
  Group,
  LoadingManager,
  Material,
  MeshStandardMaterial,
  Mesh,
  SphereGeometry,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { mats } from '../assets/Materials'
import {
  createLowPolyFlowerInstance,
  preloadLowPolyFlowerTemplate,
  type LowPolyFlowerVariant,
} from '../assets/LowPolyFlowers'
import {
  createFlowerBushInstance,
  preloadFlowerBushTemplate,
  type FlowerBushPaletteVariant,
} from '../assets/FlowerBush'
import {
  createLargestCanopyTreeInstance,
  preloadLargestCanopyTreeTemplate,
} from '../assets/LargestCanopyTree'
import { createLeafTreeInstance, preloadLeafTreeTemplate } from '../assets/LeafTree'
import { createLeafyTreeInstance, preloadLeafyTreeTemplate } from '../assets/LeafyTree'
import { createLowpolyTreeInstance, preloadLowpolyTreeTemplate } from '../assets/LowpolyTree'
import { createLowPolyWideTreeInstance, preloadLowPolyWideTreeTemplate } from '../assets/LowPolyWideTree'
import { getStageFiveTreeDayTuning, type TreeModelVariant } from '../config/stageFiveTreeDayTuning'
import { getStageFourFlowerDayTuning } from '../config/stageFourFlowerDayTuning'
import { getStageThreeDayTuning } from '../config/stageThreeDayTuning'
import { getStageTwoDayTuning } from '../config/stageTwoDayTuning'
import { getPlacementTransform, getSurfaceTransformWithClearance } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'
import { isGrassPatchBlockedBySwing, isGrassPatchBlockedByTent } from './StructureLayer'
import { isGrassPatchBlockedByWoodPlankPath } from './woodPlankPath'

type VegetationLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

type BushAnchor = {
  phi: number
  theta: number
}

type RabbitNeighborTreeVariant = 'default' | 'largestCanopy'
type FlowerPlacementVariant = 'base' | 'treeAvoided'

const SPROUT_SCALE_BOOST = 1.55
const BUSH_SCALE_BOOST = 1.7
const GRASS_PATCH_SCALE_BOOST = 1.75
const LEAFY_TREE_SCALE_BOOST = 1.68
const WIDE_TREE_SCALE_BOOST = 1.58
const BUSH_MODEL_SCALE_FACTOR = 0.95
const FLOWER_BUSH_MODEL_SCALE_FACTOR = 0.95
const LOW_POLY_FLOWER_TARGET_HEIGHT = 0.6
const LOW_POLY_FLOWER_SURFACE_CLEARANCE = 0.065
const BUSH_OUTWARD_PHI_OFFSET = 0.09
const RABBIT_NEIGHBOR_TREE_REPLACEMENT_DAY = 45
const RABBIT_NEIGHBOR_TREE_HEIGHT_MULTIPLIER = 1.8
const BASE_TREE_TARGET_HEIGHTS = {
  leftTall: 0.82 * LEAFY_TREE_SCALE_BOOST,
  rightTall: 0.7 * LEAFY_TREE_SCALE_BOOST,
  wide: 0.88 * WIDE_TREE_SCALE_BOOST,
  farTall: 0.7 * LEAFY_TREE_SCALE_BOOST,
}
const REFINED_TREE_TARGET_HEIGHTS = {
  leftTall: BASE_TREE_TARGET_HEIGHTS.leftTall * 1.08,
  rightTall: BASE_TREE_TARGET_HEIGHTS.rightTall * 1.08,
  wide: BASE_TREE_TARGET_HEIGHTS.wide * 1.08,
  farTall: BASE_TREE_TARGET_HEIGHTS.farTall * 1.08,
}
const FLOWER_BUSH_BASE_ANCHORS = [
  // 这些点位避开了篝火(theta≈0.92)、草球(≈1.02/1.46/2.4/3.6/5.1)和主树(≈5.72/2.62/2.7/4.8)。
  // 同时仍尽量落在 shelter 视角前半球，保证第 11-14 天更容易看到。
  { phi: 0.64, theta: 0.16, scale: 0.92 },
  { phi: 0.6, theta: 1.84, scale: 0.96 },
  { phi: 0.58, theta: 3.18, scale: 0.94 },
  { phi: 0.66, theta: 4.22, scale: 0.98 },
  { phi: 0.62, theta: 5.94, scale: 0.95 },
  { phi: 0.68, theta: 0.58, scale: 0.9 },
] as const
const FLOWER_BUSH_TREE_AVOIDING_ANCHORS = [
  // 第 45 天起树模型切换后，把花丛整体挪到离四棵树更远的安全扇区。
  { phi: 0.63, theta: 0.3, scale: 0.92 },
  { phi: 0.576, theta: 1.409, scale: 0.96 },
  { phi: 0.5, theta: 1.62, scale: 0.94 },
  { phi: 0.58, theta: 4.74, scale: 0.98 },
  { phi: 0.64, theta: 4.92, scale: 0.95 },
  { phi: 0.63, theta: 4.735, scale: 0.9 },
] as const
const BUSH_BASE_ANCHORS: BushAnchor[] = [
  { phi: 0.42, theta: 1.02 },
  { phi: 0.38, theta: 1.78 },
  { phi: 0.24, theta: 2.4 },
  // 第 4 颗草球按调试面板确认值固化到默认锚点，避免每次都要手调。
  { phi: 0.32, theta: 5.33 },
  { phi: 0.14, theta: 3.6 },
]
// 花朵继续复用草簇锚点，但优先选择远离木板路径与中轴通道的位置，避免贴近木块模型。
const LOW_POLY_FLOWER_BASE_GRASS_PATCH_INDICES = [20, 33, 40, 47, 54, 60, 67, 73, 79, 84, 88, 91, 94, 97] as const
const LOW_POLY_FLOWER_TREE_AVOIDING_GRASS_PATCH_INDICES = [
  81, 29, 18, 84, 85, 91, 39, 92, 93, 26, 96, 97, 64, 80,
] as const

export class VegetationLayer implements LayerController {
  id = 'vegetation'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private sprout: Group
  private bushes: Group[] = []
  private trees: Group[] = []
  private grassPatches: Group[] = []
  private flowerBushes: Group[] = []
  private lowPolyFlowers: Group[] = []
  private grassPatchTemplate: Group | null = null
  private grassPatchLoader = new GLTFLoader(new LoadingManager())
  private grassPatchLoadPromise: Promise<void> | null = null
  private leafyTreeLoadPromise: Promise<void> | null = null
  private lowPolyWideTreeLoadPromise: Promise<void> | null = null
  private lowpolyTreeLoadPromise: Promise<void> | null = null
  private leafTreeLoadPromise: Promise<void> | null = null
  private largestCanopyTreeLoadPromise: Promise<void> | null = null
  private flowerBushLoadPromise: Promise<void> | null = null
  private lowPolyFlowerLoadPromise: Promise<void> | null = null
  private currentTreeModelVariant: TreeModelVariant = 'base'
  private currentRabbitNeighborTreeVariant: RabbitNeighborTreeVariant = 'default'
  private currentFlowerPlacementVariant: FlowerPlacementVariant = 'base'

  constructor(options: VegetationLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.group.visible = false
    this.parentGroup.add(this.group)

    this.sprout = this.createSprout()
    this.group.add(this.sprout)

    this.bushes = this.createBushes()
    this.bushes.forEach((item) => this.group.add(item))

    this.trees = this.createTrees()
    this.trees.forEach((item) => this.group.add(item))

    this.grassPatches = this.createGrassPatchAnchors()
    this.grassPatches.forEach((item) => this.group.add(item))

    this.flowerBushes = this.createFlowerBushAnchors()
    this.flowerBushes.forEach((item) => this.group.add(item))

    this.lowPolyFlowers = this.createLowPolyFlowerAnchors()
    this.lowPolyFlowers.forEach((item) => this.group.add(item))
  }

  preload(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (!this.grassPatchLoadPromise) {
      if (isJsdomEnvironment) {
        this.grassPatchTemplate = new Group()
        this.attachGrassPatchInstances()
        this.grassPatchLoadPromise = Promise.resolve()
      } else {
        const grassPatchUrl =
          typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
            ? new URL('/models/grass_patches/scene.gltf', globalThis.location.origin).toString()
            : '/models/grass_patches/scene.gltf'

        this.grassPatchLoadPromise = new Promise((resolve, reject) => {
          this.grassPatchLoader.load(
            grassPatchUrl,
            (gltf) => {
              this.grassPatchTemplate = gltf.scene.clone(true)
              this.attachGrassPatchInstances()
              resolve()
            },
            undefined,
            reject,
          )
        })
      }
    }

    if (!this.leafyTreeLoadPromise) {
      this.leafyTreeLoadPromise = preloadLeafyTreeTemplate().then(() => {
        this.attachTreeInstances()
      })
    }

    if (!this.lowPolyWideTreeLoadPromise) {
      this.lowPolyWideTreeLoadPromise = preloadLowPolyWideTreeTemplate().then(() => {
        this.attachTreeInstances()
      })
    }

    if (!this.lowpolyTreeLoadPromise) {
      this.lowpolyTreeLoadPromise = preloadLowpolyTreeTemplate().then(() => {
        this.attachTreeInstances()
      })
    }

    if (!this.leafTreeLoadPromise) {
      this.leafTreeLoadPromise = preloadLeafTreeTemplate().then(() => {
        this.attachTreeInstances()
      })
    }

    if (!this.largestCanopyTreeLoadPromise) {
      this.largestCanopyTreeLoadPromise = preloadLargestCanopyTreeTemplate().then(() => {
        this.attachTreeInstances()
      })
    }

    if (!this.flowerBushLoadPromise) {
      this.flowerBushLoadPromise = preloadFlowerBushTemplate().then(() => {
        this.attachFlowerBushInstances()
      })
    }

    if (!this.lowPolyFlowerLoadPromise) {
      this.lowPolyFlowerLoadPromise = preloadLowPolyFlowerTemplate().then(() => {
        this.attachLowPolyFlowerInstances()
      })
    }

    return Promise.all([
      this.grassPatchLoadPromise,
      this.leafyTreeLoadPromise,
      this.lowPolyWideTreeLoadPromise,
      this.lowpolyTreeLoadPromise,
      this.leafTreeLoadPromise,
      this.largestCanopyTreeLoadPromise,
      this.flowerBushLoadPromise,
      this.lowPolyFlowerLoadPromise,
    ]).then(() => undefined)
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    // 植被从第三阶段开始按“逐日累积”继承到后续阶段，不在第 4 阶段后整体隐藏。
    this.group.visible = true

    const stageOneDay = input.stageIndex === 1 ? Math.max(1, Math.floor(input.dayCount)) : null
    const stageTwoTuning = input.stageIndex === 2 ? getStageTwoDayTuning(input.dayCount).vegetation : null
    const stageThreeTuning = input.stageIndex >= 3 ? getStageThreeDayTuning(input.dayCount) : null
    const nextTreeModelVariant =
      input.stageIndex >= 5 ? getStageFiveTreeDayTuning(input.dayCount).treeModelVariant : 'base'
    const nextRabbitNeighborTreeVariant: RabbitNeighborTreeVariant =
      input.dayCount >= RABBIT_NEIGHBOR_TREE_REPLACEMENT_DAY ? 'largestCanopy' : 'default'
    const nextFlowerPlacementVariant = this.getFlowerPlacementVariant(input.dayCount)
    const persistedStageTwoTuning = input.stageIndex >= 3 ? getStageTwoDayTuning(10).vegetation : null
    const inheritedVegetationTuning = stageTwoTuning ?? persistedStageTwoTuning

    let shouldReattachTrees = false
    if (nextTreeModelVariant !== this.currentTreeModelVariant) {
      this.currentTreeModelVariant = nextTreeModelVariant
      shouldReattachTrees = true
    }
    if (nextRabbitNeighborTreeVariant !== this.currentRabbitNeighborTreeVariant) {
      this.currentRabbitNeighborTreeVariant = nextRabbitNeighborTreeVariant
      shouldReattachTrees = true
    }
    if (shouldReattachTrees) {
      // 第 45 天起替换兔子旁边那棵树，第 54 天起继续叠加树模型统一升级，两个切换点都要重挂树实例。
      this.attachTreeInstances()
    }
    if (nextFlowerPlacementVariant !== this.currentFlowerPlacementVariant) {
      this.currentFlowerPlacementVariant = nextFlowerPlacementVariant
      this.updateFlowerBushPlacements()
      this.updateLowPolyFlowerPlacements()
    }

    this.sprout.visible = input.stageIndex === 1
    if (stageOneDay != null) {
      // 第 1-3 天让幼苗有明确长高过程，便于用户一眼感知变化。
      const stageOneSproutScale = stageOneDay === 1 ? 0.62 : stageOneDay === 2 ? 0.72 : 0.86
      this.sprout.scale.setScalar(stageOneSproutScale * SPROUT_SCALE_BOOST)
    } else {
      this.sprout.scale.setScalar((0.55 + input.stageProgress * 0.45) * SPROUT_SCALE_BOOST)
    }

    const stageOneGrassPatchCount =
      stageOneDay == null ? 0 : stageOneDay === 1 ? 0 : stageOneDay === 2 ? 8 : 16
    const stageTwoGrassPatchCount = inheritedVegetationTuning?.grassPatchCount ?? 0
    const totalVisibleGrassPatchCount =
      inheritedVegetationTuning == null ? stageOneGrassPatchCount : stageTwoGrassPatchCount
    const unifiedGrassPatchScale =
      stageOneDay != null && stageOneDay >= 2
        ? 0.3 * GRASS_PATCH_SCALE_BOOST
        : inheritedVegetationTuning?.grassPatchScale ?? null
    const visibleTreeCount =
      input.stageIndex === 1
        ? 0
        : input.dayCount >= RABBIT_NEIGHBOR_TREE_REPLACEMENT_DAY
          ? 4
          : stageThreeTuning != null
            ? 3
            : inheritedVegetationTuning?.treeCount ?? 0
    const visibleFlowerBushCount =
      input.dayCount >= RABBIT_NEIGHBOR_TREE_REPLACEMENT_DAY ? 0 : (stageThreeTuning?.flowerBushCount ?? 0)
    const visibleLowPolyFlowerCount =
      input.stageIndex >= 4 && input.dayCount >= 29
        ? getStageFourFlowerDayTuning(input.dayCount).lowPolyFlowerCount
        : 0

    if (
      totalVisibleGrassPatchCount > 0 ||
      visibleTreeCount > 0 ||
      visibleFlowerBushCount > 0 ||
      visibleLowPolyFlowerCount > 0
    ) {
      // 真实运行链路不会手动调用 preload，这里在草簇或树首次需要显示时懒加载一次。
      void this.preload()
    }

    for (let i = 0; i < this.grassPatches.length; i += 1) {
      const patch = this.grassPatches[i]
      if (!patch) continue
      const pathAnchorNormal = patch.userData.pathAnchorNormal as Vector3 | undefined
      const blockedByWoodPlank =
        pathAnchorNormal != null && isGrassPatchBlockedByWoodPlankPath(pathAnchorNormal, input.dayCount)
      const blockedByTent =
        pathAnchorNormal != null && isGrassPatchBlockedByTent(pathAnchorNormal, input.dayCount, this.planetRadius)
      patch.visible = i < totalVisibleGrassPatchCount && !blockedByWoodPlank && !blockedByTent
      if (unifiedGrassPatchScale != null) {
        patch.scale.setScalar(unifiedGrassPatchScale)
      }
    }

    const visibleBushCount =
      input.stageIndex === 1
        ? 0
        : inheritedVegetationTuning?.bushCount ?? (2 + Math.round(input.stageProgress * 2))
    for (let i = 0; i < this.bushes.length; i += 1) {
      const bush = this.bushes[i]
      if (!bush) continue
      bush.visible = i < visibleBushCount
      bush.scale.setScalar(
        (inheritedVegetationTuning != null
          ? inheritedVegetationTuning.bushScale
          : (0.75 + input.stageProgress * 0.25) * BUSH_SCALE_BOOST) * BUSH_MODEL_SCALE_FACTOR,
      )
    }

    for (let i = 0; i < this.trees.length; i += 1) {
      const tree = this.trees[i]
      if (!tree) continue
      tree.visible = i < visibleTreeCount
      if (stageThreeTuning != null) {
        const baseTreeScale = persistedStageTwoTuning?.treeScaleSet[i] ?? 1
        tree.scale.setScalar(i === 2 ? stageThreeTuning.thirdTreeScale : baseTreeScale)
        continue
      }
      tree.scale.setScalar(inheritedVegetationTuning?.treeScaleSet[i] ?? 0.7 + input.stageProgress * 0.3)
    }

    for (let i = 0; i < this.flowerBushes.length; i += 1) {
      const flowerBush = this.flowerBushes[i]
      if (!flowerBush) continue
      flowerBush.visible = i < visibleFlowerBushCount
    }

    for (let i = 0; i < this.lowPolyFlowers.length; i += 1) {
      const flower = this.lowPolyFlowers[i]
      if (!flower) continue
      const flowerNormal = flower.userData.pathAnchorNormal as Vector3 | undefined
      const blockedBySwing =
        flowerNormal != null && isGrassPatchBlockedBySwing(flowerNormal, input.dayCount, this.planetRadius)
      flower.visible = i < visibleLowPolyFlowerCount && !blockedBySwing
    }
  }

  deactivate() {
    this.group.visible = false
    this.grassPatches.forEach((patch) => {
      patch.visible = false
    })
    this.flowerBushes.forEach((flowerBush) => {
      flowerBush.visible = false
    })
    this.lowPolyFlowers.forEach((flower) => {
      flower.visible = false
    })
  }

  dispose() {
    this.parentGroup.remove(this.group)
  }

  private createSprout() {
    const sprout = new Group()
    const stem = new Mesh(new CylinderGeometry(0.015, 0.02, 0.45, 6), mats.trunk)
    stem.position.y = 0.24

    const leafLeft = new Mesh(new SphereGeometry(0.08, 8, 8), mats.leaves1)
    leafLeft.scale.set(1.2, 0.55, 0.6)
    leafLeft.position.set(-0.08, 0.48, 0)
    leafLeft.rotation.z = 0.45

    const leafRight = new Mesh(new SphereGeometry(0.08, 8, 8), mats.leaves2)
    leafRight.scale.set(1.2, 0.55, 0.6)
    leafRight.position.set(0.08, 0.5, 0)
    leafRight.rotation.z = -0.45

    sprout.add(stem, leafLeft, leafRight)

    const { pos, quaternion } = getPlacementTransform(new Vector3(0, 1, 0), this.planetRadius, 'sprout')
    sprout.position.copy(pos)
    sprout.quaternion.copy(quaternion)
    sprout.renderOrder = 3

    return sprout
  }

  private createBushes() {
    return BUSH_BASE_ANCHORS.map((anchor) => {
      const bush = new Group()
      const body = new Mesh(new SphereGeometry(0.16, 10, 10), mats.leaves2)
      body.scale.set(1.1, 0.8, 1.1)
      body.position.y = 0.14
      bush.add(body)

      this.applyBushPlacement(bush, anchor)
      bush.visible = false

      return bush
    })
  }

  private applyBushPlacement(bush: Group, anchor: BushAnchor) {
    const { pos, quaternion } = getPlacementTransform(
      new Vector3().setFromSphericalCoords(1, anchor.phi + BUSH_OUTWARD_PHI_OFFSET, anchor.theta),
      this.planetRadius,
      'bush',
    )
    bush.position.copy(pos)
    bush.quaternion.copy(quaternion)
  }

  private createTrees() {
    const anchors = [
      // 帐篷左侧直杆树（勿删）
      { phi: 0.54, theta: 5.22 },
      // 帐篷右侧靠内松树（勿删）
      { phi: 0.4, theta: 3.7 },
      // 帐篷右侧靠外松树（勿删）
      { phi: 0.46, theta: 2.32 },
      // 帐篷右侧中间大松树（勿删）
      { phi: 0.48, theta: 3.16 },
    ]

    return anchors.map((anchor, index) => {
      const tree = new Group()

      const { pos, quaternion } = getPlacementTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        'tree',
      )
      tree.position.copy(pos)
      tree.quaternion.copy(quaternion)
      tree.rotation.y = index * 0.9
      tree.visible = false

      return tree
    })
  }

  private createGrassPatchAnchors() {
    // 前 16 个锚点保持更靠近顶部，兼容第一阶段；后续锚点只做小幅外扩与打散，让第二阶段更自然。
    const ringConfigs = [
      { count: 8, phiBase: 0.08, phiJitter: 0.015, thetaOffset: 0.1, thetaJitter: 0, scaleBase: 0.27 },
      { count: 8, phiBase: 0.14, phiJitter: 0.02, thetaOffset: 0.35, thetaJitter: 0, scaleBase: 0.285 },
      { count: 12, phiBase: 0.26, phiJitter: 0.032, thetaOffset: 0.12, thetaJitter: 0.2, scaleBase: 0.3 },
      { count: 17, phiBase: 0.375, phiJitter: 0.036, thetaOffset: 0.3, thetaJitter: 0.22, scaleBase: 0.315 },
    ]
    const anchors = ringConfigs.flatMap((ring) =>
      Array.from({ length: ring.count }, (_, index) => ({
        phi: ring.phiBase + (index % 2 === 0 ? ring.phiJitter : -ring.phiJitter),
        theta:
          ring.thetaOffset +
          (index / ring.count) * Math.PI * 2 +
          (index % 3 === 0 ? ring.thetaJitter : index % 3 === 1 ? -ring.thetaJitter * 0.6 : ring.thetaJitter * 0.35),
        scale: ring.scaleBase + (index % 3) * 0.012,
      })),
    )
    const stageSixExtraAnchors = [
      { phi: 0.5, theta: 1.62, scale: 0.333 },
      { phi: 0.58, theta: 3.42, scale: 0.341 },
      { phi: 0.52, theta: 4.26, scale: 0.337 },
      { phi: 0.64, theta: 4.92, scale: 0.345 },
      { phi: 0.6, theta: 1.18, scale: 0.334 },
      { phi: 0.56, theta: 2.34, scale: 0.339 },
      { phi: 0.58, theta: 4.74, scale: 0.342 },
      { phi: 0.62, theta: 3.72, scale: 0.348 },
    ]
    const stageSevenExtraAnchors = [
      { count: 16, phiBase: 0.44, phiJitter: 0.026, thetaOffset: 0.18, thetaJitter: 0.12, scaleBase: 0.332 },
      { count: 16, phiBase: 0.52, phiJitter: 0.028, thetaOffset: 0.44, thetaJitter: 0.14, scaleBase: 0.338 },
      { count: 17, phiBase: 0.6, phiJitter: 0.03, thetaOffset: 0.14, thetaJitter: 0.16, scaleBase: 0.344 },
    ].flatMap((ring) =>
      Array.from({ length: ring.count }, (_, index) => ({
        phi: ring.phiBase + (index % 2 === 0 ? ring.phiJitter : -ring.phiJitter * 0.8),
        theta:
          ring.thetaOffset +
          (index / ring.count) * Math.PI * 2 +
          (index % 3 === 0 ? ring.thetaJitter : index % 3 === 1 ? -ring.thetaJitter * 0.55 : ring.thetaJitter * 0.28),
        scale: ring.scaleBase + (index % 3) * 0.01,
      })),
    )
    // 第 6 天新增草簇必须继承第 5 天前 41 个锚点，只在其后继续追加新增锚点，
    // 并把新增锚点放到远离树和篝火的安全区域。
    const accumulatedAnchors = [...anchors.slice(0, 41), ...stageSixExtraAnchors, ...stageSevenExtraAnchors]

    return accumulatedAnchors.map((anchor, index) => {
      const patch = new Group()
      const pathAnchorNormal = new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta)
      const { pos, quaternion } = getPlacementTransform(
        pathAnchorNormal,
        this.planetRadius,
        'grassLayer',
      )

      patch.position.copy(pos)
      patch.quaternion.copy(quaternion)
      patch.scale.setScalar(anchor.scale + index * 0.005)
      patch.userData.pathAnchorNormal = pathAnchorNormal
      patch.visible = false

      return patch
    })
  }

  private createFlowerBushAnchors() {
    return FLOWER_BUSH_BASE_ANCHORS.map((anchor) => {
      const flowerBush = new Group()
      this.applyFlowerBushPlacement(flowerBush, anchor)
      flowerBush.visible = false

      return flowerBush
    })
  }

  private createLowPolyFlowerAnchors() {
    return LOW_POLY_FLOWER_BASE_GRASS_PATCH_INDICES.map((_, index) => {
      const flower = new Group()
      this.applyLowPolyFlowerPlacement(flower, index)
      flower.visible = false

      return flower
    })
  }

  private getFlowerPlacementVariant(dayCount: number): FlowerPlacementVariant {
    return dayCount >= RABBIT_NEIGHBOR_TREE_REPLACEMENT_DAY ? 'treeAvoided' : 'base'
  }

  private getActiveFlowerBushAnchors() {
    return this.currentFlowerPlacementVariant === 'treeAvoided'
      ? FLOWER_BUSH_TREE_AVOIDING_ANCHORS
      : FLOWER_BUSH_BASE_ANCHORS
  }

  private getActiveLowPolyFlowerGrassPatchIndices() {
    return this.currentFlowerPlacementVariant === 'treeAvoided'
      ? LOW_POLY_FLOWER_TREE_AVOIDING_GRASS_PATCH_INDICES
      : LOW_POLY_FLOWER_BASE_GRASS_PATCH_INDICES
  }

  private applyFlowerBushPlacement(
    flowerBush: Group,
    anchor: { phi: number; theta: number; scale: number },
  ) {
    const { pos, quaternion } = getPlacementTransform(
      new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
      this.planetRadius,
      'bush',
    )

    flowerBush.position.copy(pos)
    flowerBush.quaternion.copy(quaternion)
    flowerBush.scale.setScalar(anchor.scale * FLOWER_BUSH_MODEL_SCALE_FACTOR)
  }

  private updateFlowerBushPlacements() {
    const anchors = this.getActiveFlowerBushAnchors()
    this.flowerBushes.forEach((flowerBush, index) => {
      const anchor = anchors[index]
      if (!anchor) return
      this.applyFlowerBushPlacement(flowerBush, anchor)
    })
  }

  private applyLowPolyFlowerPlacement(flower: Group, index: number) {
    const grassPatchIndex =
      this.getActiveLowPolyFlowerGrassPatchIndices()[index] ??
      LOW_POLY_FLOWER_BASE_GRASS_PATCH_INDICES[index] ??
      0
    const grassPatch = this.grassPatches[grassPatchIndex]
    const pathAnchorNormal =
      (grassPatch?.userData.pathAnchorNormal as Vector3 | undefined)?.clone() ?? new Vector3(0, 1, 0)
    const { pos, quaternion } = getSurfaceTransformWithClearance(
      pathAnchorNormal,
      this.planetRadius,
      LOW_POLY_FLOWER_SURFACE_CLEARANCE,
    )

    flower.position.copy(pos)
    flower.quaternion.copy(quaternion)
    flower.userData.grassPatchIndex = grassPatchIndex
    flower.userData.pathAnchorNormal = pathAnchorNormal
  }

  private updateLowPolyFlowerPlacements() {
    this.lowPolyFlowers.forEach((flower, index) => {
      this.applyLowPolyFlowerPlacement(flower, index)
    })
  }

  private getDeterministicFlowerUnit(index: number) {
    const seed = Math.sin((index + 1) * 12.9898 + 78.233) * 43758.5453
    return seed - Math.floor(seed)
  }

  private getLowPolyFlowerVariant(index: number): LowPolyFlowerVariant {
    const variants: LowPolyFlowerVariant[] = ['upright', 'wide', 'lean']
    return variants[Math.floor(this.getDeterministicFlowerUnit(index) * variants.length)] ?? 'upright'
  }

  private getLowPolyFlowerScale(index: number) {
    return 0.94 + this.getDeterministicFlowerUnit(index + 11) * 0.12
  }

  private getLowPolyFlowerYaw(index: number) {
    return this.getDeterministicFlowerUnit(index + 23) * Math.PI * 2
  }

  private attachGrassPatchInstances() {
    this.grassPatches.forEach((patch, index) => {
      patch.clear()
      if (!this.grassPatchTemplate) return

      const instance = this.grassPatchTemplate.clone(true)
      instance.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const material = child.material
        if (!(material instanceof MeshStandardMaterial)) return
        child.material = material.clone()
        child.material.color.set(new Color('#a7db86'))
        child.material.emissive.set(new Color('#4f7f36'))
        child.material.emissiveIntensity = 0.22
      })
      instance.rotation.y = index * 0.9
      patch.add(instance)
    })
  }

  private createMatteTreeMaterial(material: Material) {
    if (!(material instanceof MeshStandardMaterial)) return material

    const matteMaterial = material.clone()
    matteMaterial.metalness = 0
    matteMaterial.roughness = 1
    matteMaterial.envMapIntensity = 0
    matteMaterial.needsUpdate = true

    return matteMaterial
  }

  private applyMatteTreeMaterial(treeInstance: Group) {
    treeInstance.traverse((child) => {
      if (!(child instanceof Mesh)) return

      const material = child.material
      if (Array.isArray(material)) {
        child.material = material.map((entry) => this.createMatteTreeMaterial(entry))
        return
      }

      child.material = this.createMatteTreeMaterial(material)
    })
  }

  private addMatteTreeInstance(tree: Group, assetKey: string, instance: Group) {
    tree.userData.treeAssetKey = assetKey
    this.applyMatteTreeMaterial(instance)
    tree.add(instance)
  }

  private attachTreeInstances() {
    const treeHeights =
      this.currentTreeModelVariant === 'refined' ? REFINED_TREE_TARGET_HEIGHTS : BASE_TREE_TARGET_HEIGHTS

    this.trees.forEach((tree, index) => {
      tree.clear()
      tree.userData.treeModelVariant = this.currentTreeModelVariant
      tree.userData.treeAssetKey = 'leafy'
      if (index === 2 && this.currentRabbitNeighborTreeVariant === 'largestCanopy') {
        this.addMatteTreeInstance(
          tree,
          'lowpoly-tree',
          createLowpolyTreeInstance({
            targetHeight: treeHeights.wide,
            rotationY: 0.35,
          }),
        )
        return
      }
      if (index === 2) {
        this.addMatteTreeInstance(
          tree,
          'wide',
          createLowPolyWideTreeInstance({
            targetHeight: treeHeights.wide,
            rotationY: 0.35,
          }),
        )
        return
      }
      if (index === 1 && this.currentRabbitNeighborTreeVariant === 'largestCanopy') {
        this.addMatteTreeInstance(
          tree,
          'lowpoly-tree',
          createLowpolyTreeInstance({
            targetHeight: treeHeights.rightTall,
            rotationY: index * 0.9,
          }),
        )
        return
      }
      if (index === 3 && this.currentRabbitNeighborTreeVariant === 'largestCanopy') {
        this.addMatteTreeInstance(
          tree,
          'leaf-tree',
          createLeafTreeInstance({
            targetHeight: treeHeights.farTall * 1.8,
            rotationY: 0.2,
          }),
        )
        return
      }
      if (index === 0 && this.currentRabbitNeighborTreeVariant === 'largestCanopy') {
        this.addMatteTreeInstance(
          tree,
          'largest-canopy',
          createLargestCanopyTreeInstance({
            targetHeight: treeHeights.leftTall * RABBIT_NEIGHBOR_TREE_HEIGHT_MULTIPLIER,
            rotationY: index * 0.9,
          }),
        )
        return
      }

      this.addMatteTreeInstance(
        tree,
        'leafy',
        createLeafyTreeInstance({
          targetHeight:
            index === 0
              ? treeHeights.leftTall
              : index === 1
                ? treeHeights.rightTall
                : treeHeights.farTall,
          rotationY: index * 0.9,
        }),
      )
    })
  }

  private attachFlowerBushInstances() {
    const paletteVariants: FlowerBushPaletteVariant[] = ['pink', 'yellow', 'blue']

    this.flowerBushes.forEach((flowerBush, index) => {
      flowerBush.clear()
      flowerBush.add(
        createFlowerBushInstance({
          targetHeight: 1.02,
          rotationY: index * 0.72,
          paletteVariant: paletteVariants[index % paletteVariants.length],
        }),
      )
    })
  }

  private attachLowPolyFlowerInstances() {
    this.lowPolyFlowers.forEach((flower, index) => {
      flower.clear()
      flower.add(
        createLowPolyFlowerInstance({
          targetHeight: LOW_POLY_FLOWER_TARGET_HEIGHT * this.getLowPolyFlowerScale(index),
          rotationY: this.getLowPolyFlowerYaw(index),
          variant: this.getLowPolyFlowerVariant(index),
        }),
      )
    })
  }
}
