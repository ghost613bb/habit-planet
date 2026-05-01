import {
  Box3,
  Color,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type LowPolyFlowerVariant = 'upright' | 'wide' | 'lean'

type VariantAppearance = {
  rootScale: Vector3
  rotationOffsetY: number
  hueOffset: number
  lightnessOffset: number
}

const lowPolyFlowerLoader = new GLTFLoader(new LoadingManager())

const VARIANT_APPEARANCE: Record<LowPolyFlowerVariant, VariantAppearance> = {
  upright: {
    rootScale: new Vector3(1, 1, 1),
    rotationOffsetY: 0,
    hueOffset: 0,
    lightnessOffset: 0,
  },
  wide: {
    rootScale: new Vector3(1.1, 0.92, 1.12),
    rotationOffsetY: 0.34,
    hueOffset: 0.025,
    lightnessOffset: 0.02,
  },
  lean: {
    rootScale: new Vector3(0.94, 1.08, 0.96),
    rotationOffsetY: -0.28,
    hueOffset: -0.03,
    lightnessOffset: -0.02,
  },
}

let lowPolyFlowerTemplate: Group | null = null
let lowPolyFlowerLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLowPolyFlowersUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/low_poly_flowers/scene.gltf', globalThis.location.origin).toString()
    : '/models/low_poly_flowers/scene.gltf'
}

function createPlaceholderFlower() {
  const group = new Group()

  const stem = new Mesh(
    new CylinderGeometry(0.028, 0.035, 0.72, 6),
    new MeshLambertMaterial({ color: '#5f9e4d', flatShading: true }),
  )
  stem.position.y = 0.36

  const core = new Mesh(
    new SphereGeometry(0.12, 6, 6),
    new MeshLambertMaterial({ color: '#ffd56a', flatShading: true }),
  )
  core.position.y = 0.76

  const petals = Array.from({ length: 5 }, (_, index) => {
    const petal = new Mesh(
      new SphereGeometry(0.12, 6, 5),
      new MeshLambertMaterial({ color: '#ff8e96', flatShading: true }),
    )
    petal.scale.set(1.3, 0.38, 0.8)
    petal.position.set(0, 0.76, 0.14)
    petal.rotation.x = Math.PI / 2
    petal.rotation.z = (index / 5) * Math.PI * 2
    return petal
  })

  group.add(stem, core, ...petals)
  return group
}

function normalizeFlowerModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderFlower()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  source.position.y -= bounds.min.y
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

function tintFlowerInstance(root: Group, variant: LowPolyFlowerVariant) {
  const appearance = VARIANT_APPEARANCE[variant]

  root.traverse((item) => {
    if (!(item instanceof Mesh)) return

    const material = item.material
    if (!(material instanceof MeshStandardMaterial || material instanceof MeshLambertMaterial)) return

    const nextMaterial = material.clone()
    const nextColor = nextMaterial.color.clone()
    const hsl = { h: 0, s: 0, l: 0 }
    nextColor.getHSL(hsl)
    nextColor.setHSL(
      (hsl.h + appearance.hueOffset + 1) % 1,
      hsl.s,
      Math.max(0, Math.min(1, hsl.l + appearance.lightnessOffset)),
    )
    nextMaterial.color = new Color(nextColor)
    item.material = nextMaterial
  })
}

export async function preloadLowPolyFlowerTemplate() {
  if (lowPolyFlowerTemplate) return lowPolyFlowerTemplate

  if (!lowPolyFlowerLoadPromise) {
    if (isJsdomEnvironment()) {
      lowPolyFlowerTemplate = normalizeFlowerModel(createPlaceholderFlower())
      lowPolyFlowerLoadPromise = Promise.resolve(lowPolyFlowerTemplate)
    } else {
      lowPolyFlowerLoadPromise = new Promise<Group>((resolve, reject) => {
        lowPolyFlowerLoader.load(
          getLowPolyFlowersUrl(),
          (gltf) => {
            lowPolyFlowerTemplate = normalizeFlowerModel(gltf.scene)
            resolve(lowPolyFlowerTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return lowPolyFlowerLoadPromise
}

export function createLowPolyFlowerInstance(options?: {
  targetHeight?: number
  rotationY?: number
  variant?: LowPolyFlowerVariant
}) {
  const targetHeight = options?.targetHeight ?? 0.3
  const rotationY = options?.rotationY ?? 0
  const variant = options?.variant ?? 'upright'
  const appearance = VARIANT_APPEARANCE[variant]
  const base = lowPolyFlowerTemplate ?? normalizeFlowerModel(createPlaceholderFlower())
  const instance = base.clone(true)
  tintFlowerInstance(instance, variant)
  instance.scale.set(appearance.rootScale.x, appearance.rootScale.y, appearance.rootScale.z)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY + appearance.rotationOffsetY
  instance.userData.lowPolyFlowerVariant = variant
  return instance
}
