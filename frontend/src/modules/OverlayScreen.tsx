import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'; // Import necessary hooks/functions
import Phaser from 'phaser';

// --- Define a reusable particle configuration ---
const circleBurstConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
    speed: 150, // Adjusted speed
    lifespan: 600, // Adjusted lifespan
    scale: { start: 0.5, end: 0 }, // Start smaller
    alpha: { start: 0.8, end: 0 }, // Start slightly transparent
    blendMode: 'ADD',
    quantity: 1,
    angle: { min: 0, max: 360 },
    tint: { start: 0xffff00, end: 0xff0000 }, // Example tint: yellow to red
};

const spriteShowcaseConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
    speed: 100,
    lifespan: 500,
    scale: { start: 1, end: 1 }, // Fixed scale
    alpha: { start: 1, end: 0 },
    blendMode: 'ADD',
    quantity: 1,
    angle: { min: 0, max: 360 },
}

// --- OverlayScene Class ---
class OverlayScene extends Phaser.Scene {
    private readonly CIRCLE_TEXTURE_KEY = 'particle_circle'; // Define a key

    constructor() {
        super({ key: 'OverlayScene' });
    }

    preload() {
        console.log('[OverlayScene] preload');
        // No need to load 'star' if only using shapes
        this.load.image('star', '/assets/star.png');
    }

    create() {
        console.log('[OverlayScene] create');

        // --- Create a simple circle texture ---
        const graphics = this.make.graphics();
        graphics.fillStyle(0xffffff); // White color
        graphics.fillCircle(5, 5, 5); // Draw a circle (radius 5 at position 5,5)
        // Generate texture from graphics, use the defined key
        graphics.generateTexture(this.CIRCLE_TEXTURE_KEY, 10, 10); // Texture size 10x10
        graphics.destroy(); // Clean up the graphics object
        // --- End texture creation ---
    }

    public randomizedParticle() {
        console.log('[OverlayScene] randomizedParticle');
        // Check if the generated texture exists
        if (!this.textures.exists(this.CIRCLE_TEXTURE_KEY)) {
            console.warn(`[OverlayScene] Texture '${this.CIRCLE_TEXTURE_KEY}' not generated yet.`);
            return;
        }

        const x = Math.random() * this.scale.width;
        const y = Math.random() * this.scale.height;

        // Use the generated circle texture key and the predefined config
        const emitter = this.add.particles(x, y, this.CIRCLE_TEXTURE_KEY, circleBurstConfig);

        // Emitter Cleanup
        const lifespan = typeof circleBurstConfig.lifespan === 'number'
            ? circleBurstConfig.lifespan
            : 600;

        this.time.delayedCall(lifespan + 100, () => {
             emitter.destroy();
        });
    }

    public spriteShowcase(spriteKey: string = 'star') {
        console.log('[OverlayScene] spriteShowcase');
        // Check if the sprite texture exists
        if (!this.textures.exists(spriteKey)) {
            console.warn(`[OverlayScene] Texture '${spriteKey}' not found.`);
            return;
        }

        const x = Math.random() * this.scale.width;
        const y = Math.random() * this.scale.height;
        // show sprite once
        const emitter = this.add.particles(x, y, spriteKey, spriteShowcaseConfig);
        emitter.explode(1); // Emit one particle
        // Emitter Cleanup
        const lifespan = typeof spriteShowcaseConfig.lifespan === 'number'
            ? spriteShowcaseConfig.lifespan
            : 800;
        this.time.delayedCall(lifespan + 100, () => {
            emitter.destroy();
        }
        );
    }

    public displayMessage(text: string, size: number = 16, duration: number = 2000, float: boolean = true) {
        console.log('[OverlayScene] displayMessage');
        // Check if the text is empty
        if (!text) {
            console.warn('[OverlayScene] No text provided for displayMessage.');
            return;
        }
        // Check if the size is valid
        if (size <= 0) {
            console.warn('[OverlayScene] Invalid font size provided for displayMessage.');
            return;
        }
        // Check if the duration is valid
        if (duration <= 0) {
            console.warn('[OverlayScene] Invalid duration provided for displayMessage.');
            return;
        }
        const style = {
            fontFamily: 'Arial',
            fontSize: `${size}px`,
            fontStyle: 'bold',
            fontWeight: 'bold',
            fill: '#ffffff',
            align: 'center',
            // transparent bg and outline
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: 300, useAdvancedWrap: true },
            // background color with transparent
            backgroundColor: 'rgba(0, 0, 0, 0)',
            padding: { x: 10, y: 5 },
        };

        const posX = float ? Math.random() * this.scale.width : this.scale.width / 2;
        const posY = float ? Math.random() * this.scale.height : this.scale.height / 2;

        const message = this.add.text(posX, posY, text, style);
        message.setOrigin(0.5);

        if (float) {
            // fade out and move up
            this.tweens.add({
                targets: message,
                alpha: 0,
                y: message.y - 50,
                duration: duration,
                ease: 'Power2'
            });
        }

        this.time.delayedCall(duration, () => {
            message.destroy();
        });
    }
}

// --- Phaser Config ---
const overlayGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [OverlayScene]
};

// --- React Component Props and Ref Handle Type ---
interface OverlayScreenProps {
    style?: React.CSSProperties;
    className?: string;
}

// Define the type for the functions we want to expose via the ref
export interface OverlayScreenHandle {
    triggerParticleEffect: () => void;
    triggerSpriteShowcase: (spriteKey?: string) => void;
    triggerMessage: (text: string, size?: number, duration?: number, float?: boolean) => void;
    // Add other functions you want to expose here
    // example: showMessage: (text: string) => void;
}

const PHASER_PARENT_ID = 'phaser-overlay-game-container';

// --- Modified OverlayScreen Component ---
const OverlayScreen = forwardRef<OverlayScreenHandle, OverlayScreenProps>(({ style, className }, ref) => {
    const overlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'transparent', pointerEvents: 'none', zIndex: 10,
        overflow: 'hidden', ...style,
    };
    const phaserContainerStyle: React.CSSProperties = {
        width: '100%', height: '100%', pointerEvents: 'none',
    };

    // Use a ref to hold the Phaser game instance
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

    // Effect to initialize and destroy the Phaser game instance
    useEffect(() => {
        const config = { ...overlayGameConfig, parent: PHASER_PARENT_ID };
        gameInstanceRef.current = new Phaser.Game(config); // Store instance in ref
        console.log('[OverlayScreen] Phaser game instance created.');

        return () => {
            console.log('[OverlayScreen] Destroying Phaser game instance...');
            gameInstanceRef.current?.destroy(true);
            gameInstanceRef.current = null;
        };
    }, []);

    // Expose specific functions using useImperativeHandle
    useImperativeHandle(ref, () => ({
        triggerParticleEffect: () => {
            console.log('[OverlayScreen] handle.triggerParticleEffect called');
            const game = gameInstanceRef.current;
            if (game) {
                // Get the specific scene instance
                const scene = game.scene.getScene('OverlayScene') as OverlayScene;
                if (scene && scene.randomizedParticle) {
                    scene.randomizedParticle(); // Call the public method on the scene
                } else {
                    console.warn('[OverlayScreen] OverlayScene not ready or method not found.');
                }
            } else {
                console.warn('[OverlayScreen] Phaser game instance not available.');
            }
        },
        
        triggerSpriteShowcase: (spriteKey: string) => {
            console.log('[OverlayScreen] handle.triggerSpriteShowcase called');
            const game = gameInstanceRef.current;
            if (game) {
                const scene = game.scene.getScene('OverlayScene') as OverlayScene;
                if (scene && scene.spriteShowcase) {
                    scene.spriteShowcase(spriteKey);
                } else {
                    console.warn('[OverlayScreen] OverlayScene not ready or method not found.');
                }
            } else {
                console.warn('[OverlayScreen] Phaser game instance not available.');
            }
        },
        triggerMessage: (text: string, size: number = 16, duration: number = 2000, float: boolean = true) => {
            console.log('[OverlayScreen] handle.triggerMessage called');
            const game = gameInstanceRef.current;
            if (game) {
                const scene = game.scene.getScene('OverlayScene') as OverlayScene;
                if (scene && scene.displayMessage) {
                    scene.displayMessage(text, size, duration, float);
                } else {
                    console.warn('[OverlayScreen] OverlayScene not ready or method not found.');
                }
            } else {
                console.warn('[OverlayScreen] Phaser game instance not available.');
            }
        }
        // Add other methods as needed
    }), []); // Dependencies: empty means the handle doesn't change

    return (
        <div style={overlayStyle} className={className}>
            <div id={PHASER_PARENT_ID} style={phaserContainerStyle}>
                {/* Phaser canvas here */}
            </div>
        </div>
    );
}); // Wrap component definition with forwardRef

export default OverlayScreen;