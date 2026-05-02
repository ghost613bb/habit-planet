import {
  Box3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const lowpolyTreeLoader = new GLTFLoader(new LoadingManager())

let lowpolyTreeTemplate: Group | null = null
let lowpolyTreeLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLowpolyTreeUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/lowpoly_tree/scene.gltf', globalThis.location.origin).toString()
    : '/models/lowpoly_tree/scene.gltf'
}

function createPlaceholderLowpolyTree() {
  const group = new Group()
  const trunk = new Mesh(
    new CylinderGeometry(0.08, 0.1, 0.62, 8),
    new MeshLambertMaterial({ color: '#8a5b36' }),
  )
  trunk.position.y = 0.31

  const canopy = new Mesh(
    new ConeGeometry(0.38, 0.9, 8),
    new MeshLambertMaterial({ color: '#6fa84f' }),
  )
  canopy.position.y = 0.92

  group.add(trunk, canopy)
  return group
}

function normalizeTreeModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderLowpolyTree()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  source.position.y -= bounds.min.y
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

export async function preloadLowpolyTreeTemplate() {
  if (lowpolyTreeTemplate) return lowpolyTreeTemplate

  if (!lowpolyTreeLoadPromise) {
    if (isJsdomEnvironment()) {
      lowpolyTreeTemplate = normalizeTreeModel(createPlaceholderLowpolyTree())
      lowpolyTreeLoadPromise = Promise.resolve(lowpolyTreeTemplate)
    } else {
      lowpolyTreeLoadPromise = new Promise<Group>((resolve, reject) => {
        lowpolyTreeLoader.load(
          getLowpolyTreeUrl(),
          (gltf) => {
            lowpolyTreeTemplate = normalizeTreeModel(gltf.scene)
            resolve(lowpolyTreeTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return lowpolyTreeLoadPromise
}

export function createLowpolyTreeInstance(options?: {
  targetHeight?: number
  rotationY?: number
}) {
  const targetHeight = options?.targetHeight ?? 1
  const rotationY = options?.rotationY ?? 0
  const base = lowpolyTreeTemplate ?? normalizeTreeModel(createPlaceholderLowpolyTree())
  const instance = base.clone(true)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
