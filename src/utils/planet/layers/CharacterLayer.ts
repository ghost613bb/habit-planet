import { Group, Mesh, SphereGeometry, Vector3 } from 'three'

import { mats } from '../assets/Materials'
import { getSurfaceTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type CharacterLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

const STAGE_THREE_END_STATE_START_DAY = 22
const STAGE_THREE_END_STATE_END_DAY = 45

export class CharacterLayer implements LayerController {
  id = 'character'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private deer: Group
  private birds: Group[] = []

  constructor(options: CharacterLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.deer = this.createDeer()
    this.birds = this.createBirds()

    this.group.add(this.deer)
    this.birds.forEach((item) => this.group.add(item))
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    this.group.visible = true
    const shouldHoldStageThreeEndState =
      input.dayCount >= STAGE_THREE_END_STATE_START_DAY &&
      input.dayCount <= STAGE_THREE_END_STATE_END_DAY

    this.deer.visible = input.stageIndex >= 6 && input.qualityTier !== 'tier-0'

    const showBirds =
      input.stageIndex >= 5 && input.qualityTier !== 'tier-0' && !shouldHoldStageThreeEndState

    this.birds.forEach((item) => {
      item.visible = showBirds
    })
  }

  tick(elapsedMs: number) {
    const t = elapsedMs * 0.001

    this.birds.forEach((bird, index) => {
      if (!bird.visible) return
      bird.position.y += Math.sin(t * 2 + index) * 0.0008
      bird.rotation.z = Math.sin(t * 3 + index) * 0.12
    })
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
  }

  private createDeer() {
    const deer = new Group()
    const body = new Mesh(new SphereGeometry(0.18, 10, 10), mats.animalPink)
    body.scale.set(1.5, 0.8, 0.7)
    body.position.y = 0.22
    const neck = new Mesh(new SphereGeometry(0.07, 8, 8), mats.animalPink)
    neck.scale.set(0.7, 1.8, 0.7)
    neck.position.set(0.2, 0.38, 0)
    const head = new Mesh(new SphereGeometry(0.09, 8, 8), mats.animalPink)
    head.position.set(0.26, 0.54, 0)

    deer.add(body, neck, head)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.18, 5.8),
      this.planetRadius + 0.02,
    )
    deer.position.copy(pos)
    deer.quaternion.copy(quaternion)
    deer.visible = false

    return deer
  }

  private createBirds() {
    // 先移除这套叶片样式的飞鸟占位，后续如需替换再接入新飞行模型。
    return []
  }
}
