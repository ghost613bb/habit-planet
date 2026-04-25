import {
  Box3,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
  CylinderGeometry,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const lowPolyWideTreeLoader = new GLTFLoader(new LoadingManager())

let lowPolyWideTreeTemplate: Group | null = null
let lowPolyWideTreeLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLowPolyTreesUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/low_poly_trees/scene.gltf', globalThis.location.origin).toString()
    : '/models/low_poly_trees/scene.gltf'
}

function createPlaceholderWideTree() {
  const group = new Group()
  const trunk = new Mesh(
    new CylinderGeometry(0.08, 0.16, 0.58, 8),
    new MeshLambertMaterial({ color: '#bf7b4a' }),
  )
  trunk.position.y = 0.28

  const canopy = new Mesh(
    new SphereGeometry(0.34, 8, 8),
    new MeshLambertMaterial({ color: '#78c04f' }),
  )
  canopy.scale.set(1.35, 0.82, 1.05)
  canopy.position.set(0.04, 0.78, 0)

  group.add(trunk, canopy)
  return group
}

function normalizeTreeModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderWideTree()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  source.position.y -= bounds.min.y
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

export async function preloadLowPolyWideTreeTemplate() {
  if (lowPolyWideTreeTemplate) return lowPolyWideTreeTemplate

  if (!lowPolyWideTreeLoadPromise) {
    if (isJsdomEnvironment()) {
      lowPolyWideTreeTemplate = normalizeTreeModel(createPlaceholderWideTree())
      lowPolyWideTreeLoadPromise = Promise.resolve(lowPolyWideTreeTemplate)
    } else {
      lowPolyWideTreeLoadPromise = new Promise<Group>((resolve, reject) => {
        lowPolyWideTreeLoader.load(
          getLowPolyTreesUrl(),
          (gltf) => {
            const wideTree = gltf.scene.getObjectByName('tree2') ?? gltf.scene
            lowPolyWideTreeTemplate = normalizeTreeModel(wideTree)
            resolve(lowPolyWideTreeTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return lowPolyWideTreeLoadPromise
}

export function createLowPolyWideTreeInstance(options?: {
  targetHeight?: number
  rotationY?: number
}) {
  const targetHeight = options?.targetHeight ?? 1
  const rotationY = options?.rotationY ?? 0
  const base = lowPolyWideTreeTemplate ?? normalizeTreeModel(createPlaceholderWideTree())
  const instance = base.clone(true)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
