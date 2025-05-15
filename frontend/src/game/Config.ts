import Phaser from "phaser";
import { Boot } from "./scenes/common/Boot";
import { Preloader } from "./scenes/common/Preloader";
import { MainMenu } from "./scenes/common/MainMenu";
import { Clicker } from "./scenes/Clicker";
import { GameOver } from "./scenes/common/GameOver";
import { EndGame } from "./scenes/common/EndGame";
import { Reaction } from "./scenes/Reaction";
import { Roulette } from "./scenes/common/Roulette";
import { PerfectCircle } from "./scenes/PerfectCircle";
import { GameInstruction } from "./scenes/common/GameInstruction";
import { Mugungwha } from "./scenes/Mugungwha";
import { Wirewalk } from "./scenes/Wirewalk";
import { Josephus } from "./scenes/Josephus";
import { Dye } from "./scenes/Dye";
import { Knight } from "./scenes/Knight";
import { NumberSurvivor } from "./scenes/NumberSurvivor";
import { Panopticon } from "./scenes/Panopticon";
import { Dice } from "./scenes/Dice";
import { ColorHunterG } from "./scenes/ColorHunterG";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "phaser-game",
    backgroundColor: "#000000",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
        activePointers: 2,
        touch: {
            capture: true,
        },
    },
    disableContextMenu: true,
    render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 300 },
            debug: false,
        },
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        GameOver,
        Roulette,
        Clicker,
        Reaction,
        GameInstruction,
        PerfectCircle,
        Mugungwha,
        Wirewalk,
        Josephus,
        Dye,
        Knight,
        NumberSurvivor,
        Panopticon,
        Dice,
        ColorHunterG,
        EndGame,
    ],
};

export default config;

