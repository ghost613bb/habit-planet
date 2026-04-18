import {
  Group,
  Mesh,
  SphereGeometry,
  Vector3,
} from 'three'

import { mats } from '../assets/Materials'
import { getSurfaceTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type CharacterLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

export class CharacterLayer implements LayerController {
  id = 'character'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private rabbit: Group
  private deer: Group
  private birds: Group[] = []
  private butterflies: Group[] = []

  constructor(options: CharacterLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.rabbit = this.createRabbit()
    this.deer = this.createDeer()
    this.birds = this.createBirds()
    this.butterflies = this.createButterflies()

    this.group.add(this.rabbit, this.deer)
    this.birds.forEach((item) => this.group.add(item))
    this.butterflies.forEach((item) => this.group.add(item))
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    this.rabbit.visible = input.stageIndex >= 4
    this.deer.visible = input.stageIndex >= 6 && input.qualityTier !== 'tier-0'

    const showBirds = input.stageIndex >= 5 && input.qualityTier !== 'tier-0'
    const showButterflies = input.stageIndex >= 5 && input.qualityTier === 'tier-2'

    this.birds.forEach((item) => {
      item.visible = showBirds
    })
    this.butterflies.forEach((item) => {
      item.visible = showButterflies
    })
  }

  tick(elapsedMs: number) {
    const t = elapsedMs * 0.001

    this.birds.forEach((bird, index) => {
      if (!bird.visible) return
      bird.position.y += Math.sin(t * 2 + index) * 0.0008
      bird.rotation.z = Math.sin(t * 3 + index) * 0.12
    })

    this.butterflies.forEach((butterfly, index) => {
      if (!butterfly.visible) return
      butterfly.position.y += Math.sin(t * 3.5 + index * 0.8) * 0.001
      butterfly.rotation.z = Math.sin(t * 6 + index) * 0.22
    })
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
  }

  private createRabbit() {
    const rabbit = new Group()
    const body = new Mesh(new SphereGeometry(0.14, 10, 10), mats.bear)
    body.scale.set(1.1, 0.8, 1)
    body.position.y = 0.15
    const head = new Mesh(new SphereGeometry(0.1, 10, 10), mats.bear)
    head.position.set(0.12, 0.28, 0)
    const earLeft = new Mesh(new SphereGeometry(0.035, 8, 8), mats.bear)
    earLeft.scale.set(0.6, 2.1, 0.6)
    earLeft.position.set(0.16, 0.44, -0.04)
    const earRight = new Mesh(new SphereGeometry(0.035, 8, 8), mats.bear)
    earRight.scale.set(0.6, 2.1, 0.6)
    earRight.position.set(0.16, 0.44, 0.04)

    rabbit.add(body, head, earLeft, earRight)

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.18, 2.6),
      this.planetRadius + 0.02,
    )
    rabbit.position.copy(pos)
    rabbit.quaternion.copy(quaternion)
    rabbit.visible = false

    return rabbit
  }

  private createDeer() {
    const deer = new Group()
    const body = new Mesh(new SphereGeometry(0.18, 10, 10), mats.rabbit)
    body.scale.set(1.5, 0.8, 0.7)
    body.position.y = 0.22
    const neck = new Mesh(new SphereGeometry(0.07, 8, 8), mats.rabbit)
    neck.scale.set(0.7, 1.8, 0.7)
    neck.position.set(0.2, 0.38, 0)
    const head = new Mesh(new SphereGeometry(0.09, 8, 8), mats.rabbit)
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
    const anchors = [
      { phi: 0.22, theta: 0.3 },
      { phi: 0.18, theta: 1.8 },
    ]

    return anchors.map((anchor) => {
      const bird = new Group()
      const body = new Mesh(new SphereGeometry(0.05, 8, 8), mats.leaves2)
      body.scale.set(1.2, 0.7, 0.7)
      const wingLeft = new Mesh(new SphereGeometry(0.03, 6, 6), mats.leaves1)
      wingLeft.scale.set(1.8, 0.4, 0.8)
      wingLeft.position.set(-0.05, 0.02, -0.02)
      const wingRight = new Mesh(new SphereGeometry(0.03, 6, 6), mats.leaves1)
      wingRight.scale.set(1.8, 0.4, 0.8)
      wingRight.position.set(-0.05, 0.02, 0.02)

      bird.add(body, wingLeft, wingRight)

      const { pos, quaternion } = getSurfaceTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius + 0.55,
      )
      bird.position.copy(pos)
      bird.quaternion.copy(quaternion)
      bird.visible = false

      return bird
    })
  }

  private createButterflies() {
    const anchors = [
      { phi: 0.2, theta: 3.3 },
      { phi: 0.16, theta: 4.4 },
    ]

    return anchors.map((anchor) => {
      const butterfly = new Group()
      const wingLeft = new Mesh(new SphereGeometry(0.04, 8, 8), mats.flowerPetal)
      wingLeft.scale.set(1.4, 0.8, 0.4)
      wingLeft.position.set(-0.03, 0, -0.03)
      const wingRight = new Mesh(new SphereGeometry(0.04, 8, 8), mats.flowerPetal)
      wingRight.scale.set(1.4, 0.8, 0.4)
      wingRight.position.set(-0.03, 0, 0.03)
      butterfly.add(wingLeft, wingRight)

      const { pos, quaternion } = getSurfaceTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius + 0.42,
      )
      butterfly.position.copy(pos)
      butterfly.quaternion.copy(quaternion)
      butterfly.visible = false

      return butterfly
    })
  }
}
