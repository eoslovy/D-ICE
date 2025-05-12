import { Scene } from "phaser";
// Make sure these imports are correct and files exist
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import { PopupSprite } from "../../modules/gameutils/PopupSptire"; // Assuming PopupSptire is a typo for PopupSprite

export class Dye extends Scene {
    // Common settings
    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;

    // game specific settings
    private dyePalette: Phaser.GameObjects.Sprite;
    private isRotating: boolean = false; // For palette rotation

    // For pinch-to-zoom (palette)
    private isPinching: boolean = false;
    private pinchInitialDistance: number = 0;
    private pinchInitialScale: number = 1;

    // Single Target Color
    private targetColor: Phaser.Display.Color;

    // Draggable Markers - now in a container
    private markerContainer: Phaser.GameObjects.Container; // Container for the markers
    private markers: Phaser.GameObjects.Sprite[]; // The actual marker sprites within the container
    private markerColors: (Phaser.Display.Color | null)[]; // Colors currently under each marker
    private readonly numMarkers: number = 3;
    private markerHelperPoint: Phaser.Math.Vector2; // Add this line

    // UI Elements
    private targetColorDisplay: Phaser.GameObjects.Rectangle;
    private markerColorDisplays: Phaser.GameObjects.Rectangle[];

    constructor() {
        super("Dye");
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 15; // Default to 20 seconds
        this.gameStarted = false;
        this.gameEnded = false;

        this.isRotating = false;
        this.isPinching = false;
        this.pinchInitialDistance = 0;
        this.pinchInitialScale = 1;

        // Define the single target color
        this.targetColor = new Phaser.Display.Color(
            Phaser.Math.Between(50, 200),
            Phaser.Math.Between(50, 200),
            Phaser.Math.Between(50, 200)
        );

        this.markers = []; // Will hold sprite references
        this.markerColors = new Array(this.numMarkers)
            .fill(null)
            .map(() => new Phaser.Display.Color(0, 0, 0)); // Init with black
        this.markerColorDisplays = [];
        this.markerHelperPoint = new Phaser.Math.Vector2(); // Initialize here
    }

    preload() {
        this.load.image("dye_pallete_1", "assets/dye/dye_pallete_1.png");
        this.load.image("dye_pallete_2", "assets/dye/dye_pallete_2.png");
        this.load.image("dye_pallete_3", "assets/dye/dye_pallete_3.png");
        this.load.image("dye_pallete_4", "assets/dye/dye_pallete_4.png");
        this.load.image("marker", "assets/dye/dye_marker.png");
        this.load.start();
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        this.add
            .graphics()
            .fillStyle(0x42a5f5, 1)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        // --- Palette Setup ---
        const randomPalette = Phaser.Math.Between(1, 4);
        this.dyePalette = this.add.sprite(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 180,
            `dye_pallete_${randomPalette}`
        ); // Adjusted Y
        this.dyePalette.setOrigin(0.5);
        this.dyePalette.setInteractive();

        // --- UI for Target Color ---
        const targetDisplayX = this.cameras.main.centerX;
        const targetDisplayY = 100; // Adjusted Y
        this.add
            .text(targetDisplayX, targetDisplayY + 300, "염색할 색을 맞추자!", {
                // Increased font, adjusted Y offset
                fontSize: "40px",
                color: "#ffffff",
                fontFamily: "Jua",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.targetColorDisplay = this.add
            .rectangle(
                targetDisplayX,
                targetDisplayY + 25,
                140,
                70,
                this.targetColor.color // Increased size, adjusted Y
            )
            .setStrokeStyle(3, 0xffffff)
            .setOrigin(0.5); // Increased stroke

        // --- Draggable Markers Container & Their Color Displays ---
        const markerUIDisplayY = targetDisplayY + 120; // Adjusted Y for spacing
        this.markerContainer = this.add.container(
            this.dyePalette.x,
            this.dyePalette.y - 70
        ); // Adjusted initial Y
        this.markerContainer.setDepth(2);

        const markerRelativePositions = [
            // Slightly increased spacing for larger markers
            {
                x: Phaser.Math.Between(-100, 100),
                y: Phaser.Math.Between(-100, 100),
            },
            {
                x: Phaser.Math.Between(-100, 100),
                y: Phaser.Math.Between(-100, 100),
            },
            {
                x: Phaser.Math.Between(-100, 100),
                y: Phaser.Math.Between(-100, 100),
            },
        ];

        const markerTintColors = [0xffdddd, 0xddffdd, 0xddddff]; // Light tints

        for (let i = 0; i < this.numMarkers; i++) {
            const relPos = markerRelativePositions[i] || {
                x: (i - 1) * 30,
                y: 0,
            };
            const markerSprite = this.add
                .sprite(relPos.x, relPos.y, "marker")
                .setScale(0.6); // Increased scale
            const currentMarkerTint =
                markerTintColors[i % markerTintColors.length];
            markerSprite.setTint(currentMarkerTint); // Apply tint
            this.markerContainer.add(markerSprite);
            this.markers.push(markerSprite);

            const colorDisplayX = this.cameras.main.centerX - 80 + i * 80; // Adjusted spacing for larger displays
            const colorRect = this.add
                .rectangle(
                    colorDisplayX,
                    markerUIDisplayY + 30,
                    60,
                    35,
                    0x000000
                ) // Increased size
                .setStrokeStyle(2, currentMarkerTint)
                .setOrigin(0.5); // Use marker's tint for stroke
            this.markerColorDisplays.push(colorRect);
        }

        this.markerContainer.setSize(250, 250); // Adjusted size if needed for larger markers
        this.markerContainer.setInteractive();
        this.input.setDraggable(this.markerContainer);

        this.markerContainer.on(
            "drag",
            (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                if (!this.gameStarted || this.gameEnded) return;
                this.markerContainer.x = dragX;
                this.markerContainer.y = dragY;
                this.markers.forEach((m, idx) => {
                    m.getWorldTransformMatrix().transformPoint(
                        0,
                        0,
                        this.markerHelperPoint
                    );
                    this.updateColorUnderMarker(
                        this.markerHelperPoint.x,
                        this.markerHelperPoint.y,
                        idx
                    );
                });
            }
        );

        this.markers.forEach((m, idx) => {
            m.getWorldTransformMatrix().transformPoint(
                0,
                0,
                this.markerHelperPoint
            );
            this.updateColorUnderMarker(
                this.markerHelperPoint.x,
                this.markerHelperPoint.y,
                idx
            );
        });

        this.events.on("countdownFinished", () => this.startGame());
        this.events.on("timerFinished", () => this.endGame());
        this.countdown.startCountdown(3);

        // Pallete interaction
        let paletteDragStartPointer: Phaser.Input.Pointer | null = null;
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!this.gameStarted || this.gameEnded) return;

            const gameObjectsUnderPointer = this.input.hitTestPointer(pointer);
            // Check if pointer is over the markerContainer or any of its children (markers)
            const isPointerOverMarkerGroup =
                gameObjectsUnderPointer.includes(this.markerContainer) ||
                this.markers.some((marker) =>
                    gameObjectsUnderPointer.includes(marker)
                );

            if (isPointerOverMarkerGroup) {
                // Let the container's drag handler manage this. Prevent palette interaction.
                this.isRotating = false;
                this.isPinching = false;
                paletteDragStartPointer = null;
                return;
            }

            const isPointerOverPalette = gameObjectsUnderPointer.includes(
                this.dyePalette
            );

            if (
                this.input.pointer1.active &&
                this.input.pointer2.active &&
                isPointerOverPalette &&
                !this.isPinching
            ) {
                this.isPinching = true;
                this.isRotating = false;
                paletteDragStartPointer = null;
                this.pinchInitialDistance = Phaser.Math.Distance.Between(
                    this.input.pointer1.x,
                    this.input.pointer1.y,
                    this.input.pointer2.x,
                    this.input.pointer2.y
                );
                this.pinchInitialScale = this.dyePalette.scaleX;
            }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!this.gameStarted || this.gameEnded) return;
            let paletteTransformed = false;

            if (
                this.isPinching &&
                this.input.pointer1.active &&
                this.input.pointer2.active
            ) {
                const currentDistance = Phaser.Math.Distance.Between(
                    this.input.pointer1.x,
                    this.input.pointer1.y,
                    this.input.pointer2.x,
                    this.input.pointer2.y
                );
                if (this.pinchInitialDistance > 0) {
                    const scaleFactor =
                        currentDistance / this.pinchInitialDistance;
                    let newScale = this.pinchInitialScale * scaleFactor;
                    newScale = Phaser.Math.Clamp(newScale, 0.2, 3);
                    this.dyePalette.setScale(newScale);
                    paletteTransformed = true;
                }
            }

            if (paletteTransformed) {
                this.markers.forEach((m, idx) => {
                    m.getWorldTransformMatrix().transformPoint(
                        0,
                        0,
                        this.markerHelperPoint
                    );
                    this.updateColorUnderMarker(
                        this.markerHelperPoint.x,
                        this.markerHelperPoint.y,
                        idx
                    );
                });
            }
        });

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (pointer.id === paletteDragStartPointer?.id) {
                this.isRotating = false;
                paletteDragStartPointer = null;
            }
            const activePointersCount =
                (this.input.pointer1.active ? 1 : 0) +
                (this.input.pointer2.active ? 1 : 0);
            if (this.isPinching && activePointersCount < 2) {
                this.isPinching = false;
                this.pinchInitialDistance = 0;
            }
        });
    }

    updateColorUnderMarker(
        markerWorldX: number,
        markerWorldY: number,
        markerIndex: number
    ) {
        if (
            !this.dyePalette ||
            !this.dyePalette.texture ||
            !this.dyePalette.texture.key
        ) {
            // Removed game state check here, can be handled by caller
            if (this.markerColors[markerIndex])
                this.markerColors[markerIndex]?.setTo(0, 0, 0);
            if (this.markerColorDisplays[markerIndex])
                this.markerColorDisplays[markerIndex].setFillStyle(0x000000);
            return;
        }
        // Only update if game is active
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        const textureKey = this.dyePalette.texture.key;
        const frameName = this.dyePalette.frame.name;
        const frame = this.textures.getFrame(textureKey, frameName);
        if (!frame) return;

        const markerWorldPoint = new Phaser.Math.Vector2(
            markerWorldX,
            markerWorldY
        );
        const localPoint = new Phaser.Math.Vector2();
        const spriteWorldMatrix = this.dyePalette.getWorldTransformMatrix();
        const inverseSpriteWorldMatrix = spriteWorldMatrix.invert();
        inverseSpriteWorldMatrix.transformPoint(
            markerWorldPoint.x,
            markerWorldPoint.y,
            localPoint
        );

        // Adjust localPoint to be relative to the top-left of the texture frame
        // The dyePalette's origin (0.5, 0.5) means localPoint is relative to its center.
        // getPixel expects coordinates from the top-left of the frame.
        const textureX = Math.floor(
            localPoint.x + frame.width * this.dyePalette.originX
        );
        const textureY = Math.floor(
            localPoint.y + frame.height * this.dyePalette.originY
        );

        let pickedColorObject: Phaser.Display.Color | null = null;
        if (
            textureX >= 0 &&
            textureX < frame.width &&
            textureY >= 0 &&
            textureY < frame.height
        ) {
            try {
                // this.textures.getPixel returns a new Color object or null
                const tempColor = this.textures.getPixel(
                    textureX,
                    textureY,
                    textureKey,
                    frameName
                );
                if (tempColor) {
                    // tempColor is a Phaser.Display.Color instance
                    pickedColorObject = tempColor;
                }
            } catch (e) {
                console.error("Error getting pixel color for marker:", e);
            }
        }

        if (pickedColorObject) {
            if (!this.markerColors[markerIndex]) {
                this.markerColors[markerIndex] = new Phaser.Display.Color();
            }
            this.markerColors[markerIndex]?.setTo(
                pickedColorObject.red,
                pickedColorObject.green,
                pickedColorObject.blue
            );
        } else {
            this.markerColors[markerIndex]?.setTo(0, 0, 0);
        }

        if (
            this.markerColorDisplays[markerIndex] &&
            this.markerColors[markerIndex]
        ) {
            this.markerColorDisplays[markerIndex].setFillStyle(
                this.markerColors[markerIndex]?.color
            );
        }
    }

    private calculateMatchPercentage(
        attemptColor: Phaser.Display.Color | null,
        targetColor: Phaser.Display.Color
    ): number {
        if (!attemptColor || !targetColor) {
            return 0;
        }

        const r1 = attemptColor.red;
        const g1 = attemptColor.green;
        const b1 = attemptColor.blue;

        const r2 = targetColor.red;
        const g2 = targetColor.green;
        const b2 = targetColor.blue;

        // Calculate the difference for each channel
        const diffR = Math.abs(r1 - r2);
        const diffG = Math.abs(g1 - g2);
        const diffB = Math.abs(b1 - b2);

        // Calculate match percentage
        const matchPercentage = 100 - ((diffR + diffG + diffB) * 33) / 255;

        return Math.floor(matchPercentage);
    }

    getFinalScore(): number {
        if (
            !this.targetColor ||
            !this.markerColors ||
            this.markerColors.length === 0
        ) {
            return 0;
        }
        let maxMatchPercentage = 0;
        for (const markerAttemptColor of this.markerColors) {
            // Use the new helper method
            const currentMatchPercentage = this.calculateMatchPercentage(
                markerAttemptColor,
                this.targetColor
            );
            if (currentMatchPercentage > maxMatchPercentage) {
                maxMatchPercentage = currentMatchPercentage;
            }
        }
        return Math.floor(maxMatchPercentage);
    }

    startGame() {
        this.gameStartedTime = Date.now();
        this.timer.startTimer(this.gameDuration);
        this.gameStarted = true;
        this.gameEnded = false;
        this.isRotating = false;
        this.isPinching = false;

        for (let i = 0; i < this.numMarkers; i++) {
            this.markerColors[i]?.setTo(0, 0, 0);
            if (this.markerColorDisplays[i]) {
                this.markerColorDisplays[i].setFillStyle(0x000000);
            }
            if (this.markers[i]) {
                this.markers[i]
                    .getWorldTransformMatrix()
                    .transformPoint(0, 0, this.markerHelperPoint);
                this.updateColorUnderMarker(
                    this.markerHelperPoint.x,
                    this.markerHelperPoint.y,
                    i
                );
            }
        }
        console.log(
            `Target color: R=${this.targetColor.red} G=${this.targetColor.green} B=${this.targetColor.blue}`
        );
    }

    endGame() {
        this.timer.stopTimer(true);
        this.gameEnded = true;
        this.gameStarted = false;
        this.isRotating = false;
        this.isPinching = false;

        this.markers.forEach((marker, index) => {
            marker
                .getWorldTransformMatrix()
                .transformPoint(0, 0, this.markerHelperPoint);
            this.updateColorUnderMarker(
                this.markerHelperPoint.x,
                this.markerHelperPoint.y,
                index
            );
        });

        this.popupText.popupText(
            "Time's Up!",
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            2000,
            {
                fontSize: "80px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Jua",
                fontStyle: "bold",
            }
        );

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.judgeColorMatch();
            },
        });
    }

    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        // pop up result
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "Dye",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            if (this.isRotating) this.isRotating = false;
            if (this.isPinching) this.isPinching = false;
            return;
        }
    }

    judgeColorMatch() {
        // Judding the color match
        const individualResultDuration = 2500; // How long each individual result is shown
        const staggerDelay = 400; // Delay between showing each marker's result
        const resultsYPosition = this.cameras.main.centerY - 150; // Y position for individual results
        const resultXStep = 180; // Horizontal spacing between individual results

        let maxIndividualDisplayTime = 0;

        this.markerColors.forEach((markerColor, index) => {
            if (markerColor) {
                // Ensure there's a color to evaluate
                const displayDelay = index * staggerDelay;
                maxIndividualDisplayTime = Math.max(
                    maxIndividualDisplayTime,
                    displayDelay + individualResultDuration
                );

                this.time.delayedCall(displayDelay, () => {
                    const matchPercentage = this.calculateMatchPercentage(
                        markerColor,
                        this.targetColor
                    );
                    const score = Math.floor(matchPercentage);

                    // Calculate position for this marker's result text to center the group
                    const numMarkersToShow = this.numMarkers; // Assuming we show for all potential markers
                    const totalResultsWidth =
                        (numMarkersToShow - 1) * resultXStep;
                    const firstResultX =
                        this.cameras.main.centerX - totalResultsWidth / 2;
                    const posX = firstResultX + index * resultXStep;

                    this.popupText.popupText(
                        `${score}%`,
                        posX,
                        resultsYPosition,
                        individualResultDuration,
                        {
                            fontSize: "48px", // Slightly smaller for individual results
                            color: "#ffffff",
                            stroke: "#000000",
                            strokeThickness: 2,
                            align: "center",
                            fontFamily: "Jua",
                            fontStyle: "Bold",
                        }
                    );
                });
            } else {
                // Optionally, display something if a marker didn't pick a color
                const displayDelay = index * staggerDelay;
                maxIndividualDisplayTime = Math.max(
                    maxIndividualDisplayTime,
                    displayDelay + individualResultDuration
                );
                this.time.delayedCall(displayDelay, () => {
                    const numMarkersToShow = this.numMarkers;
                    const totalResultsWidth =
                        (numMarkersToShow - 1) * resultXStep;
                    const firstResultX =
                        this.cameras.main.centerX - totalResultsWidth / 2;
                    const posX = firstResultX + index * resultXStep;
                    this.popupText.popupText(
                        `N/A`,
                        posX,
                        resultsYPosition,
                        individualResultDuration,
                        {
                            fontSize: "48px",
                            color: "#aaaaaa",
                            stroke: "#000000",
                            strokeThickness: 2,
                            align: "center",
                            fontFamily: "Jua",
                            fontStyle: "Bold",
                        }
                    );
                });
            }
        });

        // Delay for "Game Over" and final result display
        // Ensure this happens after all individual results have had time to be seen
        const gameOverSequenceDelay =
            maxIndividualDisplayTime > 0 ? maxIndividualDisplayTime + 500 : 500; // Add a small buffer

        this.time.addEvent({
            delay: gameOverSequenceDelay,
            callback: () => {
                this.popupText.popupText(
                    "Game Over",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY, // Position "Game Over" message
                    2000, // Duration of "Game Over" message
                    {
                        fontSize: "128px",
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Jua",
                        fontStyle: "bold",
                    }
                );
                this.result();
            },
        });
    }
}

