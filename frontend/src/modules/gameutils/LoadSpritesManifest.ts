
// --- Interfaces matching your _common_sprites.json structure ---

interface FrameConfig {
    frameWidth: number;
    frameHeight: number;
    startFrame?: number; // Optional: Phaser uses this
    endFrame?: number;   // Optional: Phaser uses this
    margin?: number;     // Optional: Phaser uses this
    spacing?: number;    // Optional: Phaser uses this
}

// Interface for the 'frames' object within an animation definition
interface AnimationFramesConfig {
    start?: number; // Frame generation start index
    end?: number;   // Frame generation end index
    // You could extend this to support explicit frame arrays:
    // frames?: number[];
}

interface AnimationDefinition {
    key: string; // The key to use for scene.anims.create() and sprite.play()
    frames: AnimationFramesConfig; // Configuration for which frames to use
    frameRate: number;
    repeat: number; // -1 for loop, 0 for no loop, >0 for specific repeat count
}

// Interface for a single entry in your JSON array
export interface AssetDefinition {
    key: string; // The key used for loading (scene.load...) and referencing the texture
    type: 'image' | 'spritesheet';
    path: string;
    frameConfig?: FrameConfig; // Only used if type is 'spritesheet'
    animations?: AnimationDefinition[]; // Only used if type is 'spritesheet'
}

// --- Function to load assets during preload ---

/**
 * Loads images and spritesheets defined in the provided manifest data array.
 * Call this function within a Scene's `preload()` method.
 * Assumes the manifestData (parsed JSON) is available when called.
 *
 * @param scene The Phaser.Scene instance calling the load methods (usually 'this').
 * @param manifestData An array of AssetDefinition objects.
 */

export function LoadManifestFromJSON(scene: Phaser.Scene, manifestPath: string): void {
    if (!manifestPath) {
        console.error('[loadManifestFromJSON] Invalid manifest path provided.');
        return;
    }

    // Load the JSON file containing the asset definitions
    scene.load.json('assetManifest', manifestPath);

    // Once the JSON is loaded, parse it and call loadAssetsFromManifest
    scene.load.on('filecomplete-json-assetManifest', () => {
        const manifestData = scene.cache.json.get('assetManifest') as AssetDefinition[];
        if (!manifestData) {
            console.error('[loadManifestFromJSON] Failed to load asset manifest data.');
            return;
        }
        // Call the function to load assets from the manifest
        loadAssetsFromManifest(scene, manifestData);
    });
}

function loadAssetsFromManifest(scene: Phaser.Scene, manifestData: AssetDefinition[]): void {
    if (!manifestData || !Array.isArray(manifestData)) {
        console.error('[loadAssetsFromManifest] Invalid or missing manifest data provided.');
        return;
    }

    console.log(`[loadAssetsFromManifest] Starting asset loading from manifest (${manifestData.length} entries)...`);
    manifestData.forEach(asset => {
        try {
            // Basic validation of the asset entry
            if (!asset || typeof asset.key !== 'string' || typeof asset.path !== 'string' || typeof asset.type !== 'string') {
                 console.warn(`[loadAssetsFromManifest] Skipping invalid asset definition:`, asset);
                 return;
            }

            // console.log(`[loadAssetsFromManifest] Processing ${asset.type}: ${asset.key}`); // Verbose logging

            // Call the appropriate Phaser loader function based on type
            if (asset.type === 'image') {
                scene.load.image(asset.key, asset.path);
            } else if (asset.type === 'spritesheet') {
                // Ensure frameConfig exists and has necessary properties for spritesheets
                if (!asset.frameConfig || typeof asset.frameConfig.frameWidth !== 'number' || typeof asset.frameConfig.frameHeight !== 'number') {
                    console.warn(`[loadAssetsFromManifest] Skipping spritesheet '${asset.key}' due to missing or invalid frameConfig.`);
                    return; // Skip this spritesheet if config is bad
                }
                // Pass the whole frameConfig object to the loader
                scene.load.spritesheet(asset.key, asset.path, asset.frameConfig);
            } else {
                console.warn(`[loadAssetsFromManifest] Unsupported asset type '${asset.type}' encountered for key: ${asset.key}`);
            }
        } catch (error) {
            // Catch potential errors during the load call setup (rare)
            console.error(`[loadAssetsFromManifest] Error initiating load for asset ${asset.key}:`, error);
        }
    });
    // After all assets are queued, you can add a listener for the complete event
    scene.load.on('complete', () => {
        console.log(`[loadAssetsFromManifest] All assets loaded successfully.`);
        // Optionally, you can call createAnimationsFromManifest here if you want to create animations immediately after loading
        createAnimationsFromManifest(scene, manifestData);
    });
    // Optionally, you can add a progress listener to track loading progress
    
    console.log(`[loadAssetsFromManifest] Finished initiating asset loading.`);
}

// --- Function to create animations after loading ---

/**
 * Creates animations defined in the provided manifest data array.
 * Call this function within a Scene's `create()` method, after assets are loaded.
 * Assumes the manifestData (parsed JSON) is available when called.
 *
 * @param scene The Phaser.Scene instance where animations will be created (usually 'this').
 * @param manifestData An array of AssetDefinition objects.
 */
function createAnimationsFromManifest(scene: Phaser.Scene, manifestData: AssetDefinition[]): void {
     if (!manifestData || !Array.isArray(manifestData)) {
        console.error('[createAnimationsFromManifest] Invalid or missing manifest data provided.');
        return;
    }

    console.log(`[createAnimationsFromManifest] Starting animation creation from manifest...`);
    manifestData.forEach(asset => {
        // Only process spritesheets that have an 'animations' array
        if (asset.type === 'spritesheet' && asset.animations && Array.isArray(asset.animations)) {
            asset.animations.forEach(anim => {
                try {
                     // Basic validation of the animation definition
                     if (!anim || typeof anim.key !== 'string' || !anim.frames || typeof anim.frameRate !== 'number' || typeof anim.repeat !== 'number') {
                        console.warn(`[createAnimationsFromManifest] Skipping invalid animation definition for sheet '${asset.key}':`, anim);
                        return; // Skip invalid animation entry
                    }

                    // Avoid errors if an animation with the same key already exists
                    if (scene.anims.exists(anim.key)) {
                        // console.log(`[createAnimationsFromManifest] Animation key '${anim.key}' already exists. Skipping.`);
                        return;
                    }

                    // Construct the configuration for scene.anims.create()
                    const animConfig: Phaser.Types.Animations.Animation = {
                        key: anim.key, // The key for this specific animation
                        // Generate frame numbers using the SPRITESHEET's key (asset.key)
                        // and the start/end frames defined in the animation's 'frames' object
                        frames: scene.anims.generateFrameNumbers(asset.key, {
                            start: anim.frames.start ?? 0, // Default to frame 0 if start is missing
                            end: anim.frames.end ?? -1      // Default to -1 (all frames from start) if end is missing
                            // If you add explicit frame array support:
                            // frames: anim.frames.frames
                        }),
                        frameRate: anim.frameRate,
                        repeat: anim.repeat
                    };

                    // console.log(`[createAnimationsFromManifest] Creating animation: ${anim.key} (using sheet: ${asset.key})`); // Verbose logging
                    scene.anims.create(animConfig);

                } catch (error) {
                    // Catch errors during animation creation (e.g., texture key not found)
                    console.error(`[createAnimationsFromManifest] Error creating animation '${anim.key}' for sheet '${asset.key}':`, error);
                }
            });
        }
    });
    console.log(`[createAnimationsFromManifest] Finished creating animations.`);
}
