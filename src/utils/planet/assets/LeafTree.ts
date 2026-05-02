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

const leafTreeLoader = new GLTFLoader(new LoadingManager())

let leafTreeTemplate: Group | null = null
let leafTreeLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLeafTreeUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/leaf_tree/scene.gltf', globalThis.location.origin).toString()
    : '/models/leaf_tree/scene.gltf'
}

function createPlaceholderLeafTree() {
  const group = new Group()
  const trunk = new Mesh(
    new CylinderGeometry(0.05, 0.08, 0.58, 8),
    new MeshLambertMaterial({ color: '#8b5f3b' }),
  )
  trunk.position.y = 0.29

  const canopy = new Mesh(
    new ConeGeometry(0.28, 0.72, 8),
    new MeshLambertMaterial({ color: '#79b95b' }),
  )
  canopy.position.y = 0.86

  group.add(trunk, canopy)
  return group
}

function normalizeTreeModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderLeafTree()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  source.position.y -= bounds.min.y
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

export async function preloadLeafTreeTemplate() {
  if (leafTreeTemplate) return leafTreeTemplate

  if (!leafTreeLoadPromise) {
    if (isJsdomEnvironment()) {
      leafTreeTemplate = normalizeTreeModel(createPlaceholderLeafTree())
      leafTreeLoadPromise = Promise.resolve(leafTreeTemplate)
    } else {
      leafTreeLoadPromise = new Promise<Group>((resolve, reject) => {
        leafTreeLoader.load(
          getLeafTreeUrl(),
          (gltf) => {
            leafTreeTemplate = normalizeTreeModel(gltf.scene)
            resolve(leafTreeTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return leafTreeLoadPromise
}

export function createLeafTreeInstance(options?: {
  targetHeight?: number
  rotationY?: number
}) {
  const targetHeight = options?.targetHeight ?? 1
  const rotationY = options?.rotationY ?? 0
  const base = leafTreeTemplate ?? normalizeTreeModel(createPlaceholderLeafTree())
  const instance = base.clone(true)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
