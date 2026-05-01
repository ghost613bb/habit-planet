import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { mats } from '../assets/Materials'
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

const CAMPFIRE_MODEL_SCALE_FACTOR = 0.95
const TENT_MODEL_TARGET_HEIGHT = 0.7
const TENT_SURFACE_CLEARANCE = 0.018
const TENT_PATH_BACK_OFFSET = -0.45
const TENT_SIDE_OFFSET = 0.12

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
    this.hutFull = this.createHutFull()
    this.windmill = this.createWindmill()
    this.windmillRotor = this.windmill.children[1] as Group
    this.bench = this.createBench()
    this.swing = this.createSwing()

    this.group.add(
      this.campfire,
      this.tent,
      this.hutFull,
      this.windmill,
      this.bench,
      this.swing,
    )
  }

  preload(): Promise<void> {
    return Promise.all([this.ensureCampfireTemplate(), this.ensureTentTemplate()]).then(() => undefined)
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

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    if (input.stageIndex >= 2) {
      // 真实运行链路不会主动预加载，这里在第一次需要展示篝火时懒加载一次。
      void this.ensureCampfireTemplate()
    }

    if (this.shouldShowTent(input)) {
      // 第 18 天帐篷第一次出现时再懒加载，避免第三阶段前半段白白加载模型。
      void this.ensureTentTemplate()
    }

    this.campfire.visible = input.stageIndex >= 2
    this.tent.visible = this.shouldShowTent(input)
    this.hutFull.visible = input.stageIndex >= 4
    this.windmill.visible = input.stageIndex >= 4
    this.bench.visible = input.stageIndex >= 5
    this.swing.visible = input.stageIndex >= 5

    this.campfire.scale.setScalar(
      (input.stageIndex === 2 ? 0.9 + input.stageProgress * 0.2 : 1) * CAMPFIRE_MODEL_SCALE_FACTOR,
    )
    this.windmillRotor.rotation.z = input.stageIndex >= 4 ? input.dayCount * 0.12 : 0
    this.hutFull.scale.setScalar(input.stageIndex >= 4 ? 0.95 + input.stageProgress * 0.05 : 1)
    this.bench.scale.setScalar(input.stageIndex >= 5 ? 0.9 + input.stageProgress * 0.1 : 1)
    this.swing.scale.setScalar(input.stageIndex >= 5 ? 0.9 + input.stageProgress * 0.1 : 1)
  }

  private shouldShowTent(input: LayerUpdateInput) {
    return input.dayCount >= 18 && input.stageIndex >= 3
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
    const plankIndex = getFirstRevealedWoodPlankIndex()
    const plankNormal = getWoodPlankSurfaceNormal(plankIndex)
    const pathTangent = getWoodPlankPathTangent(plankIndex)
    const { pos: plankSurfacePos } = getSurfaceTransformWithClearance(plankNormal, this.planetRadius)
    const leftDirection = plankNormal.clone().cross(pathTangent).normalize()
    const tentAnchorPos = plankSurfacePos
      .clone()
      .addScaledVector(pathTangent, -TENT_PATH_BACK_OFFSET)
      .addScaledVector(leftDirection, TENT_SIDE_OFFSET)
    const tentNormal = tentAnchorPos.normalize()
    const { pos, quaternion, surfaceNormal } = getSurfaceTransformWithClearance(
      tentNormal,
      this.planetRadius,
      TENT_SURFACE_CLEARANCE,
    )

    group.position.copy(pos)
    group.quaternion.copy(quaternion)
    this.alignTentFacing(group, surfaceNormal, plankNormal)
    group.visible = false

    return group
  }

  private alignTentFacing(group: Group, surfaceNormal: Vector3, targetNormal: Vector3) {
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

  private createHutFull() {
    const group = new Group()
    const body = new Mesh(new BoxGeometry(0.72, 0.5, 0.54), mats.houseBody)
    body.position.y = 0.28

    const roofLeft = new Mesh(new BoxGeometry(0.5, 0.12, 0.62), mats.houseRoof)
    roofLeft.position.set(-0.14, 0.64, 0)
    roofLeft.rotation.z = Math.PI / 5

    const roofRight = new Mesh(new BoxGeometry(0.5, 0.12, 0.62), mats.houseRoof)
    roofRight.position.set(0.14, 0.64, 0)
    roofRight.rotation.z = -Math.PI / 5

    const door = new Mesh(new BoxGeometry(0.16, 0.28, 0.04), mats.door)
    door.position.set(0, 0.14, 0.3)

    const window = new Mesh(new BoxGeometry(0.12, 0.12, 0.03), mats.window)
    window.position.set(0.21, 0.3, 0.3)

    group.add(body, roofLeft, roofRight, door, window)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.2, 2.1),
      this.planetRadius + 0.02,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)
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
