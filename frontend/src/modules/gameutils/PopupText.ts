export class PopupText {
    private phaserScene: Phaser.Scene;
    private popupPool: Phaser.GameObjects.Group;

    constructor(phaserScene: Phaser.Scene) {
        this.phaserScene = phaserScene;
        this.popupPool = this.phaserScene.add.group({
            classType: Phaser.GameObjects.Text,
            maxSize: 100,
            createCallback: (item: Phaser.GameObjects.GameObject) => {
                item.setActive(false);
                if (item instanceof Phaser.GameObjects.Text) {
                    item.setVisible(false);
                    item.setOrigin(0.5, 0.5);
                }
            },
        });
    }

    /**
     * Displays a temporary text popup that fades out.
     * @param text Text content to display.
     * @param x X position.
     * @param y Y position.
     * @param duration Duration of the fade-out tween in milliseconds.
     * @param config Optional text style configuration.
     */
    popupText(text: string = "text", x: number = 100, y: number = 100, duration: number = 1000, config?: Phaser.Types.GameObjects.Text.TextStyle) {
        if (!this.phaserScene || !this.phaserScene.scene.isActive()) {
            console.warn('Phaser scene is not active or not defined');
            return;
        }
        if (!this.popupPool) {
            console.error('Popup pool is not defined');
            return;
        }

        const popup = this.popupPool.get(x, y) as Phaser.GameObjects.Text;

        if (!popup) {
            return;
        }

        popup.setText(text);
        popup.setAlpha(1);
        popup.setStyle(config || {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        });
        popup.setPosition(x, y);
        popup.setDepth(1000);
        popup.setVisible(true);
        popup.setActive(true);

        this.phaserScene.tweens.add({
            targets: popup,
            alpha: { from: 1, to: 0 },
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                if (this.popupPool) {
                    this.popupPool.killAndHide(popup);
                }
            },
        });
    }

    /**
     * Cleans up resources when the scene ends.
     */
    private destroy() {
        if (this.popupPool) {
            this.popupPool.clear(true, true);
            this.popupPool.destroy();
        }
    }
}
