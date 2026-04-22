import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  SphereGeometry,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { mats } from '../assets/Materials'
import { getPlacementTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type VegetationLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

export class VegetationLayer implements LayerController {
  id = 'vegetation'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private sprout: Group
  private bushes: Group[] = []
  private trees: Group[] = []
  private grassPatches: Group[] = []
  private grassPatchTemplate: Group | null = null
  private grassPatchLoader = new GLTFLoader(new LoadingManager())
  private grassPatchLoadPromise: Promise<void> | null = null
  private meadowPatches: Group[] = []
  private meadowPatchTemplate: Group | null = null
  private meadowPatchLoader = new GLTFLoader(new LoadingManager())
  private meadowPatchLoadPromise: Promise<void> | null = null

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

    this.meadowPatches = this.createMeadowPatchAnchors()
    this.meadowPatches.forEach((item) => this.group.add(item))
  }

  preload(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.grassPatchLoadPromise) {
        this.grassPatchTemplate = new Group()
        this.attachGrassPatchInstances()
        this.grassPatchLoadPromise = Promise.resolve()
      }
      if (!this.meadowPatchLoadPromise) {
        this.meadowPatchTemplate = new Group()
        this.attachMeadowPatchInstances()
        this.meadowPatchLoadPromise = Promise.resolve()
      }
      return Promise.all([this.grassPatchLoadPromise, this.meadowPatchLoadPromise]).then(() => undefined)
    }

    if (!this.grassPatchLoadPromise) {
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

    if (!this.meadowPatchLoadPromise) {
      const meadowPatchUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/patch_of_grass/scene.gltf', globalThis.location.origin).toString()
          : '/models/patch_of_grass/scene.gltf'

      this.meadowPatchLoadPromise = new Promise((resolve, reject) => {
        this.meadowPatchLoader.load(
          meadowPatchUrl,
          (gltf) => {
            this.meadowPatchTemplate = gltf.scene.clone(true)
            this.attachMeadowPatchInstances()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return Promise.all([this.grassPatchLoadPromise, this.meadowPatchLoadPromise]).then(() => undefined)
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const isLegacyStage = input.stageIndex >= 3
    this.group.visible = !isLegacyStage

    if (isLegacyStage) return

    const stageOneDay = input.stageIndex === 1 ? Math.max(1, Math.floor(input.dayCount)) : null
    const stageTwoDay = input.stageIndex === 2 ? Math.max(4, Math.floor(input.dayCount)) : null

    this.sprout.visible = true
    if (stageOneDay != null) {
      // 第 1-3 天让幼苗有明确长高过程，便于用户一眼感知变化。
      const stageOneSproutScale = stageOneDay === 1 ? 0.62 : stageOneDay === 2 ? 0.72 : 0.86
      this.sprout.scale.setScalar(stageOneSproutScale)
    } else {
      this.sprout.scale.setScalar(0.55 + input.stageProgress * 0.45)
    }

    const visibleGrassPatchCount =
      stageOneDay == null ? 0 : stageOneDay === 1 ? 0 : stageOneDay === 2 ? 8 : 16

    if (visibleGrassPatchCount > 0) {
      // 真实运行链路不会手动调用 preload，这里在草簇首次需要显示时懒加载一次。
      void this.preload()
    }

    for (let i = 0; i < this.grassPatches.length; i += 1) {
      const patch = this.grassPatches[i]
      if (!patch) continue
      patch.visible = i < visibleGrassPatchCount
    }

    const visibleMeadowPatchCount = stageTwoDay == null ? 0 : stageTwoDay === 4 ? 2 : 4

    if (visibleMeadowPatchCount > 0) {
      // 第二阶段第 4-5 天用面积更大的草丛块替代第一阶段的小草簇表现。
      void this.preload()
    }

    for (let i = 0; i < this.meadowPatches.length; i += 1) {
      const patch = this.meadowPatches[i]
      if (!patch) continue
      patch.visible = i < visibleMeadowPatchCount
    }

    const visibleBushCount =
      input.stageIndex === 1
        ? 0
        : stageTwoDay === 4
          ? 2
          : stageTwoDay === 5
            ? 4
            : 2 + Math.round(input.stageProgress * 2)
    for (let i = 0; i < this.bushes.length; i += 1) {
      const bush = this.bushes[i]
      if (!bush) continue
      bush.visible = i < visibleBushCount
      bush.scale.setScalar(0.75 + input.stageProgress * 0.25)
    }

    const visibleTreeCount =
      input.stageIndex === 1 ? 0 : stageTwoDay === 4 ? 0 : 1 + Math.round(input.stageProgress * 2)
    for (let i = 0; i < this.trees.length; i += 1) {
      const tree = this.trees[i]
      if (!tree) continue
      tree.visible = i < visibleTreeCount
      tree.scale.setScalar(0.7 + input.stageProgress * 0.3)
    }
  }

  deactivate() {
    this.group.visible = false
    this.grassPatches.forEach((patch) => {
      patch.visible = false
    })
    this.meadowPatches.forEach((patch) => {
      patch.visible = false
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
    const anchors = [
      { phi: 0.2, theta: 0.45 },
      { phi: 0.18, theta: 1.6 },
      { phi: 0.24, theta: 2.4 },
      { phi: 0.16, theta: 5.1 },
    ]

    return anchors.map((anchor) => {
      const bush = new Group()
      const body = new Mesh(new SphereGeometry(0.16, 10, 10), mats.leaves2)
      body.scale.set(1.1, 0.8, 1.1)
      body.position.y = 0.14
      bush.add(body)

      const { pos, quaternion } = getPlacementTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        'bush',
      )
      bush.position.copy(pos)
      bush.quaternion.copy(quaternion)
      bush.visible = false

      return bush
    })
  }

  private createTrees() {
    const anchors = [
      { phi: 0.22, theta: 0.8, canopy: mats.leaves1 },
      { phi: 0.2, theta: 2.7, canopy: mats.leaves2 },
      { phi: 0.24, theta: 4.8, canopy: mats.leaves1 },
    ]

    return anchors.map((anchor) => {
      const tree = new Group()
      const trunk = new Mesh(new CylinderGeometry(0.04, 0.06, 0.42, 6), mats.trunk)
      trunk.position.y = 0.2

      const canopy = new Mesh(new ConeGeometry(0.24, 0.42, 8), anchor.canopy)
      canopy.position.y = 0.54

      tree.add(trunk, canopy)

      const { pos, quaternion } = getPlacementTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        'tree',
      )
      tree.position.copy(pos)
      tree.quaternion.copy(quaternion)
      tree.visible = false

      return tree
    })
  }

  private createGrassPatchAnchors() {
    const anchors = [
      { phi: 0.07, theta: 0.15, scale: 0.28 },
      { phi: 0.09, theta: 0.95, scale: 0.26 },
      { phi: 0.11, theta: 1.85, scale: 0.3 },
      { phi: 0.16, theta: 0.5, scale: 0.27 },
      { phi: 0.18, theta: 1.45, scale: 0.32 },
      { phi: 0.2, theta: 2.35, scale: 0.29 },
      { phi: 0.13, theta: 5.55, scale: 0.25 },
      { phi: 0.1, theta: 2.8, scale: 0.27 },
      { phi: 0.14, theta: 3.45, scale: 0.29 },
      { phi: 0.17, theta: 4.2, scale: 0.31 },
      { phi: 0.12, theta: 4.95, scale: 0.28 },
      { phi: 0.19, theta: 5.75, scale: 0.3 },
      { phi: 0.15, theta: 3.1, scale: 0.28 },
      { phi: 0.16, theta: 3.8, scale: 0.3 },
      { phi: 0.14, theta: 4.55, scale: 0.29 },
      { phi: 0.11, theta: 5.3, scale: 0.27 },
    ]

    return anchors.map((anchor, index) => {
      const patch = new Group()
      const { pos, quaternion } = getPlacementTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        'grassLayer',
      )

      patch.position.copy(pos)
      patch.quaternion.copy(quaternion)
      patch.scale.setScalar(anchor.scale + index * 0.005)
      patch.visible = false

      return patch
    })
  }

  private attachGrassPatchInstances() {
    this.grassPatches.forEach((patch, index) => {
      patch.clear()
      if (!this.grassPatchTemplate) return

      const instance = this.grassPatchTemplate.clone(true)
      instance.rotation.y = index * 0.9
      patch.add(instance)
    })
  }

  private createMeadowPatchAnchors() {
    const anchors = [
      { phi: 0.2, theta: 0.7, scale: 0.035 },
      { phi: 0.22, theta: 1.95, scale: 0.032 },
      { phi: 0.18, theta: 3.35, scale: 0.034 },
      { phi: 0.24, theta: 4.7, scale: 0.033 },
    ]

    return anchors.map((anchor, index) => {
      const patch = new Group()
      const { pos, quaternion } = getPlacementTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        'grassLayer',
      )

      patch.position.copy(pos)
      patch.quaternion.copy(quaternion)
      patch.scale.setScalar(anchor.scale + index * 0.002)
      patch.visible = false

      return patch
    })
  }

  private attachMeadowPatchInstances() {
    this.meadowPatches.forEach((patch, index) => {
      patch.clear()
      if (!this.meadowPatchTemplate) return

      const instance = this.meadowPatchTemplate.clone(true)
      instance.rotation.y = index * 0.7
      patch.add(instance)
    })
  }
}
