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

const leafyTreeLoader = new GLTFLoader(new LoadingManager())

let leafyTreeTemplate: Group | null = null
let leafyTreeLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLeafyTreeUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/leafy_tree_-_low_poly/scene.gltf', globalThis.location.origin).toString()
    : '/models/leafy_tree_-_low_poly/scene.gltf'
}

function createPlaceholderTree() {
  const group = new Group()
  const trunk = new Mesh(
    new CylinderGeometry(0.08, 0.11, 0.5, 8),
    new MeshLambertMaterial({ color: '#7a5836' }),
  )
  trunk.position.y = 0.25

  const canopy = new Mesh(
    new ConeGeometry(0.32, 0.62, 8),
    new MeshLambertMaterial({ color: '#6fa06a' }),
  )
  canopy.position.y = 0.78

  group.add(trunk, canopy)
  return group
}

function normalizeTreeModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderTree()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  source.position.y -= bounds.min.y
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

export async function preloadLeafyTreeTemplate() {
  if (leafyTreeTemplate) return leafyTreeTemplate

  if (!leafyTreeLoadPromise) {
    if (isJsdomEnvironment()) {
      leafyTreeTemplate = normalizeTreeModel(createPlaceholderTree())
      leafyTreeLoadPromise = Promise.resolve(leafyTreeTemplate)
    } else {
      leafyTreeLoadPromise = new Promise<Group>((resolve, reject) => {
        leafyTreeLoader.load(
          getLeafyTreeUrl(),
          (gltf) => {
            leafyTreeTemplate = normalizeTreeModel(gltf.scene)
            resolve(leafyTreeTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return leafyTreeLoadPromise
}

export function createLeafyTreeInstance(options?: {
  targetHeight?: number
  rotationY?: number
}) {
  const targetHeight = options?.targetHeight ?? 1
  const rotationY = options?.rotationY ?? 0
  const base = leafyTreeTemplate ?? normalizeTreeModel(createPlaceholderTree())
  const instance = base.clone(true)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
