import Phaser from "phaser";

interface DiceState {
    mesh: Phaser.GameObjects.Mesh;
    shadow: any;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ampX: number;
    ampY: number;
    freq: number;
    phase: number;
    rotSpeedX: number;
    rotSpeedY: number;
    result: number;
    text?: Phaser.GameObjects.Text;
}

export class DiceMiniGame {
    private scene: Phaser.Scene;
    private dice: DiceState[] = [];
    private diceRolling = false;
    private diceResultText?: Phaser.GameObjects.Text;

    private readonly diceSize = 160;
    private readonly wallPadding = 10;
    private readonly rollDuration = 3000; // ms

    // 각 면에 대응하는 회전값(라디안)
    private readonly faceRotations = [
        { face: 1, x: 0, y: -Math.PI / 2 },
        { face: 2, x: Math.PI / 2, y: 0 },
        { face: 3, x: Math.PI, y: 0 },
        { face: 4, x: Math.PI, y: Math.PI },
        { face: 5, x: -Math.PI / 2, y: 0 },
        { face: 6, x: 0, y: Math.PI / 2 },
    ];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public create(centerX: number, centerY: number) {
        this.dice = [];
        const spacing = this.diceSize;
        const positions = [
            { x: centerX - spacing, y: centerY - spacing},
            { x: centerX - spacing, y: centerY + spacing},
            { x: centerX + spacing, y: centerY - spacing},
            { x: centerX + spacing, y: centerY + spacing},
        ];

        for (let i = 0; i < 4; i++) {
            const mesh = this.scene.add.mesh(positions[i].x, positions[i].y, "dice-albedo");
            const shadow = mesh.postFX.addShadow(0, 0, 0.006, 2, 0x111111, 10, 0.8);
            mesh.addVerticesFromObj("dice-obj", 0.25);
            mesh.panZ(6);
            mesh.modelRotation.x = Phaser.Math.DegToRad(0);
            mesh.modelRotation.y = Phaser.Math.DegToRad(-90);
            mesh.setScale(0.5);

            this.dice.push({
                mesh,
                shadow,
                x: positions[i].x,
                y: positions[i].y,
                vx: Phaser.Math.FloatBetween(-0.25, 0.25),
                vy: Phaser.Math.FloatBetween(-0.25, 0.25),
                ampX: Phaser.Math.Between(8, 18),
                ampY: Phaser.Math.Between(8, 18),
                freq: Phaser.Math.FloatBetween(0.003, 0.008),
                phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
                rotSpeedX: Phaser.Math.FloatBetween(0.2, 0.5),
                rotSpeedY: Phaser.Math.FloatBetween(0.3, 0.6),
                result: 1,
            });
        }

        // 결과 텍스트
        const screenHeight = this.scene.cameras.main.height;
        this.diceResultText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            screenHeight - 200,
            "0",
            {
                fontFamily: "Jua",
                fontSize: 64,
                color: "#42cafd"
            }
        ).setOrigin(0.5);

        // 클릭 시 주사위 굴리기
        this.scene.input.on('pointerdown', () => {
            this.rollDice();
        });
    }

    private checkAndResolveBoxCollision(d1: DiceState, d2: DiceState, size: number): boolean {
        if (
            Math.abs(d1.x - d2.x) < size &&
            Math.abs(d1.y - d2.y) < size
        ) {
            const overlapX = size - Math.abs(d1.x - d2.x);
            const overlapY = size - Math.abs(d1.y - d2.y);

            if (overlapX < overlapY) {
                const sign = d1.x < d2.x ? -1 : 1;
                d1.x += sign * overlapX / 2;
                d2.x -= sign * overlapX / 2;
                const temp = d1.vx;
                d1.vx = d2.vx * 0.7 + Phaser.Math.FloatBetween(-0.1, 0.1);
                d2.vx = temp * 0.7 + Phaser.Math.FloatBetween(-0.1, 0.1);
            } else {
                const sign = d1.y < d2.y ? -1 : 1;
                d1.y += sign * overlapY / 2;
                d2.y -= sign * overlapY / 2;
                const temp = d1.vy;
                d1.vy = d2.vy * 0.7 + Phaser.Math.FloatBetween(-0.1, 0.1);
                d2.vy = temp * 0.7 + Phaser.Math.FloatBetween(-0.1, 0.1);
            }
            return true;
        }
        return false;
    }

    private resolveFinalBoxCollisions(dice: DiceState[], size: number) {
        const maxIterations = 10;
        for (let iter = 0; iter < maxIterations; iter++) {
            let collisionOccurred = false;
            for (let i = 0; i < dice.length; i++) {
                for (let j = i + 1; j < dice.length; j++) {
                    if (this.checkAndResolveBoxCollision(dice[i], dice[j], size)) {
                        collisionOccurred = true;
                    }
                }
            }
            if (!collisionOccurred) break;
        }
    }

    private getTopFaceByRotation(x: number, y: number): number {
        let minDist = Infinity;
        let result = 1;
        for (const rot of this.faceRotations) {
            const dx = Phaser.Math.Angle.Wrap(x - rot.x);
            const dy = Phaser.Math.Angle.Wrap(y - rot.y);
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                result = rot.face;
            }
        }
        return result;
    }

    // 추가: 윗면에 맞게 반듯하게 정렬
    private alignDiceToTopFace(dice: DiceState) {
        const rot = this.faceRotations.find(r => r.face === dice.result);
        if (!rot) return;
        dice.mesh.modelRotation.x = rot.x;
        dice.mesh.modelRotation.y = rot.y;
    }

    private rollDice() {
        if (this.diceRolling) return;
        this.diceRolling = true;

        for (let i = 0; i < this.dice.length; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.FloatBetween(0.35, 0.75);
            this.dice[i].vx = Math.cos(angle) * speed + Phaser.Math.FloatBetween(-0.1, 0.1);
            this.dice[i].vy = Math.sin(angle) * speed + Phaser.Math.FloatBetween(-0.1, 0.1);
            this.dice[i].ampX = Phaser.Math.Between(8, 18);
            this.dice[i].ampY = Phaser.Math.Between(8, 18);
            this.dice[i].freq = Phaser.Math.FloatBetween(0.003, 0.008);
            this.dice[i].phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
            if (this.dice[i].text) this.dice[i].text = undefined;
        }

        let elapsed = 0;
        const rollDuration = this.rollDuration;
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const size = this.diceSize;

        const updateRoll = (_time: number, delta: number) => {
            elapsed += delta;
            const t = Phaser.Math.Clamp(elapsed / rollDuration, 0, 1);
            const easeOut = 1 - Math.pow(1 - t, 3);

            for (let i = 0; i < this.dice.length; i++) {
                const d = this.dice[i];
                d.vx *= 0.995 - 0.4 * t;
                d.vy *= 0.995 - 0.4 * t;

                if (Phaser.Math.FloatBetween(0, 1) < 0.08) {
                    const randAngle = Phaser.Math.FloatBetween(-0.3, 0.3);
                    const cosA = Math.cos(randAngle);
                    const sinA = Math.sin(randAngle);
                    const vx = d.vx * cosA - d.vy * sinA;
                    const vy = d.vx * sinA + d.vy * cosA;
                    d.vx = vx + Phaser.Math.FloatBetween(-0.03, 0.03);
                    d.vy = vy + Phaser.Math.FloatBetween(-0.03, 0.03);
                }

                d.x += d.vx * (1 - easeOut) * 22;
                d.y += d.vy * (1 - easeOut) * 22;
                d.x += Math.sin(elapsed * d.freq + d.phase) * d.ampX * (1 - t) * Phaser.Math.FloatBetween(0.7, 1.3);
                d.y += Math.cos(elapsed * d.freq + d.phase) * d.ampY * (1 - t) * Phaser.Math.FloatBetween(0.7, 1.3);

                const half = size / 2;
                const left = this.wallPadding + half;
                const right = width - this.wallPadding - half;
                const top = this.wallPadding + half;
                const bottom = height - 100 - half;

                if (d.x < left) {
                    d.x = left;
                    d.vx = Math.abs(d.vx) * Phaser.Math.FloatBetween(0.7, 1.0);
                } else if (d.x > right) {
                    d.x = right;
                    d.vx = -Math.abs(d.vx) * Phaser.Math.FloatBetween(0.7, 1.0);
                }
                if (d.y < top) {
                    d.y = top;
                    d.vy = Math.abs(d.vy) * Phaser.Math.FloatBetween(0.7, 1.0);
                } else if (d.y > bottom) {
                    d.y = bottom;
                    d.vy = -Math.abs(d.vy) * Phaser.Math.FloatBetween(0.7, 1.0);
                }
            }

            for (let i = 0; i < this.dice.length; i++) {
                for (let j = i + 1; j < this.dice.length; j++) {
                    this.checkAndResolveBoxCollision(this.dice[i], this.dice[j], size);
                }
            }

            for (let i = 0; i < this.dice.length; i++) {
                const d = this.dice[i];
                d.mesh.modelRotation.x += d.rotSpeedX * ((1 - easeOut) * 1.1 + 0.06);
                d.mesh.modelRotation.y += d.rotSpeedY * ((1 - easeOut) * 1.1 + 0.06);
                d.mesh.x = d.x;
                d.mesh.y = d.y;
                d.shadow.x = 0;
                d.shadow.y = 0;
            }

            if (elapsed >= rollDuration) {
                this.resolveFinalBoxCollisions(this.dice, size);
                for (let i = 0; i < this.dice.length; i++) {
                    const d = this.dice[i];
                    d.mesh.x = d.x;
                    d.mesh.y = d.y;
                }

                // 윗면 판정 및 정렬
                for (let i = 0; i < this.dice.length; i++) {
                    const d = this.dice[i];
                    d.result = this.getTopFaceByRotation(d.mesh.modelRotation.x, d.mesh.modelRotation.y);
                    this.alignDiceToTopFace(d); // 추가!
                }

                this.diceResultText?.setText(`${this.dice.reduce((a, b) => a + b.result, 0)}`);
                this.diceRolling = false;
                this.scene.events.off('update', updateRoll);
            }
        };

        this.scene.events.on('update', updateRoll);
    }

    public destroy() {
        this.dice.forEach(d => {
            d.mesh.destroy();
            d.text?.destroy();
        });
        this.diceResultText?.destroy();
    }
}
