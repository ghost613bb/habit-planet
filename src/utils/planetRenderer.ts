import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  PCFSoftShadowMap, // 添加 PCFSoftShadowMap
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  InstancedMesh,
  Matrix4,
  Quaternion,
  MeshLambertMaterial,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { SeededRandom, getSurfaceTransform } from './planet/math/PlanetMath'
import { mats } from './planet/assets/Materials'
import { setupLights } from './planet/core/Lights'
import StageManager from './planet/stages'
import { TerrainLayer } from './planet/layers/TerrainLayer'
import { VegetationLayer } from './planet/layers/VegetationLayer'
import { createLegacyStageSceneController } from './planet/runtime/legacyStageSceneController'
import { createLayerSceneController } from './planet/runtime/layerSceneController'
import { createStageOrchestrator } from './planet/runtime/stageOrchestrator'

export type { Stage } from './planet/types'

const PLANET_RADIUS_BASE = 3.0

// --- 纹理加载 ---
const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()


// 加载压缩后的 JPG 纹理，使用浏览器硬件解码加速
textureLoader.load('/textures/lroc_color_16bit_srgb_4k2.jpg', (texture) => {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.map = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.warn('Failed to load JPG color texture:', err))

textureLoader.load('/textures/ldem_16_uint2.jpg', (texture) => {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.displacementMap = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.warn('Failed to load JPG displacement texture:', err))

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

// --- 核心渲染器 ---

export function createPlanetRenderer(input: {
  host?: HTMLDivElement
  canvas: HTMLCanvasElement
  dayCount: number
  timeOfDay?: number
  stages?: unknown
  stageIndex?: number
}) {
  const { canvas, dayCount: initialDayCount, timeOfDay = 12 } = input
  const host = input.host ?? (canvas.parentElement as HTMLDivElement)
  let dayCount = initialDayCount
  let stageManager: StageManager;
  let replaySnapshotDayCount = initialDayCount

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

  // --- 初始化场景 ---
  const scene = new Scene()
  scene.background = new Color('#050510')
  scene.fog = new FogExp2(0x050510, 0.04)
  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 4, 12)

  const renderer = new WebGLRenderer({
    canvas,
    // 恢复抗锯齿：关闭抗锯齿会导致细小的草地模型在旋转时发生严重的像素闪烁（即你看到的“零零碎碎的动态”）
    antialias: true,
    alpha: true,
    // 优化：使用 default 而非 high-performance，避免双显卡设备切换独显带来的 500ms 延迟
    powerPreference: 'default',
    // 优化：禁用保留缓冲区。这能让 WebGL 上下文初始化更快，且在某些设备上避免不必要的内存拷贝
    preserveDrawingBuffer: false,
    // 优化：明确不使用深度对数缓冲，减少片段着色器计算
    logarithmicDepthBuffer: false,
    // 优化：对于 getContext 长任务的终极优化。明确告知浏览器不关心模板缓冲和深度缓冲中多余的精度
    stencil: false,
    depth: true
  })
  
  // 优化：对于低端设备，强制使用 webgl1（如果浏览器初始化 webgl2 过慢）
  // 虽然 Three.js 默认优先 webgl2，但在某些显卡驱动上获取 webgl2 上下文非常耗时
  // 考虑到我们的项目不依赖 webgl2 的高级特性，这个参数可以加快 getContext 速度
  // 严格限制像素比例为 1，配合抗锯齿，既能保证画质不闪烁，又能大幅降低高分屏的像素填充压力
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = SRGBColorSpace
  // 关闭阴影
  renderer.shadowMap.enabled = false

  // 修复 CLS (Cumulative Layout Shift)：确保 Canvas 有固定的块级布局，防止加载时发生尺寸跳动
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 18
  controls.maxPolarAngle = Math.PI / 2 // 限制只能在赤道及以上视角观察，防止翻转到南极
  controls.minPolarAngle = Math.PI / 3 // 限制最小视角，防止完全俯视
  controls.enablePan = false // 禁止平移，保持星球在中心
  // controls.minAzimuthAngle = -Infinity // 允许水平无限旋转

  // --- 初始化灯光 ---
  const lights = setupLights(scene)
  Object.assign(refs.lights, lights)

  refs.starsPoints = createStars()
  scene.add(refs.starsPoints)

  // --- 构建星球世界 ---
  const planetGroup = new Group()
  scene.add(planetGroup)
  refs.planetGroup = planetGroup

  const planetRadius = PLANET_RADIUS_BASE
  const grassRadius = 3.05

  // 优化：使用 128x128 分段的球体几何体，平衡性能和细节
  const planetGeo = new SphereGeometry(planetRadius, 128, 128)

  // 调整星球形状：通过修改几何体顶点来实现
  // 需求：上1/3部分稍微平坦，整体呈椭球状
  const positions = planetGeo.attributes.position
  const normals = planetGeo.attributes.normal
  const v = new Vector3()
  const n = new Vector3()
  // 基础压扁比例 (原 0.92)
  const baseScaleY = 0.92
  // 顶部额外压扁比例 (使上部更平坦)
  const topFlattenScale = 0.80 

  if (positions && normals) {
    // 优化：使用底层的 TypedArray 直接操作 1.6 万个顶点，避免大量的对象方法调用
    // 这将极大地缩短初始化时长，消除 Long Task 阻塞
    const posArray = positions.array as Float32Array;
    const normArray = normals.array as Float32Array;
    
    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3;
      const vx = posArray[idx];
      const vy = posArray[idx + 1];
      const vz = posArray[idx + 2];

      let yScale = baseScaleY
      // 对上半球应用额外的压扁，模拟"顶部平坦"的效果
      if (vy > 0) {
        yScale *= topFlattenScale
      }
      
      const newY = vy * yScale;
      posArray[idx + 1] = newY;

      // 手动计算法线以修复接缝问题
      // 使用椭球体法线公式：(x, y/scale^2, z)
      const nx = vx;
      const ny = newY / (yScale * yScale);
      const nz = vz;
      
      // normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normArray[idx] = nx / len;
      normArray[idx + 1] = ny / len;
      normArray[idx + 2] = nz / len;
    }
    positions.needsUpdate = true
    normals.needsUpdate = true
  }

  refs.planetMesh = new Mesh(planetGeo, mats.planet)
  refs.planetMesh.castShadow = false
  refs.planetMesh.receiveShadow = false
  refs.planetMesh.scale.set(1, 1, 1)
  planetGroup.add(refs.planetMesh)

  const grassGeo = new SphereGeometry(grassRadius, 64, 64)

  refs.grassMesh = new Mesh(grassGeo, mats.grass)
  refs.grassMesh.receiveShadow = false
  refs.grassMesh.scale.set(0.01, 0.01, 0.01)
  refs.grassMesh.visible = false
  planetGroup.add(refs.grassMesh)

  // 初始化阶段管理器和过渡场景编排器
  stageManager = new StageManager(scene, planetGroup)
  const legacySceneController = createLegacyStageSceneController(stageManager)
  const terrainLayer = new TerrainLayer({
    parentGroup: planetGroup,
    grassMesh: refs.grassMesh,
    planetRadius,
  })
  const vegetationLayer = new VegetationLayer({
    parentGroup: planetGroup,
    planetRadius,
  })
  const layerSceneController = createLayerSceneController({
    layers: [terrainLayer, vegetationLayer],
    legacyController: legacySceneController,
  })
  const orchestrator = createStageOrchestrator(layerSceneController)

  // 粒子对象池
  const particlePool: Mesh[] = [];

  // 创建点击反馈粒子
  function createParticle() {
    let mesh: Mesh;
    if (particlePool.length > 0) {
      mesh = particlePool.pop()!;
    } else {
      const geo = new DodecahedronGeometry(0.1, 0);
      const mat = new MeshBasicMaterial({ color: 0xffdd44 });
      mesh = new Mesh(geo, mat);
    }
    
    // 随机位置（在星球表面附近）
    const phi = Math.random() * Math.PI;
    const theta = Math.random() * Math.PI * 2;
    const { pos } = getSurfaceTransform(new Vector3().setFromSphericalCoords(1, phi, theta), PLANET_RADIUS_BASE);
    mesh.position.copy(pos.multiplyScalar(1.05)); // 稍微飞起来一点
    
    scene.add(mesh);
    refs.particles.push(Object.assign(mesh, {
      userData: {
        velocity: new Vector3((Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05),
        life: 1.0
      }
    }));
  }

  function triggerClickFeedback() {
    for(let i=0; i<5; i++) createParticle();
    // 简单的弹跳动画
    if (refs.planetGroup) {
      refs.planetGroup.scale.set(1.05, 1.05, 1.05);
    }
  }

  // 预分配复用的 Vector3，避免渲染循环每帧 GC 分配
  const _scaleTarget = new Vector3(1, 1, 1);

  let rafId: number;
  function loop() {
    rafId = window.requestAnimationFrame(loop);
    controls.update();

    // 简单的自转
    planetGroup.rotation.y += 0.0005;

    // 简单的回弹动画
    if (refs.planetGroup && refs.planetGroup.scale.x > 1.001) {
      refs.planetGroup.scale.lerp(_scaleTarget, 0.1);
    }

    // 更新粒子
    for (let i = refs.particles.length - 1; i >= 0; i--) {
      const p = refs.particles[i];
      p.position.add(p.userData.velocity);
      p.rotation.x += 0.1;
      p.userData.life -= 0.02;
      p.material.opacity = p.userData.life;
      p.material.transparent = true;
      if (p.userData.life <= 0) {
        scene.remove(p);
        particlePool.push(p); // 回收粒子到对象池
        refs.particles.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }
  
  // 预编译材质和着色器，避免首次渲染卡顿
  renderer.compile(scene, camera);

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
  rafId = window.requestAnimationFrame(loop)

  // 返回外部控制接口
  return {
    setDayCount(count: number) {
      const oldDayCount = dayCount;
      if (Math.floor(count) > Math.floor(oldDayCount)) {
        triggerClickFeedback();
      }
      dayCount = count;
      replaySnapshotDayCount = dayCount
      orchestrator.update(dayCount)
    },
    jumpToDayCount(count: number) {
      dayCount = count
      replaySnapshotDayCount = dayCount
      orchestrator.jump(dayCount)
    },
    replayCurrentTransition() {
      orchestrator.jump(replaySnapshotDayCount)
    },
    dispose() {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      terrainLayer.dispose()
      vegetationLayer.dispose()
      renderer.dispose();
      // 清理阶段管理器
      if (stageManager) {
        stageManager.cleanup();
      }
    },
  }
}
