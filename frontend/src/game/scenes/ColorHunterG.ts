import { Scene } from "phaser";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import potgManager from "../../modules/POTGManager";

export class ColorHunterG extends Scene {
    // Common settings
    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;

    // Single Target Color
    private targetColor: Phaser.Display.Color;

    private videoStream: MediaStream | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvasElement: HTMLCanvasElement | null = null; // For drawing video frames
    private readonly liveVideoTextureKey = "liveCameraFeed";
    private cameraFeedDisplay: Phaser.GameObjects.Image | null = null;

    private cameraFrame: Phaser.GameObjects.Graphics;

    private marker: Phaser.GameObjects.Sprite;
    private markerColor: Phaser.Display.Color;
    private markerHelperPoint: Phaser.Math.Vector2;

    // UI Elements
    private targetColorDisplay: Phaser.GameObjects.Rectangle;
    private switchCameraButton: Phaser.GameObjects.Text | null = null;
    private availableVideoDevices: MediaDeviceInfo[] = [];
    private currentVideoDeviceIndex: number = 0;

    private colorhunterg_bgm: Phaser.Sound.BaseSound;

    constructor() {
        super("ColorHunterG");
    }

    private async enumerateVideoDevices() {
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.enumerateDevices
        ) {
            console.warn("enumerateDevices() not supported.");
            return;
        }
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableVideoDevices = devices.filter(
                (device) => device.kind === "videoinput"
            );
            if (this.availableVideoDevices.length > 0) {
                this.showSwitchCameraButton();
            }
        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    }

    private async setupCamera(deviceId?: string): Promise<boolean> {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia not supported on this browser.");
            return false;
        }

        this.stopVideoStream(); // Stop any existing stream before starting a new one

        const constraints: MediaStreamConstraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
            },
            audio: false,
        };

        if (deviceId) {
            (constraints.video as MediaTrackConstraints).deviceId = {
                exact: deviceId,
            };
        } else {
            // Default to environment (rear) camera if no deviceId is specified
            (constraints.video as MediaTrackConstraints).facingMode =
                "environment";
        }

        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia(
                constraints
            );

            if (!this.videoStream) {
                console.error("Failed to get video stream.");
                return false;
            }

            this.videoElement = document.createElement("video");
            this.videoElement.srcObject = this.videoStream;
            this.videoElement.playsInline = true;
            this.videoElement.autoplay = true;

            await new Promise<void>((resolve, reject) => {
                this.videoElement!.onloadedmetadata = () => {
                    this.videoElement!.play()
                        .then(() => {
                            if (
                                this.textures.exists(this.liveVideoTextureKey)
                            ) {
                                this.textures.remove(this.liveVideoTextureKey);
                            }
                            // Create a canvas to draw video frames onto
                            this.canvasElement =
                                document.createElement("canvas");
                            this.canvasElement.width =
                                this.videoElement!.videoWidth;
                            this.canvasElement.height =
                                this.videoElement!.videoHeight;

                            if (
                                this.canvasElement.width === 0 ||
                                this.canvasElement.height === 0
                            ) {
                                console.warn(
                                    "Video dimensions are zero, canvas texture might not work as expected. Using default 640x480."
                                );
                                this.canvasElement.width = 640;
                                this.canvasElement.height = 480;
                            }

                            this.textures.addCanvas(
                                this.liveVideoTextureKey,
                                this.canvasElement
                            );
                            console.log(
                                "Canvas texture added for live video feed."
                            );
                            // If cameraFeedDisplay already exists, update its texture
                            if (this.cameraFeedDisplay) {
                                this.cameraFeedDisplay.setTexture(
                                    this.liveVideoTextureKey
                                );
                            }
                            resolve();
                        })
                        .catch((playError) => {
                            console.error("Error playing video:", playError);
                            reject(playError);
                        });
                };
                this.videoElement!.onerror = (err) => {
                    console.error("Video element error:", err);
                    reject(err);
                };
            });
            return true;
        } catch (error) {
            console.error("Error accessing or setting up camera:", error);
            this.stopVideoStream();
            return false;
        }
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 15;
        this.gameStarted = false;
        this.gameEnded = false;

        this.targetColor = new Phaser.Display.Color(
            Phaser.Math.Between(50, 255),
            Phaser.Math.Between(50, 255),
            Phaser.Math.Between(50, 255)
        );

        this.markerColor = new Phaser.Display.Color(0, 0, 0);
        this.markerHelperPoint = new Phaser.Math.Vector2();
        this.currentVideoDeviceIndex = 0;
        this.availableVideoDevices = [];
    }

    preload() {
        // this.load.audio(
        //     "colorhunterg_bgm",
        //     "assets/colorhunterg/colorhunterg_bgm.mp3"
        // );
        // this.load.image(
        //     "colorhunterg_marker",
        //     "assets/colorhunterg/colorhunterg_marker.png"
        // );
        // this.load.start();
    }

    create() {
        // Make create async
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        this.colorhunterg_bgm = this.sound.add("colorhunterg_bgm", {
            loop: true,
        });

        this.add
            .graphics()
            .fillStyle(0xebebd3, 1) // General background
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        this.events.on("countdownFinished", () => {
            this.startGame();
        });

        this.events.on("timerFinished", () => {
            this.endGame();
        });

        this.countdown.startCountdown(3);
    }

    private showSwitchCameraButton() {
        if (this.switchCameraButton) {
            this.switchCameraButton.destroy();
        }

        const swichCameraBackground = this.add.graphics();
        swichCameraBackground
            .fillStyle(0x000000, 0.25)
            .fillRoundedRect(
                this.cameras.main.centerX - 100,
                (this.cameras.main.height * 5) / 6,
                200,
                70,
                30
            );

        this.switchCameraButton = this.add
            .text(
                this.cameras.main.centerX,
                (this.cameras.main.height * 5) / 6 + 10,
                "카메라 전환",
                {
                    fontSize: "32px",
                    color: "#ffffff",
                    fontFamily: "Jua",
                    padding: { x: 10, y: 5 },
                }
            )
            .setOrigin(0.5, 0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                this.tweens.add({
                    targets: this.switchCameraButton,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100,
                    ease: "Power1",
                    yoyo: true,
                    onComplete: () => {
                        this.switchCameraButton?.setScale(1);
                    },
                });
                this.switchCamera();
            });

        this.switchCameraButton.setVisible(
            this.availableVideoDevices.length > 0
        );
    }

    private async switchCamera() {
        if (this.availableVideoDevices.length <= 1) {
            console.log("No other cameras to switch to.");
            return;
        }

        this.currentVideoDeviceIndex =
            (this.currentVideoDeviceIndex + 1) %
            this.availableVideoDevices.length;
        const nextDeviceId =
            this.availableVideoDevices[this.currentVideoDeviceIndex].deviceId;

        console.log(
            `Switching to camera: ${
                this.availableVideoDevices[this.currentVideoDeviceIndex]
                    .label || nextDeviceId
            }`
        );

        // Disable button during switch
        if (this.switchCameraButton)
            this.switchCameraButton.disableInteractive();

        const cameraSwitched = await this.setupCamera(nextDeviceId);
        if (cameraSwitched) {
            // Re-enable button
            if (this.switchCameraButton)
                this.switchCameraButton.setInteractive({ useHandCursor: true });
            // Ensure the camera feed display is updated if it exists
            if (
                this.cameraFeedDisplay &&
                this.textures.exists(this.liveVideoTextureKey)
            ) {
                this.cameraFeedDisplay.setTexture(this.liveVideoTextureKey);
                this.cameraFeedDisplay.setVisible(true);
            } else if (
                !this.cameraFeedDisplay &&
                this.gameStarted &&
                this.textures.exists(this.liveVideoTextureKey)
            ) {
                // If game started and display was not created due to previous camera issue
                this.cameraFeedDisplay = this.add.image(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY + 70,
                    this.liveVideoTextureKey
                );
                this.cameraFeedDisplay.setDisplaySize(512, 512);
            }
        } else {
            this.popupText.popupText(
                "Failed to switch camera.",
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                2000
            );
            // Re-enable button even on failure
            if (this.switchCameraButton)
                this.switchCameraButton.setInteractive({ useHandCursor: true });
        }
    }

    updateColorUnderCenterMarker() {
        if (
            !this.textures.exists(this.liveVideoTextureKey) ||
            !this.canvasElement
        ) {
            this.markerColor.setTo(0, 0, 0);
            return;
        }

        const source = this.textures
            .get(this.liveVideoTextureKey)
            .getSourceImage() as HTMLCanvasElement;

        if (!source || source.width === 0 || source.height === 0) {
            this.markerColor.setTo(0, 0, 0);
            return;
        }

        const sampleX = Math.floor(source.width / 2);
        const sampleY = Math.floor(source.height / 2);

        const pixelData = this.textures.getPixel(
            sampleX,
            sampleY,
            this.liveVideoTextureKey
        );

        if (pixelData) {
            this.markerColor.setTo(
                pixelData.red,
                pixelData.green,
                pixelData.blue
            );
        } else {
            this.markerColor.setTo(0, 0, 0);
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

        const diffR = Math.abs(r1 - r2);
        const diffG = Math.abs(g1 - g2);
        const diffB = Math.abs(b1 - b2);

        const matchPercentage = 100 - ((diffR + diffG + diffB) * 33) / 255;

        return Math.floor(matchPercentage);
    }

    getFinalScore(): number {
        if (!this.targetColor || !this.markerColor) {
            return 0;
        }
        const matchPercentage = this.calculateMatchPercentage(
            this.markerColor,
            this.targetColor
        );
        return Math.floor(matchPercentage);
    }

    startGame() {
        this.gameStartedTime = Date.now();
        this.timer.startTimer(this.gameDuration);
        this.gameStarted = true;
        this.gameEnded = false;

        this.colorhunterg_bgm?.play();

        const targetDisplayX = this.cameras.main.centerX;
        const targetDisplayY = this.cameras.main.height / 6;
        this.add
            .text(
                targetDisplayX,
                targetDisplayY,
                "제시된 색을 카메라에 담아라!",
                {
                    // Adjusted Y position
                    fontSize: "48px",
                    color: "#ffffff",
                    fontFamily: "Jua",
                    fontStyle: "bold",
                    stroke: "#000000",
                    strokeThickness: 2,
                }
            )
            .setOrigin(0.5);
        this.targetColorDisplay = this.add
            .rectangle(
                targetDisplayX,
                targetDisplayY + 80,
                140,
                70,
                this.targetColor.color
            )
            .setStrokeStyle(3, 0xffffff)
            .setOrigin(0.5);

        const cameraReadyFunction = async () => {
            await this.enumerateVideoDevices(); // Enumerate devices first

            const cameraReady = await this.setupCamera(
                this.availableVideoDevices.length > 0
                    ? this.availableVideoDevices[this.currentVideoDeviceIndex]
                          ?.deviceId
                    : undefined
            );

            if (!cameraReady) {
                this.add
                    .graphics()
                    .fillStyle(0x222222, 1)
                    .fillRect(
                        0,
                        0,
                        this.cameras.main.width,
                        this.cameras.main.height
                    );
                this.popupText.popupText(
                    "Camera not available.",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY - 60,
                    3000
                );
            }

            if (this.textures.exists(this.liveVideoTextureKey)) {
                if (!this.cameraFeedDisplay) {
                    this.cameraFeedDisplay = this.add.image(
                        this.cameras.main.centerX,
                        this.cameras.main.centerY + 70,
                        this.liveVideoTextureKey
                    );
                } else {
                    this.cameraFeedDisplay
                        .setTexture(this.liveVideoTextureKey)
                        .setVisible(true);
                }
                this.cameraFeedDisplay.setDisplaySize(512, 512);
            } else {
                const fallbackGraphics = this.add.graphics();
                fallbackGraphics.fillStyle(0x444444, 1);
                fallbackGraphics.fillRect(
                    this.cameras.main.centerX - 256,
                    this.cameras.main.centerY - 186,
                    512,
                    512
                );
            }

            if (!this.cameraFrame) {
                this.cameraFrame = this.add.graphics();
            }
            this.cameraFrame.clear();
            this.cameraFrame.lineStyle(4, 0xffffff, 1);
            this.cameraFrame.strokeRect(
                this.cameras.main.centerX - 256,
                this.cameras.main.centerY - 186,
                512,
                512
            );

            this.marker = new Phaser.GameObjects.Sprite(
                this,
                this.cameras.main.centerX,
                this.cameras.main.centerY + 70,
                "colorhunterg_marker"
            ).setOrigin(0.5, 0.5);
            this.add.existing(this.marker);
        };
        cameraReadyFunction();

        if (this.availableVideoDevices.length > 1 && !this.switchCameraButton) {
            this.showSwitchCameraButton();
        } else if (this.switchCameraButton) {
            this.switchCameraButton.setVisible(
                this.availableVideoDevices.length > 1
            );
        }

        console.log(
            `Target color: R=${this.targetColor.red} G=${this.targetColor.green} B=${this.targetColor.blue}`
        );

        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                potgManager.startCanvasRecording();
            };
            clearBeforeStart();
        } else potgManager.startCanvasRecording();
    }

    endGame() {
        this.timer.stopTimer(true);
        this.gameEnded = true;
        this.gameStarted = false;

        this.colorhunterg_bgm?.stop();

        this.updateColorUnderCenterMarker();

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
                fontFamily: "Fredoka",
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

        if (potgManager.getIsRecording()) {
            potgManager.stopRecording();
        }

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "ColorHunterG",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        if (
            this.videoElement &&
            this.canvasElement &&
            this.cameraFeedDisplay &&
            this.videoElement.readyState >= this.videoElement.HAVE_CURRENT_DATA
        ) {
            // Ensure canvas dimensions match video dimensions if they changed or weren't set initially
            if (
                this.canvasElement.width !== this.videoElement.videoWidth ||
                this.canvasElement.height !== this.videoElement.videoHeight
            ) {
                if (
                    this.videoElement.videoWidth > 0 &&
                    this.videoElement.videoHeight > 0
                ) {
                    this.canvasElement.width = this.videoElement.videoWidth;
                    this.canvasElement.height = this.videoElement.videoHeight;
                }
            }

            const ctx = this.canvasElement.getContext("2d");
            if (
                ctx &&
                this.canvasElement.width > 0 &&
                this.canvasElement.height > 0
            ) {
                ctx.drawImage(
                    this.videoElement,
                    0,
                    0,
                    this.canvasElement.width,
                    this.canvasElement.height
                );
                // Refresh the texture to reflect the new canvas content
                if (
                    this.cameraFeedDisplay.texture.key ===
                    this.liveVideoTextureKey
                ) {
                    (
                        this.cameraFeedDisplay
                            .texture as Phaser.Textures.CanvasTexture
                    ).refresh();
                }
            }
        }
        // Optionally, update the sampled color display continuously for debugging or live feedback
        // this.updateColorUnderCenterMarker();
    }

    judgeColorMatch() {
        const resultsYPosition = this.cameras.main.centerY - 200;

        const resultDuration = 2500;

        const markerColor = this.markerColor;
        if (markerColor) {
            this.time.delayedCall(0, () => {
                const matchPercentage = this.calculateMatchPercentage(
                    markerColor,
                    this.targetColor
                );
                const score = Math.floor(matchPercentage);

                const posX = this.cameras.main.centerX - 100;

                this.add.text(posX, resultsYPosition, `${score}%`, {
                    fontSize: "48px",
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                    fontFamily: "Jua",
                    fontStyle: "Bold",
                });
            });

            const finalColor = this.add.graphics();
            finalColor.fillStyle(markerColor.color, 1);
            finalColor.fillRect(
                this.cameras.main.centerX + 50,
                resultsYPosition - 10,
                70,
                70
            );

            const finalColorStroke = this.add.graphics();
            finalColorStroke.lineStyle(3, 0xffffff, 1);
            finalColorStroke.strokeRect(
                this.cameras.main.centerX + 50,
                resultsYPosition - 10,
                70,
                70
            );
        } else {
            this.time.delayedCall(0, () => {
                const posX = this.cameras.main.centerX;
                this.popupText.popupText(
                    `N/A`,
                    posX,
                    resultsYPosition,
                    resultDuration,
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

        const gameOverSequenceDelay =
            resultDuration > 0 ? resultDuration + 500 : 500;

        this.time.addEvent({
            delay: gameOverSequenceDelay,
            callback: () => {
                this.popupText.popupText(
                    "Game Over",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    2000,
                    {
                        fontSize: "128px",
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Fredoka",
                        fontStyle: "bold",
                    }
                );
                this.result();
            },
        });
    }

    private stopVideoStream() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach((track) => track.stop());
            this.videoStream = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null; // Important to release the stream
            this.videoElement = null;
        }
        // Canvas element is managed by texture manager or destroyed with scene,
        // but good practice to nullify if holding direct reference.
        this.canvasElement = null;
    }

    shutdown() {
        this.stopVideoStream();
        if (this.textures.exists(this.liveVideoTextureKey)) {
            this.textures.remove(this.liveVideoTextureKey);
        }
        this.cameraFeedDisplay?.destroy();
        this.cameraFrame?.destroy();
        this.switchCameraButton?.destroy();
    }
}

