import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../../modules/gameutils/LoadSpritesManifest";

export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image("background", "assets/bg.png");

        // Clicker
        this.load.audio("clicker_bgm", "assets/clicker/clicker_bgm.mp3");
        this.load.audio(
            "clicker_good",
            "assets/clicker/SUCCESSPICKUPCollectBeep04.wav"
        );
        this.load.audio(
            "clicker_fail",
            "assets/clicker/NEGATIVEFailureBeeps04.wav"
        );

        // Color Hunter G
        this.load.audio(
            "colorhunterg_bgm",
            "assets/colorhunterg/colorhunterg_bgm.mp3"
        );
        this.load.image(
            "colorhunterg_marker",
            "assets/colorhunterg/colorhunterg_marker.png"
        );

        // Dye
        this.load.audio("dye_bgm", "assets/dye/dye_bgm.mp3");
        this.load.image("dye_pallete_1", "assets/dye/dye_pallete_1.png");
        this.load.image("dye_pallete_2", "assets/dye/dye_pallete_2.png");
        this.load.image("dye_pallete_3", "assets/dye/dye_pallete_3.png");
        this.load.image("dye_pallete_4", "assets/dye/dye_pallete_4.png");
        this.load.image("marker", "assets/dye/dye_marker.png");

        // Josephus
        this.load.image("josephus", "assets/josephus/josephus.png");
        this.load.audio(
            "josephus_alive",
            "assets/josephus/VOCALCUTECallHappy01.wav"
        );
        this.load.audio(
            "josephus_doomed",
            "assets/josephus/VOCALCUTEDistressPainShort12.wav"
        );
        this.load.audio(
            "josephus_select",
            "assets/josephus/VOCALCUTECallAffection07.wav"
        );
        this.load.audio("josephus_bgm", "assets/josephus/josephus_bgm.mp3");

        // Knight
        this.load.audio("knight_bgm", "assets/knight/knight_bgm.mp3");
        this.load.audio(
            "knight_slash",
            "assets/knight/IMPACTMetalBladeClang01.wav"
        );
        this.load.audio(
            "knight_parry",
            "assets/knight/IMPACTMetalBladeChink07.wav"
        );
        this.load.audio(
            "knight_hit",
            "assets/knight/IMPACTMetalHitShort 03.wav"
        );
        this.load.audio(
            "knight_fail",
            "assets/knight/NEGATIVEFailure DescendingBellRun02.wav"
        );
        LoadManifestFromJSON(this, "assets/knight/manifest.json");

        // Mugungwha
        LoadManifestFromJSON(this, "assets/mugungwha/manifest.json");
        this.load.audio("mugungwha_pop", "assets/mugungwha/POPBrust01.wav");
        this.load.audio(
            "mugungwha_fail",
            "assets/mugungwha/TECHINTERFACEComputerBeepsLong02.wav"
        );
        this.load.audio("mugungwha_01", "assets/mugungwha/mugungwha_01.mp3");
        this.load.audio("mugungwha_02", "assets/mugungwha/mugungwha_02.mp3");
        this.load.audio("mugungwha_03", "assets/mugungwha/mugungwha_03.mp3");
        this.load.audio("mugungwha_bgm", "assets/mugungwha/mugungwha_bgm.mp3");

        // Panopticon
        LoadManifestFromJSON(this, "assets/panopticon/manifest.json");
        this.load.audio(
            "panopticon_bgm",
            "assets/panopticon/panopticon_bgm.mp3"
        );
        this.load.audio(
            "panopticon_fail",
            "assets/panopticon/TECHINTERFACEComputerBeepsLong02.wav"
        );

        // Wirewalk
        this.load.image("wirewalk_player", "assets/wirewalk/wirewalk_guy.png");
        this.load.image("wire", "assets/wirewalk/wire.png");
        this.load.audio(
            "wirewalk_fail",
            "assets/wirewalk/TECHINTERFACEComputerBeepsLong02.wav"
        );
        this.load.audio(
            "wirewalk_btn",
            "assets/wirewalk/VOCALEVILImpactHitOOOF03.wav"
        );
        this.load.audio("wirewalk_bgm", "assets/wirewalk/wirewalk_bgm.mp3");

        // Dice
        this.load.setBaseURL("https://cdn.phaserfiles.com/v385");
        this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
        this.load.obj("dice-obj", "assets/dice/dice.obj");

        this.load.setBaseURL("");
        this.load.image("woodBackground", "assets/dice/diceBackground.png");
        this.load.audio("diceRoll", "assets/dice/diceRoll.wav");
        this.load.audio("totalSumSound", "assets/dice/STGR_Success_Calm_1.wav");
        this.load.audio("diceBgm", "assets/dice/Dice_bgm.mp3");
    }

    create() {
        this.scene.start("Preloader");
    }
}

