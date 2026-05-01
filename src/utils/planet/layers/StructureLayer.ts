import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { mats } from '../assets/Materials'
import { getStageFourCabinDayTuning } from '../config/stageFourCabinDayTuning'
import { getSurfaceTransform, getSurfaceTransformWithClearance } from '../math/PlanetMath'
import {
  CAMPFIRE_MODEL_TARGET_HEIGHT,
  CAMPFIRE_MODEL_YAW,
  CAMPFIRE_STRUCTURE_RADIUS_OFFSET,
  CAMPFIRE_SURFACE_PHI,
  CAMPFIRE_SURFACE_THETA,
} from './campfirePlacement'
import type { LayerController, LayerUpdateInput } from './contracts'
import {
  getFirstRevealedWoodPlankIndex,
  getWoodPlankPathTangent,
  getWoodPlankSurfaceNormal,
} from './woodPlankPath'

type StructureLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

type CabinWindowMaterial = MeshLambertMaterial | MeshStandardMaterial

const CAMPFIRE_MODEL_SCALE_FACTOR = 0.95
const TENT_MODEL_TARGET_HEIGHT = 0.7
const TENT_SURFACE_CLEARANCE = 0.018
const TENT_PATH_BACK_OFFSET = -0.45
const TENT_SIDE_OFFSET = 0.12
const TENT_GRASS_CLEARANCE_ANGLE = 0.24
const TENT_RIGHT_GRASS_OFFSET = 0.14
const WOODEN_FENCE_MODEL_TARGET_HEIGHT = 0.58
const WOODEN_FENCE_SURFACE_CLEARANCE = 0.02
const CABIN_MODEL_TARGET_HEIGHT = 1.5
const CABIN_TRANSITION_START_DAY = 22
const CABIN_TRANSITION_END_DAY = 28
const CABIN_STAGE_END_DAY = 45
const CABIN_SURFACE_CLEARANCE_MICRO_FACTOR = 1 / 6
const CABIN_INSTANCE_SINK_OFFSET = 0.45
const CABIN_SURFACE_CLEARANCE_BASELINE =
  getStageFourCabinDayTuning(CABIN_TRANSITION_START_DAY).surfaceClearance

export function getCabinPlacementData(planetRadius: number) {
  const plankIndex = getFirstRevealedWoodPlankIndex()
  const plankNormal = getWoodPlankSurfaceNormal(plankIndex)
  const pathTangent = getWoodPlankPathTangent(plankIndex)
  const { pos: plankSurfacePos } = getSurfaceTransformWithClearance(plankNormal, planetRadius)
  const leftDirection = plankNormal.clone().cross(pathTangent).normalize()
  const tentAnchorPos = plankSurfacePos
    .clone()
    .addScaledVector(pathTangent, -TENT_PATH_BACK_OFFSET)
    .addScaledVector(leftDirection, TENT_SIDE_OFFSET)

  return {
    plankNormal,
    leftDirection,
    tentSurfaceNormal: tentAnchorPos.normalize(),
  }
}

function getCabinSurfaceClearance(surfaceClearance: number) {
  return (
    TENT_SURFACE_CLEARANCE +
    Math.min(
      0,
      CABIN_SURFACE_CLEARANCE_BASELINE - surfaceClearance,
    ) *
      CABIN_SURFACE_CLEARANCE_MICRO_FACTOR
  )
}

export function isGrassPatchBlockedByTent(normal: Vector3, dayCount: number, planetRadius: number) {
  if (dayCount < 18) return false

  const safeNormal = normal.clone().normalize()
  const { leftDirection, tentSurfaceNormal } = getCabinPlacementData(planetRadius)
  const rightTentSurfaceNormal = tentSurfaceNormal
    .clone()
    .addScaledVector(leftDirection, -TENT_RIGHT_GRASS_OFFSET)
    .normalize()

  return (
    safeNormal.angleTo(tentSurfaceNormal) <= TENT_GRASS_CLEARANCE_ANGLE ||
    safeNormal.angleTo(rightTentSurfaceNormal) <= TENT_GRASS_CLEARANCE_ANGLE
  )
}

export class StructureLayer implements LayerController {
  id = 'structure'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private campfire: Group
  private campfireTemplate: Group | null = null
  private campfireLoader = new GLTFLoader(new LoadingManager())
  private campfireLoadPromise: Promise<void> | null = null
  private tent: Group
  private tentTemplate: Group | null = null
  private tentLoader = new GLTFLoader(new LoadingManager())
  private tentLoadPromise: Promise<void> | null = null
  private cabinTemplate: Group | null = null
  private cabinLoader = new GLTFLoader(new LoadingManager())
  private cabinLoadPromise: Promise<void> | null = null
  private woodenFenceTemplate: Group | null = null
  private woodenFenceLoader = new GLTFLoader(new LoadingManager())
  private woodenFenceLoadPromise: Promise<void> | null = null
  private woodenFences: Group[] = []
  private cabinWindowMaterials: CabinWindowMaterial[] = []
  private hutFull: Group
  private windmill: Group
  private windmillRotor: Group
  private bench: Group
  private swing: Group

  constructor(options: StructureLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.campfire = this.createCampfire()
    this.tent = this.createTent()
    this.woodenFences = this.createWoodenFenceAnchors()
    this.hutFull = this.createHutFull()
    this.windmill = this.createWindmill()
    this.windmillRotor = this.windmill.children[1] as Group
    this.bench = this.createBench()
    this.swing = this.createSwing()

    this.group.add(
      this.campfire,
      this.tent,
      ...this.woodenFences,
      this.hutFull,
      this.windmill,
      this.bench,
      this.swing,
    )
  }

  preload(): Promise<void> {
    return Promise.all([
      this.ensureCampfireTemplate(),
      this.ensureTentTemplate(),
      this.ensureCabinTemplate(),
      this.ensureWoodenFenceTemplate(),
    ]).then(() => undefined)
  }

  private ensureCampfireTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.campfireLoadPromise) {
        this.campfireTemplate = new Group()
        this.attachCampfireInstance()
        this.campfireLoadPromise = Promise.resolve()
      }

      return this.campfireLoadPromise
    }

    if (!this.campfireLoadPromise) {
      const campfireUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/campfire/scene.gltf', globalThis.location.origin).toString()
          : '/models/campfire/scene.gltf'

      this.campfireLoadPromise = new Promise((resolve, reject) => {
        this.campfireLoader.load(
          campfireUrl,
          (gltf) => {
            this.campfireTemplate = gltf.scene.clone(true)
            this.attachCampfireInstance()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.campfireLoadPromise
  }

  private ensureTentTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.tentLoadPromise) {
        this.tentTemplate = new Group()
        this.attachTentInstance()
        this.tentLoadPromise = Promise.resolve()
      }

      return this.tentLoadPromise
    }

    if (!this.tentLoadPromise) {
      const tentUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/low-poly_tent/scene.gltf', globalThis.location.origin).toString()
          : '/models/low-poly_tent/scene.gltf'

      this.tentLoadPromise = new Promise((resolve, reject) => {
        this.tentLoader.load(
          tentUrl,
          (gltf) => {
            this.tentTemplate = gltf.scene.clone(true)
            this.attachTentInstance()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.tentLoadPromise
  }

  private ensureCabinTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.cabinLoadPromise) {
        const mockCabinTemplate = new Group()
        // 测试环境里补一个最小占位体，保证包围盒、缩放与窗材逻辑都可验证。
        const body = new Mesh(new BoxGeometry(1, 1, 1), mats.houseBody)
        const window = new Mesh(
          new BoxGeometry(0.3, 0.25, 0.02),
          new MeshStandardMaterial({ color: '#00d7ff' }),
        )
        window.position.set(0, 0.15, 0.51)
        mockCabinTemplate.add(body, window)
        this.cabinTemplate = mockCabinTemplate
        this.attachCabinInstance()
        this.cabinLoadPromise = Promise.resolve()
      }

      return this.cabinLoadPromise
    }

    if (!this.cabinLoadPromise) {
      const cabinUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/low_poly_log_cabin/scene.gltf', globalThis.location.origin).toString()
          : '/models/low_poly_log_cabin/scene.gltf'

      this.cabinLoadPromise = new Promise((resolve, reject) => {
        this.cabinLoader.load(
          cabinUrl,
          (gltf) => {
            this.cabinTemplate = gltf.scene.clone(true)
            this.attachCabinInstance()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.cabinLoadPromise
  }

  private ensureWoodenFenceTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.woodenFenceLoadPromise) {
        this.woodenFenceTemplate = new Group()
        this.attachWoodenFenceInstances()
        this.woodenFenceLoadPromise = Promise.resolve()
      }

      return this.woodenFenceLoadPromise
    }

    if (!this.woodenFenceLoadPromise) {
      const woodenFenceUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/wooden_fence/scene.gltf', globalThis.location.origin).toString()
          : '/models/wooden_fence/scene.gltf'

      this.woodenFenceLoadPromise = new Promise((resolve, reject) => {
        this.woodenFenceLoader.load(
          woodenFenceUrl,
          (gltf) => {
            this.woodenFenceTemplate = gltf.scene.clone(true)
            this.attachWoodenFenceInstances()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.woodenFenceLoadPromise
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const shouldShowCabin = this.shouldShowCabin(input)
    const shouldShowWindmill = input.stageIndex >= 5
    const cabinDayTuning = this.getCabinDayTuning(input.dayCount)

    if (input.stageIndex >= 2) {
      // 真实运行链路不会主动预加载，这里在第一次需要展示篝火时懒加载一次。
      void this.ensureCampfireTemplate()
    }

    if (this.shouldShowTent(input)) {
      // 第 18 天帐篷第一次出现时再懒加载，避免第三阶段前半段白白加载模型。
      void this.ensureTentTemplate()
    }
    if (this.getVisibleWoodenFenceCount(input) > 0) {
      // 第 19 天开始按天渐进出现栅栏，首次需要时再懒加载。
      void this.ensureWoodenFenceTemplate()
    }
    if (shouldShowCabin || shouldShowWindmill) {
      // 房屋在第四阶段后半段与第五阶段延续出现，首次需要时再懒加载。
      void this.ensureCabinTemplate()
      this.updateCabinTransform(input.dayCount, cabinDayTuning)
    }

    this.campfire.visible = input.stageIndex >= 2
    this.tent.visible = this.shouldShowTent(input)
    const visibleWoodenFenceCount = this.getVisibleWoodenFenceCount(input)
    for (let i = 0; i < this.woodenFences.length; i += 1) {
      const woodenFence = this.woodenFences[i]
      if (!woodenFence) continue
      woodenFence.visible = i < visibleWoodenFenceCount
    }
    this.hutFull.visible = shouldShowCabin || shouldShowWindmill
    this.windmill.visible = shouldShowWindmill
    this.bench.visible = input.stageIndex >= 5
    this.swing.visible = input.stageIndex >= 5

    this.campfire.scale.setScalar(
      (input.stageIndex === 2 ? 0.9 + input.stageProgress * 0.2 : 1) * CAMPFIRE_MODEL_SCALE_FACTOR,
    )
    this.windmillRotor.rotation.z = shouldShowWindmill ? input.dayCount * 0.12 : 0
    this.bench.scale.setScalar(input.stageIndex >= 5 ? 0.9 + input.stageProgress * 0.1 : 1)
    this.swing.scale.setScalar(input.stageIndex >= 5 ? 0.9 + input.stageProgress * 0.1 : 1)
  }

  private shouldShowCabin(input: LayerUpdateInput) {
    return input.stageIndex >= 4 && input.dayCount >= CABIN_TRANSITION_START_DAY && input.dayCount <= CABIN_STAGE_END_DAY
  }

  private shouldShowTent(input: LayerUpdateInput) {
    return input.dayCount >= 18 && input.stageIndex >= 3 && input.dayCount < CABIN_TRANSITION_START_DAY
  }

  private getVisibleWoodenFenceCount(input: LayerUpdateInput) {
    if (input.stageIndex < 3) return 0

    const day = Math.floor(input.dayCount)
    if (day < 19) return 0
    if (day === 19) return 1
    if (day === 20) return 2
    return 4
  }

  private getCabinDayTuning(dayCount: number) {
    if (dayCount <= CABIN_TRANSITION_END_DAY) {
      return getStageFourCabinDayTuning(dayCount)
    }

    return getStageFourCabinDayTuning(CABIN_TRANSITION_END_DAY)
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
  }

  private createCampfire() {
    const group = new Group()
    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA),
      this.planetRadius + CAMPFIRE_STRUCTURE_RADIUS_OFFSET,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    group.visible = false

    return group
  }

  private attachCampfireInstance() {
    this.campfire.clear()
    if (!this.campfireTemplate) return

    const instance = this.campfireTemplate.clone(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const safeHeight = Math.max(size.y, 0.001)
    const scale = CAMPFIRE_MODEL_TARGET_HEIGHT / safeHeight

    instance.scale.setScalar(scale)
    instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    instance.rotation.y = CAMPFIRE_MODEL_YAW

    this.campfire.add(instance)
  }

  private createTent() {
    const group = new Group()
    const { plankNormal, tentSurfaceNormal } = getCabinPlacementData(this.planetRadius)
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      tentSurfaceNormal,
      this.planetRadius,
      TENT_SURFACE_CLEARANCE,
    )

    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    this.alignFacingToSurfaceTarget(group, surfaceNormal, plankNormal)
    group.visible = false

    return group
  }

  private alignFacingToSurfaceTarget(group: Group, surfaceNormal: Vector3, targetNormal: Vector3) {
    const facingTarget = targetNormal.clone().projectOnPlane(surfaceNormal)
    if (facingTarget.lengthSq() <= 1e-6) return

    facingTarget.normalize()
    const currentFacing = new Vector3(0, 0, 1).applyQuaternion(group.quaternion).projectOnPlane(surfaceNormal)
    if (currentFacing.lengthSq() <= 1e-6) return

    currentFacing.normalize()
    const angle = Math.atan2(
      currentFacing.clone().cross(facingTarget).dot(surfaceNormal),
      currentFacing.dot(facingTarget),
    )
    group.rotateY(angle)
  }

  private attachTentInstance() {
    this.tent.clear()
    if (!this.tentTemplate) return

    const instance = this.tentTemplate.clone(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const safeHeight = Math.max(size.y, 0.001)
    const scale = TENT_MODEL_TARGET_HEIGHT / safeHeight

    instance.scale.setScalar(scale)
    instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)

    this.tent.add(instance)
  }

  private getCabinWindowWarmth(dayCount: number) {
    if (dayCount < CABIN_TRANSITION_START_DAY) return 0
    if (dayCount <= CABIN_TRANSITION_END_DAY) {
      return getStageFourCabinDayTuning(dayCount).windowWarmth
    }

    return getStageFourCabinDayTuning(CABIN_TRANSITION_END_DAY).windowWarmth
  }

  private isSupportedCabinWindowMaterial(
    material: unknown,
  ): material is CabinWindowMaterial {
    return material instanceof MeshLambertMaterial || material instanceof MeshStandardMaterial
  }

  private isCabinWindowMaterial(material: CabinWindowMaterial) {
    const color = material.color
    return color.b > 0.75 && color.g > 0.55 && color.r < 0.2
  }

  private createCabinWindowGlowMaterial(source: CabinWindowMaterial) {
    const material = source.clone()
    material.color = new Color('#8fd7ff')
    material.emissive = new Color('#ffb25a')
    material.emissiveIntensity = 0

    return material
  }

  private syncCabinWindowWarmth(dayCount: number) {
    const warmth = this.getCabinWindowWarmth(dayCount)
    this.cabinWindowMaterials.forEach((material) => {
      material.emissiveIntensity = 0.2 + warmth * 3.2
    })
  }

  private updateCabinTransform(
    dayCount: number,
    cabinDayTuning = getStageFourCabinDayTuning(CABIN_TRANSITION_END_DAY),
  ) {
    const { plankNormal, tentSurfaceNormal } = getCabinPlacementData(this.planetRadius)
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      tentSurfaceNormal,
      this.planetRadius,
      getCabinSurfaceClearance(cabinDayTuning.surfaceClearance),
    )

    this.hutFull.position.copy(pos)
    this.hutFull.quaternion.copy(quaternion)
    this.alignFacingToSurfaceTarget(this.hutFull, surfaceNormal, plankNormal)
    this.hutFull.rotateY(cabinDayTuning.yawOffset)
    this.hutFull.scale.setScalar(cabinDayTuning.houseScale)
    this.syncCabinWindowWarmth(dayCount)
  }

  private attachCabinInstance() {
    this.hutFull.clear()
    this.cabinWindowMaterials = []
    if (!this.cabinTemplate) return

    const instance = this.cabinTemplate.clone(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const safeHeight = Math.max(size.y, 0.001)
    const scale = CABIN_MODEL_TARGET_HEIGHT / safeHeight

    instance.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const material = child.material
      if (Array.isArray(material)) return
      if (!this.isSupportedCabinWindowMaterial(material)) return
      if (!this.isCabinWindowMaterial(material)) return

      const emissiveMaterial = this.createCabinWindowGlowMaterial(material)
      child.material = emissiveMaterial
      this.cabinWindowMaterials.push(emissiveMaterial)
    })

    instance.scale.setScalar(scale)
    instance.position.set(
      -center.x * scale,
      -bounds.min.y * scale - CABIN_INSTANCE_SINK_OFFSET,
      -center.z * scale,
    )

    this.hutFull.add(instance)
  }

  private createWoodenFenceAnchors() {
    // 勿动
    const anchors = [
      // 前两个是蓝花丛侧两个栅栏，后两个是粉花丛侧两个栅栏
      { phi: 0.66, theta: 2.66, rotationY: 0.86 },
      { phi: 0.68, theta: 3.28, rotationY: 1.98 },
      { phi: -0.73, theta: 2.42, rotationY: 0.85 },
      { phi: -0.63, theta: 1.92, rotationY: 0.08 },
    ]

    return anchors.map((anchor) => {
      const woodenFence = new Group()
      const { pos, quaternion } = getSurfaceTransformWithClearance(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius,
        WOODEN_FENCE_SURFACE_CLEARANCE,
      )
      woodenFence.position.copy(pos)
      woodenFence.quaternion.copy(quaternion)
      woodenFence.rotateY(anchor.rotationY)
      woodenFence.visible = false

      return woodenFence
    })
  }

  private attachWoodenFenceInstances() {
    this.woodenFences.forEach((woodenFence) => {
      woodenFence.clear()
      if (!this.woodenFenceTemplate) return

      const instance = this.woodenFenceTemplate.clone(true)
      const bounds = new Box3().setFromObject(instance)
      const size = bounds.getSize(new Vector3())
      const center = bounds.getCenter(new Vector3())
      const safeHeight = Math.max(size.y, 0.001)
      const scale = WOODEN_FENCE_MODEL_TARGET_HEIGHT / safeHeight

      instance.scale.setScalar(scale)
      instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)

      woodenFence.add(instance)
    })
  }

  private createHutFull() {
    const group = new Group()
    const cabinDayTuning = getStageFourCabinDayTuning(CABIN_TRANSITION_END_DAY)
    const { plankNormal, tentSurfaceNormal } = getCabinPlacementData(this.planetRadius)
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      tentSurfaceNormal,
      this.planetRadius,
      getCabinSurfaceClearance(cabinDayTuning.surfaceClearance),
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    this.alignFacingToSurfaceTarget(group, surfaceNormal, plankNormal)
    group.rotateY(cabinDayTuning.yawOffset)
    group.scale.setScalar(cabinDayTuning.houseScale)
    this.syncCabinWindowWarmth(CABIN_TRANSITION_END_DAY)
    group.visible = false

    return group
  }

  private createWindmill() {
    const group = new Group()
    const tower = new Mesh(new CylinderGeometry(0.05, 0.09, 1.1, 6), mats.houseBody)
    tower.position.y = 0.55

    const rotor = new Group()
    rotor.position.set(0, 1.08, 0)

    for (let i = 0; i < 4; i += 1) {
      const blade = new Mesh(new BoxGeometry(0.12, 0.5, 0.03), mats.blade)
      blade.position.y = 0.24
      blade.rotation.z = (Math.PI / 2) * i
      rotor.add(blade)
    }

    group.add(tower, rotor)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.18, 4.75),
      this.planetRadius + 0.04,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    group.visible = false

    return group
  }

  private createBench() {
    const group = new Group()
    const seat = new Mesh(new BoxGeometry(0.4, 0.05, 0.14), mats.houseBody)
    seat.position.y = 0.24
    const back = new Mesh(new BoxGeometry(0.4, 0.16, 0.04), mats.houseBody)
    back.position.set(0, 0.36, -0.05)
    const legLeft = new Mesh(new BoxGeometry(0.04, 0.2, 0.04), mats.trunk)
    legLeft.position.set(-0.14, 0.1, 0)
    const legRight = new Mesh(new BoxGeometry(0.04, 0.2, 0.04), mats.trunk)
    legRight.position.set(0.14, 0.1, 0)

    group.add(seat, back, legLeft, legRight)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.18, 3.5),
      this.planetRadius + 0.02,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    group.visible = false

    return group
  }

  private createSwing() {
    const group = new Group()
    const poleLeft = new Mesh(new CylinderGeometry(0.025, 0.03, 0.7, 6), mats.trunk)
    poleLeft.position.set(-0.18, 0.36, 0)
    poleLeft.rotation.z = 0.22
    const poleRight = new Mesh(new CylinderGeometry(0.025, 0.03, 0.7, 6), mats.trunk)
    poleRight.position.set(0.18, 0.36, 0)
    poleRight.rotation.z = -0.22
    const topBeam = new Mesh(new CylinderGeometry(0.025, 0.025, 0.45, 6), mats.trunk)
    topBeam.position.set(0, 0.68, 0)
    topBeam.rotation.z = Math.PI / 2
    const ropeLeft = new Mesh(new CylinderGeometry(0.008, 0.008, 0.32, 4), mats.houseBody)
    ropeLeft.position.set(-0.07, 0.46, 0)
    const ropeRight = new Mesh(new CylinderGeometry(0.008, 0.008, 0.32, 4), mats.houseBody)
    ropeRight.position.set(0.07, 0.46, 0)
    const seat = new Mesh(new BoxGeometry(0.2, 0.04, 0.08), mats.houseRoof)
    seat.position.set(0, 0.28, 0)

    group.add(poleLeft, poleRight, topBeam, ropeLeft, ropeRight, seat)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.2, 5.35),
      this.planetRadius + 0.02,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    group.visible = false

    return group
  }
}
