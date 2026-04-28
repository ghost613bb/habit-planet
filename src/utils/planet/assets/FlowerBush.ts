import {
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  SphereGeometry,
  Color,
} from 'three'

export type FlowerBushPaletteVariant = 'pink' | 'yellow' | 'blue'

type Palette = {
  petal: string
  center: string
}

const PALETTES: Record<FlowerBushPaletteVariant, Palette> = {
  pink: { petal: '#ff8fb9', center: '#ffd166' },
  yellow: { petal: '#ffd166', center: '#fff3b0' },
  blue: { petal: '#6da8ff', center: '#ffe8a3' },
}

const LEAF_COLOR = '#5aa45e'

let flowerBushTemplate: Group | null = null
let flowerBushLoadPromise: Promise<Group> | null = null

function createLeafClump() {
  const leafMat = new MeshLambertMaterial({ color: new Color(LEAF_COLOR), flatShading: true })
  const leafGeo = new SphereGeometry(0.12, 7, 6)

  const leaf1 = new Mesh(leafGeo, leafMat)
  leaf1.position.set(0.06, 0.1, 0)
  leaf1.scale.set(1.05, 0.85, 1)
  leaf1.userData.flowerBushRole = 'leaf'

  const leaf2 = new Mesh(leafGeo, leafMat)
  leaf2.position.set(-0.05, 0.09, -0.04)
  leaf2.scale.set(0.95, 0.8, 0.92)
  leaf2.userData.flowerBushRole = 'leaf'

  const leaf3 = new Mesh(leafGeo, leafMat)
  leaf3.position.set(-0.01, 0.08, 0.06)
  leaf3.scale.set(0.9, 0.78, 0.95)
  leaf3.userData.flowerBushRole = 'leaf'

  const root = new Group()
  root.add(leaf1, leaf2, leaf3)
  return root
}

function createPetalCross(palette: Palette) {
  const group = new Group()
  const petalMat = new MeshLambertMaterial({
    color: new Color(palette.petal),
    flatShading: true,
    side: 2, // DoubleSide，避免花瓣从背面不可见
  })
  const centerMat = new MeshLambertMaterial({
    color: new Color(palette.center),
    flatShading: true,
  })

  const plane = new PlaneGeometry(0.14, 0.07, 1, 1)
  const p1 = new Mesh(plane, petalMat)
  p1.rotation.y = 0
  p1.userData.flowerBushRole = 'petal'
  const p2 = new Mesh(plane, petalMat)
  p2.rotation.y = Math.PI / 2
  p2.userData.flowerBushRole = 'petal'
  const p3 = new Mesh(plane, petalMat)
  p3.rotation.y = Math.PI / 4
  p3.userData.flowerBushRole = 'petal'
  const p4 = new Mesh(plane, petalMat)
  p4.rotation.y = -Math.PI / 4
  p4.userData.flowerBushRole = 'petal'

  const center = new Mesh(new SphereGeometry(0.03, 6, 6), centerMat)
  center.position.y = 0.01
  center.userData.flowerBushRole = 'center'

  group.add(p1, p2, p3, p4, center)
  return group
}

function createProceduralTemplate() {
  const root = new Group()
  root.add(createLeafClump())

  // 花朵锚点（局部坐标）；保持确定性，避免测试受随机影响
  const anchors = [
    { x: 0.08, y: 0.18, z: 0.02, yaw: 0.2, scale: 1 },
    { x: -0.07, y: 0.17, z: -0.01, yaw: 1.0, scale: 0.92 },
    { x: -0.01, y: 0.19, z: 0.08, yaw: -0.6, scale: 0.95 },
    { x: 0.02, y: 0.16, z: -0.08, yaw: 0.5, scale: 0.88 },
  ] as const

  const baseFlower = createPetalCross(PALETTES.pink)
  anchors.forEach((a, index) => {
    const flower = baseFlower.clone(true)
    flower.position.set(a.x, a.y, a.z)
    flower.rotation.y = a.yaw + index * 0.35
    flower.scale.setScalar(a.scale)
    root.add(flower)
  })

  return root
}

function applyPaletteToInstance(root: Group, palette: Palette) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const role = obj.userData?.flowerBushRole as string | undefined
    if (role !== 'petal' && role !== 'center') return

    const mat = obj.material
    if (!(mat instanceof MeshLambertMaterial)) return

    // 重要：为实例克隆材质，避免改色串到其它实例
    const nextMat = mat.clone()
    nextMat.color.set(role === 'petal' ? palette.petal : palette.center)
    obj.material = nextMat
  })
}

export async function preloadFlowerBushTemplate(): Promise<Group> {
  if (flowerBushTemplate) return flowerBushTemplate
  if (!flowerBushLoadPromise) {
    flowerBushTemplate = createProceduralTemplate()
    flowerBushLoadPromise = Promise.resolve(flowerBushTemplate)
  }
  return flowerBushLoadPromise
}

export function createFlowerBushInstance(options?: {
  targetHeight?: number
  rotationY?: number
  paletteVariant?: FlowerBushPaletteVariant
}): Group {
  const targetHeight = options?.targetHeight ?? 0.55
  const rotationY = options?.rotationY ?? 0
  const paletteVariant = options?.paletteVariant ?? 'pink'

  const base = flowerBushTemplate ?? createProceduralTemplate()
  const instance = base.clone(true)
  applyPaletteToInstance(instance, PALETTES[paletteVariant])
  instance.scale.setScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}

