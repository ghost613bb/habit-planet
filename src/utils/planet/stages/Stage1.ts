import * as THREE from 'three';
import { Group, Scene, Object3D, Vector3, MeshStandardMaterial, Color } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getSurfaceTransform } from '../math/PlanetMath';

class Stage1 implements Stage {
  public stageNumber: number = 1;
  public minDay: number = 1;
  public maxDay: number = 3;

  private scene: Scene;
  private parentGroup: Group;
  private elements: Object3D[] = [];
  private planetRadius: number = 3.0;
  private gltfLoader: GLTFLoader;

  constructor(scene: Scene, parentGroup: Group) {
    this.scene = scene;
    this.parentGroup = parentGroup;
    this.gltfLoader = new GLTFLoader();
  }

  public init(scene: Scene, parentGroup: Group): void {
    this.scene = scene;
    this.parentGroup = parentGroup;
    this.createInitialElements();
  }

  public update(dayCount: number): void {
    // 根据天数更新元素
    if (dayCount === 1) {
      this.createFlower();
    } else if (dayCount === 2) {
      this.createRocks(2, 0.2); // 在星球上1/5部分
    } else if (dayCount === 3) {
      this.createGrass();
      this.createRocks(5, 0.25); // 5个石头，在星球上1/4部分
    }
  }

  public cleanup(): void {
    // 清理阶段1的元素
    this.elements.forEach(element => {
      if (element.parent) {
        element.parent.remove(element);
      }
    });
    this.elements = [];
  }

  private createInitialElements(): void {
    // 初始状态为空白，不创建任何元素
  }

  private setDefaultMaterialColor(object: Object3D, color: string): void {
    object.traverse((child: any) => {
      if (child.isMesh) {
        if (!child.material) {
          child.material = new MeshStandardMaterial({ color });
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.color = new Color(color);
          });
        } else {
          child.material.color = new Color(color);
        }
      }
    });
  }

  private createFlower(): void {
    // 在星球顶部放置花模型
    this.gltfLoader.load('/models/scene.gltf', (gltf) => {
      const flower = gltf.scene;
      flower.scale.set(0.3,0.3,0.3); // 调大花模型大小

      // 放置在星球顶部
      const normal = new Vector3(0, 1, 0);
      const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.1);
      flower.position.copy(pos);
      flower.quaternion.copy(quaternion);

      this.parentGroup.add(flower);
      this.elements.push(flower);
    });
  }

  private createRocks(count: number, heightRatio: number): void {
    // 石头模型列表
    const rockModels = [
      '/models/Rock_Medium_1.gltf',
      '/models/Rock_Medium_2.gltf',
      '/models/Rock_Medium_3.gltf'
    ];

    // 岩石颜色列表（岩灰色）
    const rockColors = ['#707070', '#808080', '#909090'];

    // 固定的岩石位置（分散分布）
    const rockPositions = [
      { phi: 0.05, theta: 0.3 },
      { phi: 0.25, theta: Math.PI / 4 },
      { phi: 0.15, theta: Math.PI / 2 },
      { phi: 0.30, theta: 3 * Math.PI / 4 },
      { phi: 0.10, theta: Math.PI }
    ];

    // 固定的岩石缩放值（大小不一）
    const rockScales = [
      [0.04, 0.04, 0.04],
      [0.06, 0.06, 0.06],
      [0.05, 0.05, 0.05],
      [0.07, 0.07, 0.07],
      [0.09,0.09, 0.09]
    ];

    // 创建石头
    for (let i = 0; i < count; i++) {
      const randomModel = rockModels[Math.floor(Math.random() * rockModels.length)];
      const randomColor = rockColors[Math.floor(Math.random() * rockColors.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const rock = gltf.scene;
        const scale = rockScales[i % rockScales.length];
        rock.scale.set(scale[0], scale[1], scale[2]);

        // 为石头模型设置默认颜色
        this.setDefaultMaterialColor(rock, randomColor);

        // 固定位置，限制在星球上部分
        const positionIndex = i % rockPositions.length;
        const phi = rockPositions[positionIndex].phi;
        const theta = rockPositions[positionIndex].theta;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.01);
        rock.position.copy(pos);
        rock.quaternion.copy(quaternion);

        this.parentGroup.add(rock);
        this.elements.push(rock);
      });
    }
  }

  private createGrass(): void {
    // 草模型列表
    const grassModels = [
      '/models/grass_patch.gltf',
      '/models/grass_patch_2.gltf'
    ];

    // 固定的草模型位置
    const grassPositions = [
      // 中心位置
      { phi: 0.05, theta: 0 },
      // 第一层圆形（6个点）- 内圈
      { phi: 0.08, theta: 0 },
      { phi: 0.07, theta: Math.PI / 3 },
      { phi: 0.07, theta: 2 * Math.PI / 3 },
      { phi: 0.08, theta: Math.PI },
      { phi: 0.07, theta: 4 * Math.PI / 3 },
      { phi: 0.07, theta: 5 * Math.PI / 3 },
      // 第二层圆形（12个点）- 中圈
      { phi: 0.12, theta: 0 },
      { phi: 0.11, theta: Math.PI / 6 },
      { phi: 0.11, theta: Math.PI / 3 },
      { phi: 0.11, theta: Math.PI / 2 },
      { phi: 0.11, theta: 2 * Math.PI / 3 },
      { phi: 0.11, theta: 5 * Math.PI / 6 },
      { phi: 0.12, theta: Math.PI },
      { phi: 0.11, theta: 7 * Math.PI / 6 },
      { phi: 0.11, theta: 4 * Math.PI / 3 },
      { phi: 0.11, theta: 3 * Math.PI / 2 },
      { phi: 0.11, theta: 5 * Math.PI / 3 },
      { phi: 0.11, theta: 11 * Math.PI / 6 },
      // 第三层圆形（12个点）- 外圈
      { phi: 0.18, theta: 0 },
      { phi: 0.16, theta: Math.PI / 6 },
      { phi: 0.16, theta: Math.PI / 3 },
      { phi: 0.16, theta: Math.PI / 2 },
      { phi: 0.16, theta: 2 * Math.PI / 3 },
      { phi: 0.16, theta: 5 * Math.PI / 6 },
      { phi: 0.18, theta: Math.PI },
      { phi: 0.16, theta: 7 * Math.PI / 6 },
      { phi: 0.16, theta: 4 * Math.PI / 3 },
      { phi: 0.16, theta: 3 * Math.PI / 2 },
      { phi: 0.16, theta: 5 * Math.PI / 3 },
      { phi: 0.16, theta: 11 * Math.PI / 6 },
      // 第四层圆形（12个点）- 更外圈
      { phi: 0.25, theta: 0 },
      { phi: 0.23, theta: Math.PI / 6 },
      { phi: 0.23, theta: Math.PI / 3 },
      { phi: 0.23, theta: Math.PI / 2 },
      { phi: 0.23, theta: 2 * Math.PI / 3 },
      { phi: 0.23, theta: 5 * Math.PI / 6 },
      { phi: 0.25, theta: Math.PI },
      { phi: 0.23, theta: 7 * Math.PI / 6 },
      { phi: 0.23, theta: 4 * Math.PI / 3 },
      { phi: 0.23, theta: 3 * Math.PI / 2 },
      { phi: 0.23, theta: 5 * Math.PI / 3 },
      { phi: 0.23, theta: 11 * Math.PI / 6 },
      // 第五层圆形（15个点）- 最外圈
      { phi: 0.35, theta: 0 },
      { phi: 0.33, theta: Math.PI / 7.5 },
      { phi: 0.33, theta: 2 * Math.PI / 7.5 },
      { phi: 0.33, theta: 3 * Math.PI / 7.5 },
      { phi: 0.33, theta: 4 * Math.PI / 7.5 },
      { phi: 0.33, theta: 5 * Math.PI / 7.5 },
      { phi: 0.35, theta: 6 * Math.PI / 7.5 },
      { phi: 0.33, theta: 7 * Math.PI / 7.5 },
      { phi: 0.33, theta: 8 * Math.PI / 7.5 },
      { phi: 0.33, theta: 9 * Math.PI / 7.5 },
      { phi: 0.33, theta: 10 * Math.PI / 7.5 },
      { phi: 0.33, theta: 11 * Math.PI / 7.5 },
      { phi: 0.33, theta: 12 * Math.PI / 7.5 },
      { phi: 0.33, theta: 13 * Math.PI / 7.5 },
      { phi: 0.33, theta: 14 * Math.PI / 7.5 },
      // 第六层圆形（18个点）- 超外圈
      { phi: 0.45, theta: 0 },
      { phi: 0.43, theta: Math.PI / 9 },
      { phi: 0.43, theta: 2 * Math.PI / 9 },
      { phi: 0.43, theta: 3 * Math.PI / 9 },
      { phi: 0.43, theta: 4 * Math.PI / 9 },
      { phi: 0.43, theta: 5 * Math.PI / 9 },
      { phi: 0.45, theta: 6 * Math.PI / 9 },
      { phi: 0.43, theta: 7 * Math.PI / 9 },
      { phi: 0.43, theta: 8 * Math.PI / 9 },
      { phi: 0.43, theta: 9 * Math.PI / 9 },
      { phi: 0.43, theta: 10 * Math.PI / 9 },
      { phi: 0.43, theta: 11 * Math.PI / 9 },
      { phi: 0.45, theta: 12 * Math.PI / 9 },
      { phi: 0.43, theta: 13 * Math.PI / 9 },
      { phi: 0.43, theta: 14 * Math.PI / 9 },
      { phi: 0.43, theta: 15 * Math.PI / 9 },
      { phi: 0.43, theta: 16 * Math.PI / 9 },
      { phi: 0.43, theta: 17 * Math.PI / 9 },
      // 第七层圆形（20个点）- 极外圈
      { phi: 0.55, theta: 0 },
      { phi: 0.53, theta: Math.PI / 10 },
      { phi: 0.53, theta: 2 * Math.PI / 10 },
      { phi: 0.53, theta: 3 * Math.PI / 10 },
      { phi: 0.53, theta: 4 * Math.PI / 10 },
      { phi: 0.53, theta: 5 * Math.PI / 10 },
      { phi: 0.55, theta: 6 * Math.PI / 10 },
      { phi: 0.53, theta: 7 * Math.PI / 10 },
      { phi: 0.53, theta: 8 * Math.PI / 10 },
      { phi: 0.53, theta: 9 * Math.PI / 10 },
      { phi: 0.53, theta: 10 * Math.PI / 10 },
      { phi: 0.53, theta: 11 * Math.PI / 10 },
      { phi: 0.55, theta: 12 * Math.PI / 10 },
      { phi: 0.53, theta: 13 * Math.PI / 10 },
      { phi: 0.53, theta: 14 * Math.PI / 10 },
      { phi: 0.53, theta: 15 * Math.PI / 10 },
      { phi: 0.53, theta: 16 * Math.PI / 10 },
      { phi: 0.53, theta: 17 * Math.PI / 10 },
      { phi: 0.53, theta: 18 * Math.PI / 10 },
      { phi: 0.53, theta: 19 * Math.PI / 10 }
    ];

    // 生成多个草丛模型，固定位置
    for (let i = 0; i < 120; i++) {
      const randomModel = grassModels[Math.floor(Math.random() * grassModels.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const grass = gltf.scene;
        grass.scale.set(0.3, 0.3, 0.3);

        // 为草模型设置默认颜色（暗绿色）
        this.setDefaultMaterialColor(grass, '#1B5E20');

        // 固定位置
        const position = grassPositions[i];
        const phi = position.phi;
        const theta = position.theta;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.04); // 抬高草模型高度
        grass.position.copy(pos);
        grass.quaternion.copy(quaternion);

        this.parentGroup.add(grass);
        this.elements.push(grass);
      });
    }
  }
}

export default Stage1;
