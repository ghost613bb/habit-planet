import {
  AnimationClip,
  AnimationMixer,
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

export type CabinVariant = 'legacy' | 'wooden'
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
const CABIN_MODEL_SWITCH_DAY = 60
const CABIN_TRANSITION_START_DAY = 22
const CABIN_TRANSITION_END_DAY = 28
const CABIN_STAGE_END_DAY = 45
const LEGACY_CABIN_MODEL_PATH = '/models/low_poly_log_cabin/scene.gltf'
const WOODEN_CABIN_MODEL_PATH = '/models/low_poly_wooden_cabine/scene.gltf'
const WOODEN_CABIN_INSTANCE_SINK_OFFSET = 0
const WOODEN_CABIN_INSTANCE_OFFSET_X = 0.28
const WOODEN_CABIN_INSTANCE_OFFSET_Z = -0.4
const WOODEN_CABIN_INSTANCE_YAW_OFFSET = -0.25
const LEGACY_CABIN_WINDOW_GLOW_LOCAL_OFFSET_X = 0
const LEGACY_CABIN_WINDOW_GLOW_LOCAL_OFFSET_Z = 0.12
const WOODEN_CABIN_WINDOW_GLOW_LOCAL_OFFSET_X = WOODEN_CABIN_INSTANCE_OFFSET_X
const WOODEN_CABIN_WINDOW_GLOW_LOCAL_OFFSET_Z = WOODEN_CABIN_INSTANCE_OFFSET_Z + 0.18
const RABBIT_APPEAR_START_DAY = 34
const WINDMILL_APPEAR_START_DAY = 36
const WINDMILL_GROWTH_END_DAY = 40
// 控制风车模型最大高度
const WINDMILL_MODEL_TARGET_HEIGHT = 1.18
// 控制第 36 天风车初始缩放
const WINDMILL_GROWTH_START_SCALE = 1
// 控制第 40 天风车最终缩放
const WINDMILL_GROWTH_END_SCALE = 1.8
// 控制风车离地高度
const WINDMILL_SURFACE_CLEARANCE = 0.028
// 控制风车在星球表面的前后位置
const WINDMILL_SURFACE_PHI = 0.30
// 控制风车在星球表面的左右位置
const WINDMILL_SURFACE_THETA = 3.35
// 控制风车水平朝向
const WINDMILL_YAW_OFFSET = 2.58
// 控制风车动画播放速度
const WINDMILL_ANIMATION_SPEED = 0.9
// 控制兔子整体大小
const RABBIT_MODEL_TARGET_HEIGHT = 0.62
// 控制离地高度
const RABBIT_SURFACE_CLEARANCE = 0.016
// 控制前后位置
const RABBIT_FRONT_OFFSET = 0.68
// 控制左右位置
const RABBIT_LEFT_OFFSET = 0.52
// 控制水平朝向
const RABBIT_YAW_OFFSET = -1
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

function rotateCabinLocalOffset(offsetX: number, offsetZ: number, yawOffset: number) {
  return {
    x: offsetX * Math.cos(yawOffset) + offsetZ * Math.sin(yawOffset),
    z: -offsetX * Math.sin(yawOffset) + offsetZ * Math.cos(yawOffset),
  }
}

export function getCabinVariantByDay(dayCount: number): CabinVariant {
  return dayCount >= CABIN_MODEL_SWITCH_DAY ? 'wooden' : 'legacy'
}

export function getCabinWindowGlowNormal(planetRadius: number, dayCount: number) {
  const variant = getCabinVariantByDay(dayCount)
  const { plankNormal, tentSurfaceNormal } = getCabinPlacementData(planetRadius)
  const cabinDayTuning = getStageFourCabinDayTuning(CABIN_TRANSITION_END_DAY)
  const { pos: cabinPos, surfaceNormal } = getSurfaceTransformWithClearance(
    tentSurfaceNormal,
    planetRadius,
    getCabinSurfaceClearance(cabinDayTuning.surfaceClearance),
  )
  const forwardDirection = plankNormal
    .clone()
    .projectOnPlane(surfaceNormal)
    .normalize()
  const rightDirection = surfaceNormal
    .clone()
    .cross(forwardDirection)
    .normalize()
  const localOffset =
    variant === 'wooden'
      ? rotateCabinLocalOffset(
          WOODEN_CABIN_WINDOW_GLOW_LOCAL_OFFSET_X,
          WOODEN_CABIN_WINDOW_GLOW_LOCAL_OFFSET_Z,
          WOODEN_CABIN_INSTANCE_YAW_OFFSET,
        )
      : {
          x: LEGACY_CABIN_WINDOW_GLOW_LOCAL_OFFSET_X,
          z: LEGACY_CABIN_WINDOW_GLOW_LOCAL_OFFSET_Z,
        }

  return cabinPos
    .clone()
    .addScaledVector(rightDirection, localOffset.x)
    .addScaledVector(forwardDirection, localOffset.z)
    .normalize()
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

function getRabbitPlacementData(planetRadius: number) {
  const { plankNormal, leftDirection, tentSurfaceNormal } = getCabinPlacementData(planetRadius)
  const rabbitAnchorPos = tentSurfaceNormal
    .clone()
    .addScaledVector(plankNormal, RABBIT_FRONT_OFFSET)
    .addScaledVector(leftDirection, RABBIT_LEFT_OFFSET)

  return {
    plankNormal,
    rabbitSurfaceNormal: rabbitAnchorPos.normalize(),
  }
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
  private legacyCabinTemplate: Group | null = null
  private woodenCabinTemplate: Group | null = null
  private cabinLoader = new GLTFLoader(new LoadingManager())
  private legacyCabinLoadPromise: Promise<void> | null = null
  private woodenCabinLoadPromise: Promise<void> | null = null
  private activeCabinVariant: CabinVariant | null = null
  private desiredCabinVariant: CabinVariant = 'legacy'
  private woodenFenceTemplate: Group | null = null
  private woodenFenceLoader = new GLTFLoader(new LoadingManager())
  private woodenFenceLoadPromise: Promise<void> | null = null
  private woodenFences: Group[] = []
  private cabinWindowMaterials: CabinWindowMaterial[] = []
  private hutFull: Group
  private rabbit: Group
  private rabbitTemplate: Group | null = null
  private rabbitLoader = new GLTFLoader(new LoadingManager())
  private rabbitLoadPromise: Promise<void> | null = null
  private windmill: Group
  private windmillTemplate: Group | null = null
  private windmillAnimations: AnimationClip[] = []
  private windmillMixer: AnimationMixer | null = null
  private windmillLoader = new GLTFLoader(new LoadingManager())
  private windmillLoadPromise: Promise<void> | null = null
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
    this.rabbit = this.createRabbit()
    this.windmill = this.createWindmill()
    this.swing = this.createSwing()

    this.group.add(
      this.campfire,
      this.tent,
      ...this.woodenFences,
      this.hutFull,
      this.rabbit,
      this.windmill,
      this.swing,
    )
  }

  preload(): Promise<void> {
    return Promise.all([
      this.ensureCampfireTemplate(),
      this.ensureTentTemplate(),
      this.ensureCabinTemplate('legacy'),
      this.ensureCabinTemplate('wooden'),
      this.ensureWoodenFenceTemplate(),
      this.ensureRabbitTemplate(),
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

  private getCabinVariant(dayCount: number): CabinVariant {
    return getCabinVariantByDay(dayCount)
  }

  private getCabinTemplate(variant: CabinVariant) {
    return variant === 'wooden' ? this.woodenCabinTemplate : this.legacyCabinTemplate
  }

  private setCabinTemplate(variant: CabinVariant, template: Group) {
    if (variant === 'wooden') {
      this.woodenCabinTemplate = template
      return
    }

    this.legacyCabinTemplate = template
  }

  private getCabinLoadPromise(variant: CabinVariant) {
    return variant === 'wooden' ? this.woodenCabinLoadPromise : this.legacyCabinLoadPromise
  }

  private setCabinLoadPromise(variant: CabinVariant, loadPromise: Promise<void>) {
    if (variant === 'wooden') {
      this.woodenCabinLoadPromise = loadPromise
      return
    }

    this.legacyCabinLoadPromise = loadPromise
  }

  private getCabinUrl(variant: CabinVariant) {
    const cabinModelPath =
      variant === 'wooden' ? WOODEN_CABIN_MODEL_PATH : LEGACY_CABIN_MODEL_PATH

    return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
      ? new URL(cabinModelPath, globalThis.location.origin).toString()
      : cabinModelPath
  }

  private createMockCabinTemplate(variant: CabinVariant) {
    const mockCabinTemplate = new Group()
    mockCabinTemplate.name = variant === 'wooden' ? 'wooden-cabin-template' : 'legacy-cabin-template'

    // 测试环境里补一个最小占位体，保证包围盒、缩放与窗材逻辑都可验证。
    const bodyWidth = variant === 'wooden' ? 0.92 : 1
    const bodyDepth = variant === 'wooden' ? 0.88 : 1
    const body = new Mesh(new BoxGeometry(bodyWidth, 1, bodyDepth), mats.houseBody)
    const window = new Mesh(
      new BoxGeometry(0.3, 0.25, 0.02),
      new MeshStandardMaterial({ color: '#00d7ff' }),
    )
    window.position.set(0, 0.15, 0.51)
    mockCabinTemplate.add(body, window)

    return mockCabinTemplate
  }

  private syncCabinInstance(variant: CabinVariant) {
    if (this.activeCabinVariant === variant) return

    const cabinTemplate = this.getCabinTemplate(variant)
    if (!cabinTemplate) return

    this.attachCabinInstance(cabinTemplate, variant)
  }

  private ensureCabinTemplate(variant: CabinVariant): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      const existingLoadPromise = this.getCabinLoadPromise(variant)
      if (!existingLoadPromise) {
        this.setCabinTemplate(variant, this.createMockCabinTemplate(variant))
        this.syncCabinInstance(variant)
        this.setCabinLoadPromise(variant, Promise.resolve())
      }

      return this.getCabinLoadPromise(variant) as Promise<void>
    }

    const existingLoadPromise = this.getCabinLoadPromise(variant)
    if (!existingLoadPromise) {
      const cabinLoadPromise = new Promise<void>((resolve, reject) => {
        this.cabinLoader.load(
          this.getCabinUrl(variant),
          (gltf) => {
            this.setCabinTemplate(variant, gltf.scene.clone(true))
            if (this.desiredCabinVariant === variant) {
              this.syncCabinInstance(variant)
            }
            resolve()
          },
          undefined,
          reject,
        )
      })

      this.setCabinLoadPromise(variant, cabinLoadPromise)
    }

    return this.getCabinLoadPromise(variant) as Promise<void>
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

  private ensureRabbitTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.rabbitLoadPromise) {
        const mockRabbitTemplate = new Group()
        const body = new Mesh(new BoxGeometry(0.38, 0.34, 0.28), mats.houseBody)
        body.position.y = 0.17
        const head = new Mesh(new BoxGeometry(0.24, 0.22, 0.22), mats.houseBody)
        head.position.set(0, 0.42, 0.08)
        const leftEar = new Mesh(new BoxGeometry(0.06, 0.22, 0.05), mats.houseRoof)
        leftEar.position.set(-0.05, 0.62, 0.06)
        const rightEar = new Mesh(new BoxGeometry(0.06, 0.22, 0.05), mats.houseRoof)
        rightEar.position.set(0.05, 0.62, 0.06)
        mockRabbitTemplate.add(body, head, leftEar, rightEar)
        this.rabbitTemplate = mockRabbitTemplate
        this.attachRabbitInstance()
        this.rabbitLoadPromise = Promise.resolve()
      }

      return this.rabbitLoadPromise
    }

    if (!this.rabbitLoadPromise) {
      const rabbitUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/bonny__cute_bunny_character/scene.gltf', globalThis.location.origin).toString()
          : '/models/bonny__cute_bunny_character/scene.gltf'

      this.rabbitLoadPromise = new Promise((resolve, reject) => {
        this.rabbitLoader.load(
          rabbitUrl,
          (gltf) => {
            this.rabbitTemplate = gltf.scene.clone(true)
            this.attachRabbitInstance()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.rabbitLoadPromise
  }

  private ensureWindmillTemplate(): Promise<void> {
    const isJsdomEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

    if (isJsdomEnvironment) {
      if (!this.windmillLoadPromise) {
        const mockWindmillTemplate = new Group()
        const tower = new Mesh(new CylinderGeometry(0.06, 0.09, 1.1, 6), mats.houseBody)
        tower.position.y = 0.55
        const rotor = new Group()
        rotor.position.set(0, 0.92, 0.04)

        for (let i = 0; i < 4; i += 1) {
          const blade = new Mesh(new BoxGeometry(0.12, 0.52, 0.03), mats.blade)
          blade.position.y = 0.24
          blade.rotation.z = (Math.PI / 2) * i
          rotor.add(blade)
        }

        mockWindmillTemplate.add(tower, rotor)
        this.windmillTemplate = mockWindmillTemplate
        this.windmillAnimations = []
        this.attachWindmillInstance()
        this.windmillLoadPromise = Promise.resolve()
      }

      return this.windmillLoadPromise
    }

    if (!this.windmillLoadPromise) {
      const windmillUrl =
        typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
          ? new URL('/models/windmill__animated/scene.gltf', globalThis.location.origin).toString()
          : '/models/windmill__animated/scene.gltf'

      this.windmillLoadPromise = new Promise((resolve, reject) => {
        this.windmillLoader.load(
          windmillUrl,
          (gltf) => {
            this.windmillTemplate = gltf.scene.clone(true)
            this.windmillAnimations = gltf.animations.map((clip) => clip.clone())
            this.attachWindmillInstance()
            resolve()
          },
          undefined,
          reject,
        )
      })
    }

    return this.windmillLoadPromise
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const shouldShowCabin = this.shouldShowCabin(input)
    const shouldShowWindmill = this.shouldShowWindmill(input)
    const shouldShowRabbit = this.shouldShowRabbit(input)
    const cabinDayTuning = this.getCabinDayTuning(input.dayCount)
    const cabinVariant = this.getCabinVariant(input.dayCount)

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
      this.desiredCabinVariant = cabinVariant
      void this.ensureCabinTemplate(cabinVariant)
      this.syncCabinInstance(cabinVariant)
      this.updateCabinTransform(input.dayCount, cabinDayTuning)
    }
    if (shouldShowWindmill) {
      // 第 36 天起接入动态风车模型，并在第 40 天前逐步放大。
      void this.ensureWindmillTemplate()
      this.updateWindmillTransform(input.dayCount)
    }
    if (shouldShowRabbit) {
      // 第 34 天起在房屋门口左前侧补一个兔子摆件，并沿用到后续天数。
      void this.ensureRabbitTemplate()
      this.updateRabbitTransform()
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
    this.rabbit.visible = shouldShowRabbit
    this.windmill.visible = shouldShowWindmill
    this.swing.visible = input.stageIndex >= 5

    this.campfire.scale.setScalar(
      (input.stageIndex === 2 ? 0.9 + input.stageProgress * 0.2 : 1) * CAMPFIRE_MODEL_SCALE_FACTOR,
    )
    this.swing.scale.setScalar(input.stageIndex >= 5 ? 0.9 + input.stageProgress * 0.1 : 1)
  }

  tick(elapsedMs: number) {
    if (!this.windmill.visible || !this.windmillMixer) return
    this.windmillMixer.setTime(elapsedMs * 0.001 * WINDMILL_ANIMATION_SPEED)
  }

  private shouldShowCabin(input: LayerUpdateInput) {
    return input.stageIndex >= 4 && input.dayCount >= CABIN_TRANSITION_START_DAY && input.dayCount <= CABIN_STAGE_END_DAY
  }

  private shouldShowWindmill(input: LayerUpdateInput) {
    return input.stageIndex >= 4 && input.dayCount >= WINDMILL_APPEAR_START_DAY
  }

  private shouldShowTent(input: LayerUpdateInput) {
    return input.dayCount >= 18 && input.stageIndex >= 3 && input.dayCount < CABIN_TRANSITION_START_DAY
  }

  private shouldShowRabbit(input: LayerUpdateInput) {
    return input.stageIndex >= 4 && input.dayCount >= RABBIT_APPEAR_START_DAY
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

  private getWindmillGrowthScale(dayCount: number) {
    if (dayCount <= WINDMILL_APPEAR_START_DAY) return WINDMILL_GROWTH_START_SCALE
    if (dayCount >= WINDMILL_GROWTH_END_DAY) return WINDMILL_GROWTH_END_SCALE

    const progress =
      (dayCount - WINDMILL_APPEAR_START_DAY) /
      Math.max(1, WINDMILL_GROWTH_END_DAY - WINDMILL_APPEAR_START_DAY)

    return (
      WINDMILL_GROWTH_START_SCALE +
      (WINDMILL_GROWTH_END_SCALE - WINDMILL_GROWTH_START_SCALE) * progress
    )
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

  private attachCabinInstance(cabinTemplate: Group, variant: CabinVariant) {
    this.hutFull.clear()
    this.cabinWindowMaterials = []

    const instance = cabinTemplate.clone(true)
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
    const cabinSinkOffset =
      variant === 'wooden' ? WOODEN_CABIN_INSTANCE_SINK_OFFSET : CABIN_INSTANCE_SINK_OFFSET
    const cabinOffsetX = variant === 'wooden' ? WOODEN_CABIN_INSTANCE_OFFSET_X : 0
    const cabinOffsetZ = variant === 'wooden' ? WOODEN_CABIN_INSTANCE_OFFSET_Z : 0
    const cabinYawOffset = variant === 'wooden' ? WOODEN_CABIN_INSTANCE_YAW_OFFSET : 0
    instance.position.set(
      -center.x * scale + cabinOffsetX,
      -bounds.min.y * scale - cabinSinkOffset,
      -center.z * scale + cabinOffsetZ,
    )
    instance.rotateY(cabinYawOffset)

    this.activeCabinVariant = variant
    this.hutFull.userData.cabinVariant = variant
    this.hutFull.add(instance)
  }

  private createRabbit() {
    const group = new Group()
    const { plankNormal, rabbitSurfaceNormal } = getRabbitPlacementData(this.planetRadius)
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      rabbitSurfaceNormal,
      this.planetRadius,
      RABBIT_SURFACE_CLEARANCE,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    this.alignFacingToSurfaceTarget(group, surfaceNormal, plankNormal)
    group.rotateY(RABBIT_YAW_OFFSET)
    group.visible = false

    return group
  }

  private updateRabbitTransform() {
    const { plankNormal, rabbitSurfaceNormal } = getRabbitPlacementData(this.planetRadius)
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      rabbitSurfaceNormal,
      this.planetRadius,
      RABBIT_SURFACE_CLEARANCE,
    )
    this.rabbit.position.copy(pos)
    this.rabbit.quaternion.copy(quaternion)
    this.alignFacingToSurfaceTarget(this.rabbit, surfaceNormal, plankNormal)
    this.rabbit.rotateY(RABBIT_YAW_OFFSET)
  }

  private attachRabbitInstance() {
    this.rabbit.clear()
    if (!this.rabbitTemplate) return

    const instance = this.rabbitTemplate.clone(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const safeHeight = Math.max(size.y, 0.001)
    const scale = RABBIT_MODEL_TARGET_HEIGHT / safeHeight

    instance.scale.setScalar(scale)
    instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)

    this.rabbit.add(instance)
  }

  private attachWindmillInstance() {
    this.windmill.clear()
    this.windmillMixer = null
    if (!this.windmillTemplate) return

    const instance = this.windmillTemplate.clone(true)
    const bounds = new Box3().setFromObject(instance)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const safeHeight = Math.max(size.y, 0.001)
    const scale = WINDMILL_MODEL_TARGET_HEIGHT / safeHeight

    instance.scale.setScalar(scale)
    instance.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    this.windmill.add(instance)

    if (this.windmillAnimations.length === 0) return

    this.windmillMixer = new AnimationMixer(instance)
    this.windmillAnimations.forEach((clip) => {
      this.windmillMixer?.clipAction(clip).play()
    })
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
    const { pos, quaternion } = getSurfaceTransformWithClearance(
      new Vector3().setFromSphericalCoords(1, WINDMILL_SURFACE_PHI, WINDMILL_SURFACE_THETA),
      this.planetRadius,
      WINDMILL_SURFACE_CLEARANCE,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    group.rotateY(WINDMILL_YAW_OFFSET)
    group.scale.setScalar(this.getWindmillGrowthScale(WINDMILL_APPEAR_START_DAY))
    group.visible = false

    return group
  }

  private updateWindmillTransform(dayCount: number) {
    this.windmill.scale.setScalar(this.getWindmillGrowthScale(dayCount))
  }

  private createSwing() {
    const group = new Group()
    // 先保留秋千的挂点与显示链路，当前旧秋千模型本体先移除，后续再替换成新模型。

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
