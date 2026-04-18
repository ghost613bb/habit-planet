import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  Vector3,
} from 'three'

import { mats } from '../assets/Materials'
import { getSurfaceTransform } from '../math/PlanetMath'
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
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const isLegacyStage = input.stageIndex >= 3
    this.group.visible = !isLegacyStage

    if (isLegacyStage) return

    this.sprout.visible = true
    this.sprout.scale.setScalar(0.55 + input.stageProgress * 0.45)

    const visibleBushCount = input.stageIndex === 1 ? 0 : 2 + Math.round(input.stageProgress * 2)
    for (let i = 0; i < this.bushes.length; i += 1) {
      this.bushes[i].visible = i < visibleBushCount
      this.bushes[i].scale.setScalar(0.75 + input.stageProgress * 0.25)
    }

    const visibleTreeCount = input.stageIndex === 1 ? 0 : 1 + Math.round(input.stageProgress * 2)
    for (let i = 0; i < this.trees.length; i += 1) {
      this.trees[i].visible = i < visibleTreeCount
      this.trees[i].scale.setScalar(0.7 + input.stageProgress * 0.3)
    }
  }

  deactivate() {
    this.group.visible = false
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

    const { pos, quaternion } = getSurfaceTransform(new Vector3(0, 1, 0), this.planetRadius + 0.04)
    sprout.position.copy(pos)
    sprout.quaternion.copy(quaternion)

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

      const { pos, quaternion } = getSurfaceTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius + 0.02,
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

      const { pos, quaternion } = getSurfaceTransform(
        new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta),
        this.planetRadius + 0.02,
      )
      tree.position.copy(pos)
      tree.quaternion.copy(quaternion)
      tree.visible = false

      return tree
    })
  }
}
