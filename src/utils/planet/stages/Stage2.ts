import { Group, Scene, Object3D, Vector3, PointLight, Color, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getSurfaceTransform } from '../math/PlanetMath';

class Stage2 implements Stage {
  public stageNumber: number = 2;
  public minDay: number = 4;
  public maxDay: number = 10;

  private scene: Scene;
  private parentGroup: Group;
  private elements: Object3D[] = [];
  private lights: PointLight[] = [];
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
    // 根据天数更新元素（在第一阶段的基础上增加新元素）
    if (dayCount >= 4 && dayCount <= 5) {
      this.createVegetation();
      this.createMoreRocks();
    } else if (dayCount >= 6 && dayCount <= 7) {
      this.createTree(1); // 第1颗树
    } else if (dayCount >= 8 && dayCount <= 10) {
      this.createTree(2); // 第2颗树
      this.createCampfire();
    }
  }

  public cleanup(): void {
    // 清理阶段2的元素
    this.elements.forEach(element => {
      if (element.parent) {
        element.parent.remove(element);
      }
    });
    this.lights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
    });
    this.elements = [];
    this.lights = [];
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

  private createVegetation(): void {
    // 灌木模型列表
    const bushModels = [
      '/models/Bush_Common.gltf',
      '/models/Bush_Common_Flowers.gltf'
    ];

    // 创建灌木（5个）
    for (let i = 0; i < 5; i++) {
      const randomModel = bushModels[Math.floor(Math.random() * bushModels.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const bush = gltf.scene;
        // 随机大小，范围在0.06-0.1之间
        const scale = 0.08 + Math.random() * 0.04;
        bush.scale.set(scale, scale, scale);

        // 为灌木设置默认颜色（绿色）
        this.setDefaultMaterialColor(bush, '#4CAF50');

        // 随机位置，限制在星球上1/4部分
        const phi = Math.random() * Math.PI * 0.25; // 限制在星球上1/4部分
        const theta = Math.random() * Math.PI * 2;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.1);
        bush.position.copy(pos);
        bush.quaternion.copy(quaternion);

        this.parentGroup.add(bush);
        this.elements.push(bush);
      });
    }

    // 创建额外的草丛（8个）
    const grassModels = [
      '/models/grass_patch.gltf',
      '/models/grass_patch_2.gltf'
    ];

    for (let i = 0; i < 8; i++) {
      const randomModel = grassModels[Math.floor(Math.random() * grassModels.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const grass = gltf.scene;
        grass.scale.set(0.2, 0.2, 0.2);

        // 为草丛设置默认颜色（暗绿色）
        this.setDefaultMaterialColor(grass, '#1B5E20');

        // 随机位置，限制在星球上1/4部分
        const phi = Math.random() * Math.PI * 0.25; // 限制在星球上1/4部分
        const theta = Math.random() * Math.PI * 2;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.05);
        grass.position.copy(pos);
        grass.quaternion.copy(quaternion);

        this.parentGroup.add(grass);
        this.elements.push(grass);
      });
    }
  }

  private createMoreRocks(): void {
    // 石头模型列表
    const rockModels = [
      '/models/Rock_Medium_1.gltf',
      '/models/Rock_Medium_2.gltf',
      '/models/Rock_Medium_3.gltf'
    ];

    // 岩石颜色列表（岩灰色）
    const rockColors = ['#707070', '#808080', '#909090'];

    // 创建更多石头（5个）
    for (let i = 0; i < 5; i++) {
      const randomModel = rockModels[Math.floor(Math.random() * rockModels.length)];
      const randomColor = rockColors[Math.floor(Math.random() * rockColors.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const rock = gltf.scene;
        const scale = 0.03 + Math.random() * 0.04;
        rock.scale.set(scale, scale, scale);

        // 为石头模型设置默认颜色
        this.setDefaultMaterialColor(rock, randomColor);

        // 随机位置，限制在星球上1/4部分
        const phi = Math.random() * Math.PI * 0.25; // 限制在星球上1/4部分
        const theta = Math.random() * Math.PI * 2;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.01);
        rock.position.copy(pos);
        rock.quaternion.copy(quaternion);

        this.parentGroup.add(rock);
        this.elements.push(rock);
      });
    }
  }

  private createTree(treeNumber: number): void {
    // 树模型路径
    const treeModel = '/models/stylized_tree/scene.gltf';

    // 固定的树位置
    const treePositions = [
      { phi: 0.3, theta: Math.PI / 3 },
      { phi: 0.35, theta: 4 * Math.PI / 3 }
    ];

    const positionIndex = treeNumber - 1;

    this.gltfLoader.load(treeModel, (gltf) => {
      const tree = gltf.scene;
      tree.scale.set(1, 1, 1);

      // 使用树模型自带的颜色，不设置颜色覆盖

      // 固定位置
      const position = treePositions[positionIndex];
      const phi = position.phi;
      const theta = position.theta;
      const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
      const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.2);
      tree.position.copy(pos);
      tree.quaternion.copy(quaternion);

      this.parentGroup.add(tree);
      this.elements.push(tree);
    });
  }

  private createCampfire(): void {
    // 创建篝火（使用多个小石头围成一圈）
    const rockModels = [
      '/models/Pebble_Round_1.gltf',
      '/models/Pebble_Round_2.gltf',
      '/models/Pebble_Round_3.gltf'
    ];

    // 篝火位置
    const campfirePhi = 0.4;
    const campfireTheta = Math.PI / 2;

    // 创建篝火周围的石头（围成一圈）
    for (let i = 0; i < 6; i++) {
      const randomModel = rockModels[Math.floor(Math.random() * rockModels.length)];
      this.gltfLoader.load(randomModel, (gltf) => {
        const rock = gltf.scene;
        rock.scale.set(0.02, 0.02, 0.02);

        // 为石头设置默认颜色（深灰色）
        this.setDefaultMaterialColor(rock, '#505050');

        // 围成一圈
        const angle = (i / 6) * Math.PI * 2;
        const offsetPhi = Math.cos(angle) * 0.02;
        const offsetTheta = Math.sin(angle) * 0.02;

        const phi = campfirePhi + offsetPhi;
        const theta = campfireTheta + offsetTheta;
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta);
        const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.01);
        rock.position.copy(pos);
        rock.quaternion.copy(quaternion);

        this.parentGroup.add(rock);
        this.elements.push(rock);
      });
    }

    // 创建篝火中心（发光点）
    const normal = new Vector3().setFromSphericalCoords(1, campfirePhi, campfireTheta);
    const { pos } = getSurfaceTransform(normal, this.planetRadius + 0.05);

    // 添加温暖光圈
    const light = new PointLight(new Color('#FF6B35'), 3, 3);
    light.position.copy(pos);

    this.scene.add(light);
    this.lights.push(light);
  }
}

export default Stage2;
