import { Group, Scene } from 'three';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import Stage4 from './Stage4';
import Stage5 from './Stage5';
import Stage6 from './Stage6';

// 阶段接口
export interface Stage {
  stageNumber: number;
  minDay: number;
  maxDay: number;
  init(scene: Scene, parentGroup: Group): void;
  update(dayCount: number): void;
  cleanup(): void;
}

// 阶段管理类
export class StageManager {
  private currentStage: Stage | null = null;
  private stages: Map<number, Stage> = new Map();
  private scene: Scene;
  private parentGroup: Group;

  constructor(scene: Scene, parentGroup: Group) {
    this.scene = scene;
    this.parentGroup = parentGroup;
    this.initializeStages();
  }

  private initializeStages() {
    // 初始化所有阶段
    this.stages.set(1, new Stage1(this.scene, this.parentGroup));
    this.stages.set(2, new Stage2(this.scene, this.parentGroup));
    this.stages.set(3, new Stage3(this.scene, this.parentGroup));
    this.stages.set(4, new Stage4(this.scene, this.parentGroup));
    this.stages.set(5, new Stage5(this.scene, this.parentGroup));
    this.stages.set(6, new Stage6(this.scene, this.parentGroup));
  }

  // 根据天数计算当前阶段
  public calculateStage(dayCount: number): number {
    if (dayCount < 4) return 1;
    if (dayCount < 11) return 2;
    if (dayCount < 22) return 3;
    if (dayCount < 46) return 4;
    if (dayCount < 91) return 5;
    return 6;
  }

  // 设置当前阶段
  public setStage(stageNumber: number) {
    const newStage = this.stages.get(stageNumber);
    if (!newStage) return;

    // 不清理当前阶段，保留之前阶段的元素
    // if (this.currentStage) {
    //   this.currentStage.cleanup();
    // }

    // 初始化并设置新阶段
    newStage.init(this.scene, this.parentGroup);
    this.currentStage = newStage;
  }

  // 更新阶段
  public update(dayCount: number) {
    const stageNumber = this.calculateStage(dayCount);
    
    // 如果阶段发生变化，切换阶段
    if (!this.currentStage || this.currentStage.stageNumber !== stageNumber) {
      this.setStage(stageNumber);
    }

    // 更新当前阶段
    if (this.currentStage) {
      this.currentStage.update(dayCount);
    }
  }

  // 清理所有阶段
  public cleanup() {
    if (this.currentStage) {
      this.currentStage.cleanup();
    }
    this.stages.clear();
  }
}

export default StageManager;