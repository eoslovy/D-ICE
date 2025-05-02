export class PopupSprite {
    private phaserScene: Phaser.Scene;
    private popupPool: Phaser.GameObjects.Group;

    constructor(phaserScene: Phaser.Scene) {
        this.phaserScene = phaserScene;
        this.popupPool = this.phaserScene.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: 100,
            createCallback: (item: Phaser.GameObjects.GameObject) => {
                if (item instanceof Phaser.GameObjects.Sprite) {
                    item.setOrigin(0.5, 0.5);
                }
            },
        });
    }

    /**
     * Displays a temporary sprite popup that fades out when fadeout = true.
     * @param texture Texture key for the sprite.
     * @param x X position.
     * @param y Y position.
     * @param duration Duration of the fade-out tween in milliseconds.
     */

    popupSprite(texture: string, x: number = 100, y: number = 100, duration: number = 1000, fadeout: boolean = true) {
        if (!this.phaserScene || !this.phaserScene.scene.isActive()) {
            console.warn('Phaser scene is not active or not defined');
            return;
        }
        if (!this.popupPool) {
            console.error('Popup pool is not defined');
            return;
        }

        const popup = this.popupPool.get(x, y) as Phaser.GameObjects.Sprite;

        if (!popup) {
            return;
        }

        popup.setTexture(texture);
        popup.setAlpha(1);
        popup.setPosition(x, y);
        popup.setVisible(true);
        popup.setActive(true);

        // play animation if the sprite has one
        if (popup.anims) {
            popup.anims.play({
                key: texture,
                repeat: 0
            });
            duration = popup.anims.getTotalFrames() * popup.anims.msPerFrame;
        }

        this.phaserScene.tweens.add({
            targets: popup,
            ease: 'Power1',
            duration: duration,
            alphs: fadeout ? 0 : 1,
            onComplete: () => {
                if (this.popupPool) {
                    this.popupPool.killAndHide(popup);
                }
            },
        });

    }

    /**
     * Destroys the popup pool and all its sprites.
     */
    destroy() {
        if (this.popupPool) {
            this.popupPool.clear(true, true);
            this.popupPool.destroy();
        }
    }

}