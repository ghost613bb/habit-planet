import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'

import { createLeafyTreeInstance, preloadLeafyTreeTemplate } from '../assets/LeafyTree'
import { getSurfaceTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type FinaleLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

export class FinaleLayer implements LayerController {
  id = 'finale'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private lifeTree: Group
  private haloInner: Mesh
  private haloOuter: Mesh
  private stardust: Points
  private lifeTreeLoadPromise: Promise<void> | null = null

  constructor(options: FinaleLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.lifeTree = this.createLifeTreeAnchor()
    this.haloInner = this.createHalo(4.08, 4.16, 0x8ff7ff)
    this.haloOuter = this.createHalo(4.32, 4.42, 0xfff2a8)
    this.stardust = this.createStardust()

    this.group.add(this.lifeTree, this.haloInner, this.haloOuter, this.stardust)
    this.group.visible = false
  }

  preload(): Promise<void> {
    if (!this.lifeTreeLoadPromise) {
      this.lifeTreeLoadPromise = preloadLeafyTreeTemplate().then(() => {
        this.attachLifeTreeInstance()
      })
    }

    return this.lifeTreeLoadPromise
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const shouldFallbackToStageFiveVisual = input.stageIndex >= 6

    // 第 6 天及以后先沿用第 5 天画面，这里临时关闭终幕层显示。
    this.group.visible = false
    this.lifeTree.visible = false
    this.haloInner.visible = false
    this.haloOuter.visible = false
    this.stardust.visible = false

    if (!shouldFallbackToStageFiveVisual) return
  }

  tick(elapsedMs: number) {
    if (!this.group.visible) return

    const t = elapsedMs * 0.001
    this.haloInner.rotation.z = t * 0.18
    this.haloOuter.rotation.z = -t * 0.12
    this.lifeTree.rotation.y = Math.sin(t * 0.4) * 0.08
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
    this.stardust.geometry.dispose()
  }

  private createLifeTreeAnchor() {
    const group = new Group()

    const { pos, quaternion } = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.15, 5.25),
      this.planetRadius + 0.04,
    )
    group.position.copy(pos)
    group.quaternion.copy(quaternion)

    return group
  }

  private attachLifeTreeInstance() {
    this.lifeTree.clear()
    this.lifeTree.add(
      createLeafyTreeInstance({
        targetHeight: 1.85,
        rotationY: 0.35,
      }),
    )
  }

  private createHalo(innerRadius: number, outerRadius: number, color: number) {
    const halo = new Mesh(
      new RingGeometry(innerRadius, outerRadius, 72),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        side: 2,
      }),
    )

    halo.rotation.x = Math.PI / 2
    return halo
  }

  private createStardust() {
    const geometry = new BufferGeometry()
    const positions: number[] = []

    for (let i = 0; i < 80; i += 1) {
      const angle = (Math.PI * 2 * i) / 80
      const radius = 4.35 + (i % 5) * 0.03
      positions.push(Math.cos(angle) * radius, (i % 7) * 0.02 - 0.06, Math.sin(angle) * radius)
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const material = new PointsMaterial({
      color: 0xbdfcff,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
    })

    const points = new Points(geometry, material)
    points.rotation.x = Math.PI / 2
    points.visible = false

    return points
  }
}
