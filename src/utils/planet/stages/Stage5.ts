import { Group, Scene, Object3D } from 'three';

class Stage5 implements Stage {
  public stageNumber: number = 5;
  public minDay: number = 46;
  public maxDay: number = 90;

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
    // 阶段5的更新逻辑（暂未实现）
  }

  public cleanup(): void {
    // 清理阶段5的元素
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

export default Stage5;
