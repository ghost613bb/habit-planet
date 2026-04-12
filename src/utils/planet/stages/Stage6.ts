import { Group, Scene, Object3D } from 'three';

class Stage6 implements Stage {
  public stageNumber: number = 6;
  public minDay: number = 91;
  public maxDay: number = Infinity;

  private scene: Scene;
  private parentGroup: Group;
  private elements: Object3D[] = [];
  private planetRadius: number = 3.0;

  constructor(scene: Scene, parentGroup: Group) {
    this.scene = scene;
    this.parentGroup = parentGroup;
  }

  public init(scene: Scene, parentGroup: Group): void {
    this.scene = scene;
    this.parentGroup = parentGroup;
    this.createInitialElements();
  }

  public update(dayCount: number): void {
    // 阶段6的更新逻辑（暂未实现）
  }

  public cleanup(): void {
    // 清理阶段6的元素
    this.elements.forEach(element => {
      if (element.parent) {
        element.parent.remove(element);
      }
    });
    this.elements = [];
  }

  private createInitialElements(): void {
    // 暂未实现
  }
}

export default Stage6;
