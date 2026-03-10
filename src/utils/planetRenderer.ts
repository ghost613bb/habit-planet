import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  Scene,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
  TextureLoader,
  Vector2,
  Raycaster,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type VegetationConfig = {
  grass: number
  flowers: number
  bushes: number
  trees: number
}

export type Stage = {
  threshold: number
  vegetation: VegetationConfig
}

// --- 辅助函数：纹理生成 ---
// 使用 Canvas 2D 生成噪点纹理，用于给 3D 物体增加粗糙质感
function createNoiseTexture(baseColorHex: string, noiseAmount = 15) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.fillStyle = baseColorHex
  ctx.fillRect(0, 0, size, size)

  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseAmount
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n))
  }
  ctx.putImageData(img, 0, 0)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.needsUpdate = true
  return tex
}

const PLANET_RADIUS_BASE = 3.0

function getSurfaceTransform(normal: any, radius: number) {
  const pos = normal.clone().multiplyScalar(radius)
  const up = new Vector3(0, 1, 0)
  const quaternion = new Quaternion()
  quaternion.setFromUnitVectors(up, normal)

  return { pos, quaternion }
}

// --- 纹理加载 ---
const textureLoader = new TextureLoader()
const exrLoader = new EXRLoader()
const gltfLoader = new GLTFLoader()

// 简单的种子随机数生成器，确保每次生成的位置一致
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  // 0 to 1
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  // min to max
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
}

const planetDiffMap = textureLoader.load('/textures/Material.002_diffuse.jpeg')
planetDiffMap.colorSpace = SRGBColorSpace

// --- 材质定义 ---
const mats = {
  planet: new MeshStandardMaterial({
    map: planetDiffMap,
    color: 0xC4A484, // 浅褐棕色 (Light Brown / Sandy Brown)
    roughness: 1.0, // 范围0-0.1
    normalScale: new Vector2(1.5, 1.5),
  }),
  grass: new MeshStandardMaterial({ map: createNoiseTexture('#77cc77', 20), roughness: 0.9 }),
  houseBody: new MeshStandardMaterial({ map: createNoiseTexture('#f5deb3', 10), roughness: 0.8 }),
  houseRoof: new MeshStandardMaterial({ map: createNoiseTexture('#e07a5f', 20), roughness: 0.7 }),
  door: new MeshStandardMaterial({ color: 0x8b4513 }),
  window: new MeshStandardMaterial({ color: 0x444444, emissive: 0x000000 }),
  trunk: new MeshStandardMaterial({ map: createNoiseTexture('#5a3a2a', 40), roughness: 1.0 }),
  leaves1: new MeshStandardMaterial({ color: 0x88dd88, roughness: 0.9, flatShading: true }),
  leaves2: new MeshStandardMaterial({ color: 0x55aa55, roughness: 0.9, flatShading: true }),
  rabbit: new MeshStandardMaterial({ color: 0xffb7b2, roughness: 0.7 }),
  bear: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  rock: new MeshStandardMaterial({ color: 0x888888, roughness: 0.8, flatShading: true }),
  ring: new MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.0, side: 2 }), // DoubleSide
  blade: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
}

// --- 物体生成函数 ---

// 创建星空背景
function createStars() {
  const starGeo = new BufferGeometry()
  const pos = []
  for (let i = 0; i < 500; i++) {
    pos.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80)
  }
  starGeo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  const material = new PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.6 })
  return new Points(starGeo, material)
}

// 创建一棵树（树干 + 树叶）
function createOrganicTree(scale = 1.0) {
  const group = new Group()
  const trunkHeight = 0.8 * scale
  const trunkGeo = new CylinderGeometry(0.06 * scale, 0.12 * scale, trunkHeight, 7)
  trunkGeo.translate(0, trunkHeight / 2, 0)
  const trunk = new Mesh(trunkGeo, mats.trunk)
  trunk.castShadow = true
  trunk.receiveShadow = true
  trunk.rotation.x = (Math.random() - 0.5) * 0.2
  trunk.rotation.z = (Math.random() - 0.5) * 0.2
  group.add(trunk)

  const foliageGroup = new Group()
  foliageGroup.position.y = trunkHeight * 0.9
  const mainSize = 0.5 * scale
  const mainLeaf = new Mesh(new DodecahedronGeometry(mainSize, 0), mats.leaves1)
  mainLeaf.castShadow = true
  mainLeaf.receiveShadow = true
  foliageGroup.add(mainLeaf)

  const subLeafCount = 4 + Math.floor(Math.random() * 3)
  const subGeo = new DodecahedronGeometry(mainSize * 0.6, 0)
  for (let i = 0; i < subLeafCount; i++) {
    const mat = Math.random() > 0.5 ? mats.leaves1 : mats.leaves2
    const mesh = new Mesh(subGeo, mat)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const r = mainSize * 0.7
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 0.8 + 0.1,
      r * Math.sin(phi) * Math.sin(theta),
    )
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    mesh.castShadow = true
    mesh.receiveShadow = true
    foliageGroup.add(mesh)
  }
  group.add(foliageGroup)
  return group
}

// 创建生态地块（包含树、石头、草丛）
function createEcosystemPatch(scale = 1.0) {
  const group = new Group()
  const tree = createOrganicTree(1.0)
  group.add(tree)

  const rockCount = 2 + Math.floor(Math.random() * 2)
  const rockGeo = new DodecahedronGeometry(0.2, 0)
  for (let i = 0; i < rockCount; i++) {
    const rock = new Mesh(rockGeo, mats.rock)
    const r = 0.4 + Math.random() * 0.4
    const theta = Math.random() * Math.PI * 2
    rock.position.set(r * Math.cos(theta), 0.1, r * Math.sin(theta))
    rock.scale.setScalar(0.5 + Math.random() * 0.5)
    rock.rotation.set(Math.random(), Math.random(), Math.random())
    rock.castShadow = true
    group.add(rock)
  }

  const grassCount = 3 + Math.floor(Math.random() * 3)
  const bladeGeo = new ConeGeometry(0.05, 0.2, 3)
  bladeGeo.translate(0, 0.1, 0)
  for (let i = 0; i < grassCount; i++) {
    const grassTuft = new Group()
    for (let k = 0; k < 3; k++) {
      const blade = new Mesh(bladeGeo, mats.leaves1)
      blade.rotation.x = (Math.random() - 0.5) * 0.5
      blade.rotation.z = (Math.random() - 0.5) * 0.5
      blade.position.x = (Math.random() - 0.5) * 0.05
      grassTuft.add(blade)
    }
    const r = 0.5 + Math.random() * 0.5
    const theta = Math.random() * Math.PI * 2
    grassTuft.position.set(r * Math.cos(theta), 0, r * Math.sin(theta))
    grassTuft.rotation.y = Math.random() * Math.PI
    group.add(grassTuft)
  }
  return group
}

// 创建房子
function createCompactHouse(refs: any) {
  const group = new Group()
  const scale = 1.0
  const bodyH = 0.8 * scale
  const bodyW = 1.1 * scale
  const bodyGeo = new BoxGeometry(bodyW, bodyH, bodyW)
  bodyGeo.translate(0, bodyH / 2, 0)
  const body = new Mesh(bodyGeo, mats.houseBody)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const roofH = 0.8 * scale
  const roofW = 1.0 * scale
  const roofGeo = new ConeGeometry(roofW, roofH, 4)
  roofGeo.translate(0, roofH / 2, 0)
  const roof = new Mesh(roofGeo, mats.houseRoof)
  roof.position.y = bodyH - 0.1
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  roof.receiveShadow = true
  group.add(roof)

  const chimGeo = new BoxGeometry(0.25 * scale, 0.4 * scale, 0.25 * scale)
  const chim = new Mesh(chimGeo, mats.door)
  chim.position.set(0.3 * scale, bodyH + 0.3 * scale, -0.2 * scale)
  chim.castShadow = true
  group.add(chim)

  const doorGeo = new PlaneGeometry(0.35 * scale, 0.5 * scale)
  const door = new Mesh(doorGeo, mats.door)
  door.position.set(0, 0.3 * scale, bodyW / 2 + 0.01)
  group.add(door)

  // 窗户 (需要保存引用以控制发光)
  const winGeo = new PlaneGeometry(0.3 * scale, 0.3 * scale)
  refs.windowMesh = new Mesh(winGeo, mats.window)
  refs.windowMesh.position.set(0.61 * scale, 0.5 * scale, 0)
  refs.windowMesh.rotation.y = Math.PI / 2
  group.add(refs.windowMesh)

  return group
}

// 创建风车
function createWindmill() {
  const group = new Group()
  const scale = 1.2
  const tower = new Mesh(new CylinderGeometry(0.15 * scale, 0.3 * scale, 1.5 * scale, 8), mats.houseBody)
  tower.position.y = 0.75 * scale
  tower.castShadow = true
  tower.receiveShadow = true
  group.add(tower)

  const roof = new Mesh(new ConeGeometry(0.25 * scale, 0.5 * scale, 8), mats.houseRoof)
  roof.position.y = 1.5 * scale + 0.25 * scale
  roof.castShadow = true
  group.add(roof)

  const rotorGroup = new Group()
  rotorGroup.position.set(0, 1.3 * scale, 0.2 * scale)
  rotorGroup.rotation.x = -0.1
  const hub = new Mesh(new CylinderGeometry(0.05 * scale, 0.05 * scale, 0.2 * scale, 8, 1, false, 0, Math.PI * 2), mats.door)
  hub.rotation.x = Math.PI / 2
  rotorGroup.add(hub)

  const bladeGeo = new BoxGeometry(0.15 * scale, 1.2 * scale, 0.02 * scale)
  bladeGeo.translate(0, 0.6 * scale, 0)
  for (let i = 0; i < 4; i++) {
    const blade = new Mesh(bladeGeo, mats.blade)
    blade.rotation.z = i * (Math.PI / 2)
    blade.castShadow = true
    rotorGroup.add(blade)
  }
  group.add(rotorGroup)

  const rockGeo = new DodecahedronGeometry(0.15 * scale, 0)
  for (let i = 0; i < 3; i++) {
    const rock = new Mesh(rockGeo, mats.rock)
    const angle = Math.random() * Math.PI * 2
    const r = 0.4 * scale
    rock.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
    group.add(rock)
  }
  return { group, rotor: rotorGroup }
}

// 创建角色 (兔子或熊)
function createCuteCharacter(type: 'rabbit' | 'bear') {
  const group = new Group()
  const scale = 0.8
  const mat = type === 'rabbit' ? mats.rabbit : mats.bear
  const bodyRadius = 0.45 * scale
  const bodyGeo = new SphereGeometry(bodyRadius, 16, 16)
  bodyGeo.translate(0, bodyRadius, 0)
  const body = new Mesh(bodyGeo, mat)
  body.castShadow = true
  group.add(body)

  const headRadius = 0.4 * scale
  const headGeo = new SphereGeometry(headRadius, 16, 16)
  const head = new Mesh(headGeo, mat)
  head.position.y = bodyRadius * 1.6
  head.castShadow = true
  group.add(head)

  if (type === 'rabbit') {
    const earGeo = new CylinderGeometry(0.1 * scale, 0.1 * scale, 0.6 * scale, 8)
    const ear1 = new Mesh(earGeo, mat)
    ear1.position.set(-0.2 * scale, head.position.y + 0.4 * scale, 0)
    ear1.rotation.z = -0.2
    group.add(ear1)
    const ear2 = ear1.clone()
    ear2.position.set(0.2 * scale, head.position.y + 0.4 * scale, 0)
    ear2.rotation.z = 0.2
    group.add(ear2)
  } else {
    const earGeo = new SphereGeometry(0.15 * scale, 8, 8)
    const ear1 = new Mesh(earGeo, mat)
    ear1.position.set(-0.35 * scale, head.position.y + 0.3 * scale, 0)
    group.add(ear1)
    const ear2 = ear1.clone()
    ear2.position.set(0.35 * scale, head.position.y + 0.3 * scale, 0)
    group.add(ear2)
  }
  return group
}

// --- 核心渲染器 ---

export function createPlanetRenderer(input: {
  host: HTMLDivElement
  canvas: HTMLCanvasElement
  stages: Stage[]
  stageIndex: number
}) {
  const { host, canvas } = input

  // 引用对象 (Refs) 用于存储需要更新的场景物体
  const refs: any = {
    grassMesh: null,
    planetMesh: null,
    ringMesh: null,
    ringGlowMesh: null,
    houseGroup: null,
    windowMesh: null,
    windmillGroup: null,
    windmillRotor: null,
    charactersGroup: null,
    treeGroups: [],
    starsPoints: null,
    lights: {
      ambient: null,
      sun: null,
      moon: null,
    },
    particles: [],
  }

  // 内部状态
  let dayCount = 0

  // --- 初始化场景 ---
  const scene = new Scene()
  scene.background = new Color('#050510')
  scene.fog = new FogExp2(0x050510, 0.04)

  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 4, 12)

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 18
  controls.maxPolarAngle = Math.PI / 2 // 限制只能在赤道及以上视角观察，防止翻转到南极
  controls.minPolarAngle = Math.PI / 3 // 限制最小视角，防止完全俯视
  controls.enablePan = false // 禁止平移，保持星球在中心
  // controls.minAzimuthAngle = -Infinity // 允许水平无限旋转
  // controls.maxAzimuthAngle = Infinity

  // --- 初始化灯光 ---
  // 环境光
  refs.lights.ambient = new AmbientLight(0xfff4e5, 0.18) // 降低环境光，增加明暗对比
  scene.add(refs.lights.ambient)

  // 主光/正光 (模拟太阳)
  refs.lights.sun = new DirectionalLight(0xffce84, 7.5) // 更接近日光的暖白色
  refs.lights.sun.position.set(-10, 12, -1) // 从左上方照射
  refs.lights.sun.castShadow = true
  refs.lights.sun.shadow.mapSize.width = 2048
  refs.lights.sun.shadow.mapSize.height = 2048
  refs.lights.sun.shadow.bias = -0.0001
  scene.add(refs.lights.sun)

  // 辅光/侧光 (模拟环境反射/星光)
  refs.lights.moon = new DirectionalLight(0x4466cc, 0.55) // 冷色辅光，照亮暗部
  refs.lights.moon.position.set(5, 10, 5)  // 从左侧照射
  scene.add(refs.lights.moon)

  // 边缘光/轮廓光 (逆光)
  const rimLight = new DirectionalLight(0x4488ff, 0.9) // 强烈的冷色轮廓光
  rimLight.position.set(0, 5, -10) // 从正后上方照射
  scene.add(rimLight)

  // 焦点光 (左上角高光)
  const spotLight = new SpotLight(0xfff4e5, 640.0) // 增强强度以弥补范围缩小
  spotLight.position.set(-6, 8, 4) // 调整位置，使其更靠近左侧上方
  spotLight.angle = Math.PI / 11.5 // 更窄的角度 (15度)，使光束更集中
  spotLight.penumbra = 0.3 // 边缘稍微硬一点  0.0 到 1.0
  spotLight.decay = 2 // 物理衰减 
  spotLight.distance = 50
  spotLight.target.position.set(0, 0, 0) // 指向星球中心
  scene.add(spotLight)
  scene.add(spotLight.target)

  refs.starsPoints = createStars()
  scene.add(refs.starsPoints)

  // --- 构建星球世界 ---
  const planetGroup = new Group()
  scene.add(planetGroup)
  refs.planetGroup = planetGroup

  const planetRadius = PLANET_RADIUS_BASE
  const grassRadius = 3.05

  const planetGeo = new SphereGeometry(planetRadius, 128, 128) // 提高分段数保证圆润

  refs.planetMesh = new Mesh(planetGeo, mats.planet)
  refs.planetMesh.receiveShadow = true
  planetGroup.add(refs.planetMesh)

  const grassGeo = new SphereGeometry(grassRadius, 128, 128)

  refs.grassMesh = new Mesh(grassGeo, mats.grass)
  refs.grassMesh.receiveShadow = true
  refs.grassMesh.scale.set(0.01, 0.01, 0.01)
  refs.grassMesh.visible = false
  planetGroup.add(refs.grassMesh)

  // 种植树木
  const treeCount = 15
  for (let i = 0; i < treeCount; i++) {
    let normal
    let attempts = 0
    do {
      const phi = Math.random() * Math.PI
      const theta = Math.random() * Math.PI * 2
      normal = new Vector3().setFromSphericalCoords(1, phi, theta)
      attempts++
    } while (normal.y < 0.1 && attempts < 20) // 避免生成在两极太陡峭的地方

    if (normal.y > 0.85) continue

    const { pos, quaternion } = getSurfaceTransform(normal, grassRadius - 0.1)
    const scale = 0.8 + Math.random() * 0.5
    const ecosystem = createEcosystemPatch(scale)
    ecosystem.position.copy(pos)
    ecosystem.setRotationFromQuaternion(quaternion)
    ecosystem.rotateY(Math.random() * Math.PI * 2)
    ecosystem.visible = false
    ecosystem.scale.set(0, 0, 0)
    ecosystem.userData.targetScale = scale
    planetGroup.add(ecosystem)
    refs.treeGroups.push(ecosystem)
  }

  // 放置房子
  const houseNormal = new Vector3(0.1, 1, -0.2).normalize()
  const houseTrans = getSurfaceTransform(houseNormal, grassRadius - 0.1)
  refs.houseGroup = createCompactHouse(refs)
  refs.houseGroup.position.copy(houseTrans.pos)
  refs.houseGroup.setRotationFromQuaternion(houseTrans.quaternion)
  refs.houseGroup.visible = false
  refs.houseGroup.scale.set(0, 0, 0)
  planetGroup.add(refs.houseGroup)

  // 放置风车
  const windmillNormal = new Vector3(-0.2, 0.9, -0.5).normalize()
  const windmillTrans = getSurfaceTransform(windmillNormal, grassRadius - 0.1)
  const windmillData = createWindmill()
  refs.windmillGroup = windmillData.group
  refs.windmillRotor = windmillData.rotor
  refs.windmillGroup.position.copy(windmillTrans.pos)
  refs.windmillGroup.setRotationFromQuaternion(windmillTrans.quaternion)
  refs.windmillGroup.rotateY(-Math.PI / 4)
  refs.windmillGroup.visible = false
  refs.windmillGroup.scale.set(0, 0, 0)
  planetGroup.add(refs.windmillGroup)

  // 放置角色
  const charNormal = new Vector3(-0.2, 1, 0.3).normalize()
  const charTrans = getSurfaceTransform(charNormal, grassRadius)
  refs.charactersGroup = new Group()
  const rabbit = createCuteCharacter('rabbit')
  rabbit.position.set(-0.5, 0, 0)
  refs.charactersGroup.add(rabbit)
  const bear = createCuteCharacter('bear')
  bear.position.set(0.5, 0, 0)
  refs.charactersGroup.add(bear)
  refs.charactersGroup.position.copy(charTrans.pos)
  refs.charactersGroup.setRotationFromQuaternion(charTrans.quaternion)
  refs.charactersGroup.visible = false
  refs.charactersGroup.scale.set(0, 0, 0)
  planetGroup.add(refs.charactersGroup)

  // 放置光环
  const ringGeo = new RingGeometry(4.2, 4.4, 128)
  refs.ringMesh = new Mesh(ringGeo, mats.ring)
  refs.ringMesh.rotation.x = Math.PI / 2 + 0.4
  refs.ringMesh.rotation.y = -0.2
  planetGroup.add(refs.ringMesh)

  const ringGlowGeo = new RingGeometry(4.0, 4.8, 128)
  refs.ringGlowMesh = new Mesh(ringGlowGeo, mats.ring.clone())
  refs.ringGlowMesh.material.opacity = 0
  refs.ringGlowMesh.rotation.copy(refs.ringMesh.rotation)
  planetGroup.add(refs.ringGlowMesh)

  // --- 放置小岩石 ---
  // 需求：上1/3部分，位置固定（使用固定种子），大小不一，分布不均匀（聚类），美观
  const rockModels = [
    '/models/Pebble_Round_1.gltf',
    '/models/Pebble_Round_4.gltf',
    '/models/Rock_Medium_1.gltf',
    '/models/Rock_Medium_2.gltf',
  ]
  const rocksGroup = new Group()
  planetGroup.add(rocksGroup)
  refs.rocksGroup = rocksGroup
  
  // 确保岩石组本身是可见的
  rocksGroup.visible = true;

  const rng = new SeededRandom(20231027) // 固定种子

  // 预加载模型并生成岩石
  Promise.all(rockModels.map(url => new Promise<Group>((resolve) => {
    gltfLoader.load(url, (gltf) => {
      resolve(gltf.scene)
    }, undefined, (error) => {
      console.warn(`Failed to load rock model: ${url}`, error)
      resolve(new Group()) // 出错时返回空组，避免阻塞
    })
  }))).then(loadedModels => {
    // 过滤掉加载失败的模型
    const validModels = loadedModels.filter(m => m.children.length > 0)
    
    if (validModels.length === 0) return

    // 泥土色/岩石色材质，略微粗糙
  const rockMaterial = new MeshStandardMaterial({
    color: 0x8b7e66, // 泥土色 (Stone/Earth tone)
    roughness: 0.9,
    flatShading: true
  });

  // 1. 生成聚类岩石 (Cluster)
    const clusterCount = 6 // 6个岩石堆
    for (let i = 0; i < clusterCount; i++) {
      // 簇中心：限制在上1/3
      // phi: 0 (北极) -> PI (南极)。上1/3大约是 0 -> PI/3
      // 为了分布在“上部”，我们限制 phi 在 0.2 到 1.0 之间 (约11度到57度)，避开极点和赤道
      const clusterPhi = rng.range(0.2, 1.0)
      const clusterTheta = rng.range(0, Math.PI * 2)
      
      // 每个簇包含的岩石数量
      const rocksInCluster = Math.floor(rng.range(3, 8))
      
      for (let j = 0; j < rocksInCluster; j++) {
        // 在中心附近随机偏移，形成聚类
        // 使用正态分布近似或简单偏移
        const offsetPhi = (rng.next() - 0.5) * 0.3 // 偏移范围
        const offsetTheta = (rng.next() - 0.5) * 0.3

        let phi = clusterPhi + offsetPhi
        let theta = clusterTheta + offsetTheta
        
        // 边界检查
        if (phi < 0.1) phi = 0.1
        if (phi > 1.2) phi = 1.2 // 稍微放宽一点边界

        const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
        
        // 随机选择模型
        const modelIndex = Math.floor(rng.range(0, validModels.length))
        const originalModel = validModels[modelIndex]
        const rock = originalModel.clone()

        // 随机大小 (Pebble通常比较小，Rock_Medium比较大)
        // 限制最大体积，减小缩放比例
        const baseScale = rockModels[modelIndex].includes('Pebble') ? 0.15 : 0.08
        const randomScale = baseScale * rng.range(0.8, 1.5) // 随机波动
        
        rock.scale.setScalar(randomScale)

        // 放置在表面 (修正：不再减去偏移量，改为紧贴或稍微浮出一点以避免穿模)
        // 实际上模型原点可能在中心，需要根据包围盒调整，但简单起见，我们不再减去 randomScale
        const { pos, quaternion } = getSurfaceTransform(normal, planetRadius)
        rock.position.copy(pos)
        rock.setRotationFromQuaternion(quaternion)

        // 随机自转
        rock.rotateX(rng.range(0, Math.PI))
        rock.rotateY(rng.range(0, Math.PI))
        rock.rotateZ(rng.range(0, Math.PI))

        // 确保岩石可见
        rock.visible = true;

        // 开启阴影并应用材质
        rock.traverse((child) => {
          if ((child as Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true;
            // 应用泥土色材质
            (child as Mesh).material = rockMaterial
            // 确保mesh本身也是可见的
            child.visible = true;
          }
        })

        rocksGroup.add(rock)
      }
    }

    // 2. 生成散落岩石 (Scattered)
    const scatteredCount = 12
    for (let k = 0; k < scatteredCount; k++) {
      const phi = rng.range(0.1, 1.1) // 同样限制在上部区域
      const theta = rng.range(0, Math.PI * 2)
      
      const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
      
      const modelIndex = Math.floor(rng.range(0, validModels.length))
      const rock = validModels[modelIndex].clone()
      
      // 限制最大体积
      const baseScale = rockModels[modelIndex].includes('Pebble') ? 0.12 : 0.06
      const randomScale = baseScale * rng.range(0.8, 1.2)
      rock.scale.setScalar(randomScale)

      const { pos, quaternion } = getSurfaceTransform(normal, planetRadius)
      rock.position.copy(pos)
      rock.setRotationFromQuaternion(quaternion)
      rock.rotateY(rng.range(0, Math.PI * 2))

      // 确保岩石可见
      rock.visible = true;

      rock.traverse((child) => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true;
           // 应用泥土色材质
           (child as Mesh).material = rockMaterial
           // 确保mesh本身也是可见的
           child.visible = true;
        }
      })
      
      rocksGroup.add(rock)
    }
  })


  // 更新视觉元素：根据天数控制物体的显示/隐藏和缩放
  function updateVisuals() {
    // 1. 草地 (Day 3+)
    if (dayCount >= 3) {
      if (!refs.grassMesh.visible) refs.grassMesh.visible = true
      let grassProgress = (dayCount - 3) / 7
      grassProgress = Math.max(0, Math.min(1, grassProgress))
      refs.grassMesh.userData.targetScale = 0.8 + grassProgress * 0.2
    } else {
      refs.grassMesh.visible = false
    }

    // 2. 树木 (Day 10+)
    if (dayCount >= 10) {
      const treeDays = dayCount - 10
      const treesToShow = Math.min(Math.floor(treeDays) + 1, refs.treeGroups.length)
      for (let i = 0; i < refs.treeGroups.length; i++) {
        const tree = refs.treeGroups[i]
        if (i < treesToShow) {
          if (!tree.visible) {
            tree.visible = true
            tree.scale.set(0.1, 0.1, 0.1)
          }
        } else {
          // 还没长出来的树保持隐藏
        }
      }
    } else {
      refs.treeGroups.forEach((t: any) => t.visible = false)
    }

    // 3. 房子 (Day 22+)
    if (dayCount >= 22) {
      if (!refs.houseGroup.visible) {
        refs.houseGroup.visible = true
        refs.houseGroup.scale.set(0.1, 0.1, 0.1)
      }
    } else {
      refs.houseGroup.visible = false
    }

    // 4. 风车 (Day 30+)
    if (dayCount >= 30) {
      if (!refs.windmillGroup.visible) {
        refs.windmillGroup.visible = true
        refs.windmillGroup.scale.set(0.1, 0.1, 0.1)
      }
    } else {
      refs.windmillGroup.visible = false
    }

    // 5. 角色与光环 (Day 35+)
    if (dayCount >= 35) {
      if (!refs.charactersGroup.visible) {
        refs.charactersGroup.visible = true
        refs.charactersGroup.scale.set(0.1, 0.1, 0.1)
      }
      const ringProgress = Math.min((dayCount - 35) / 15, 1)
      refs.ringMesh.material.opacity = ringProgress * 0.6
      refs.ringGlowMesh.material.opacity = ringProgress * 0.3
    } else {
      refs.charactersGroup.visible = false
      refs.ringMesh.material.opacity = 0
      refs.ringGlowMesh.material.opacity = 0
    }

    // 触发一次时间更新，确保窗户灯光状态正确
    // updateTimeOfDay(timeOfDay)
  }

  // 创建点击反馈粒子
  function createParticle() {
    const geo = new DodecahedronGeometry(0.1, 0)
    const mat = new MeshBasicMaterial({ color: 0xffdd44 })
    const mesh = new Mesh(geo, mat)
    const angle = Math.random() * Math.PI * 2
    const r = 3.5
    mesh.position.set(
      Math.cos(angle) * r,
      (Math.random() - 0.5) * 4,
      Math.sin(angle) * r,
    )
    mesh.userData.velocity = new Vector3(
      (Math.random() - 0.5) * 0.1,
      0.1 + Math.random() * 0.1,
      (Math.random() - 0.5) * 0.1,
    )
    mesh.userData.life = 1.0
    scene.add(mesh)
    refs.particles.push(mesh)
  }

  // 触发点击时的震动和粒子效果
  function triggerClickFeedback() {
    if (refs.planetGroup) refs.planetGroup.scale.set(1.02, 1.02, 1.02)
    for (let i = 0; i < 5; i++) createParticle()
  }

  // --- 动画循环 ---
  let rafId: number | null = null
  const loop = () => {
    rafId = window.requestAnimationFrame(loop)
    controls.update()

    // 星球自转
    if (refs.planetGroup) {
      refs.planetGroup.rotation.y += 0.002
      refs.planetGroup.scale.lerp(new Vector3(1, 1, 1), 0.1)
    }

    // 平滑缩放草地
    if (refs.grassMesh && refs.grassMesh.visible) {
      const target = refs.grassMesh.userData.targetScale || 0.01
      refs.grassMesh.scale.lerp(new Vector3(target, target, target), 0.05)
    }

    // 平滑缩放树木
    refs.treeGroups.forEach((tree: any) => {
      if (tree.visible) {
        const target = tree.userData.targetScale || 1
        tree.scale.lerp(new Vector3(target, target, target), 0.05)
      }
    })

    // 平滑缩放房子
    if (refs.houseGroup && refs.houseGroup.visible) {
      refs.houseGroup.scale.lerp(new Vector3(1, 1, 1), 0.05)
    }

    // 平滑缩放风车并旋转叶片
    if (refs.windmillGroup && refs.windmillGroup.visible) {
      refs.windmillGroup.scale.lerp(new Vector3(1, 1, 1), 0.05)
      if (refs.windmillRotor) refs.windmillRotor.rotation.z -= 0.03
    }

    // 平滑缩放角色并添加浮动动画
    if (refs.charactersGroup && refs.charactersGroup.visible) {
      refs.charactersGroup.scale.lerp(new Vector3(1, 1, 1), 0.05)
      refs.charactersGroup.children.forEach((child: any, idx: number) => {
        child.position.y = Math.sin(Date.now() * 0.005 + idx) * 0.05
      })
    }

    // 更新粒子
    for (let i = refs.particles.length - 1; i >= 0; i--) {
      const p = refs.particles[i]
      p.position.add(p.userData.velocity)
      p.rotation.x += 0.1
      p.userData.life -= 0.02
      p.material.opacity = p.userData.life
      p.material.transparent = true
      if (p.userData.life <= 0) {
        scene.remove(p)
        refs.particles.splice(i, 1)
      }
    }

    renderer.render(scene, camera)
  }

  // 监听窗口大小变化
  const resizeObserver = new ResizeObserver((entries) => {
    const cr = entries[0]?.contentRect
    if (!cr) return
    renderer.setSize(cr.width, cr.height, false)
    camera.aspect = cr.width / Math.max(1, cr.height)
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(host)

  // 启动
  // updateTimeOfDay(12)
  updateVisuals()
  rafId = window.requestAnimationFrame(loop)

  // 返回外部控制接口
  return {
    setStageIndex(idx: number) {
      // 已废弃，改用 setDayCount
    },
    setDayCount(count: number) {
      if (Math.floor(count) > Math.floor(dayCount)) {
        triggerClickFeedback();
      }
      dayCount = count
      updateVisuals()
    },
    // setTimeOfDay(hour: number) {
    //   updateTimeOfDay(hour)
    // },
    dispose() {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}
