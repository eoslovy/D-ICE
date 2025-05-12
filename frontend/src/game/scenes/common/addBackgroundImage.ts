import { Scene } from "phaser";

/**
 * 씬에 배경 이미지를 추가하는 공통 함수
 * @param scene Phaser.Scene 인스턴스
 * @param key   배경 이미지 키 (기본값: "Background")
 * @param depth z-index 역할의 depth (기본값: -10)
 */
export function addBackgroundImage(
  scene: Scene,
  key: string = "Background",
  depth: number = -10
) {
  const { width, height } = scene.cameras.main;
  return scene.add
    .image(width / 2, height / 2, key)
    .setDisplaySize(width, height)
    .setDepth(depth);
}