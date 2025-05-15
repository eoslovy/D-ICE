import { EventEmitter } from 'eventemitter3';

// --- IndexedDB Configuration ---
const DB_NAME = 'POTGDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';
const RECORDING_KEY = 'latestRecording'; // Fixed key to always overwrite

class POTGManager extends EventEmitter {
    // Use native MediaRecorder
    private recorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null; // Can be from canvas or display
    private isRecording: boolean = false;
    private dbPromise: Promise<IDBDatabase> | null = null;

    // --- Chunk Properties ---
    private recordedChunks: Blob[] = [];
    private readonly TIMESLICE_INTERVAL_MS = 1000; // How often to get a chunk (e.g., 1 second)
    private mimeType: string = 'video/webm';

    constructor() {
        super();
        this.dbPromise = this._openDB();
        this.dbPromise.catch(err => console.error("[POTGManager] Failed to open IndexedDB:", err));
    }

    // --- IndexedDB Helper Methods ---
    private _openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[POTGManager] IndexedDB error:', request.error);
                reject(new Error(`IndexedDB error: ${request.error?.message}`));
            };

            request.onsuccess = (event) => {
                console.log('[POTGManager] IndexedDB opened successfully.');
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                console.log('[POTGManager] IndexedDB upgrade needed.');
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                    console.log(`[POTGManager] Object store '${STORE_NAME}' created.`);
                }
            };
        });
    }

    private async _getDB(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = this._openDB();
        }
        try {
            return await this.dbPromise;
        } catch (error) {
            console.error("[POTGManager] Retrying DB connection...");
            this.dbPromise = this._openDB();
            return await this.dbPromise;
        }
    }

    private async _saveBlobToDB(blob: Blob): Promise<void> {
        try {
            const db = await this._getDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(blob, RECORDING_KEY);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('[POTGManager] Recording saved to IndexedDB.');
                    resolve();
                };
                request.onerror = () => {
                    console.error('[POTGManager] Error saving blob to IndexedDB:', request.error);
                    reject(request.error);
                };
                transaction.oncomplete = () => {};
                transaction.onerror = () => {
                    console.error('[POTGManager] Transaction error saving blob:', transaction.error);
                    reject(transaction.error);
                };
            });
        } catch (error) {
            console.error('[POTGManager] Failed to get DB for saving:', error);
            throw error;
        }
    }

    async getStoredRecordingBlob(): Promise<Blob | null> {
        try {
            const db = await this._getDB();
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(RECORDING_KEY);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result instanceof Blob) {
                        console.log('[POTGManager] Recording retrieved from IndexedDB.');
                        resolve(request.result);
                    } else {
                        console.log('[POTGManager] No recording found in IndexedDB.');
                        resolve(null);
                    }
                };
                request.onerror = () => {
                    console.error('[POTGManager] Error retrieving blob from IndexedDB:', request.error);
                    reject(request.error);
                };
                transaction.onerror = () => {
                    console.error('[POTGManager] Transaction error retrieving blob:', transaction.error);
                    reject(transaction.error);
                };
            });
        } catch (error) {
            console.error('[POTGManager] Failed to get DB for retrieving blob:', error);
            return null;
        }
    }

    // --- Recording Methods ---

    async startScreenRecording(): Promise<boolean> {
        if (this.isRecording) {
            console.warn('[POTGManager] Recording already in progress.');
            return false;
        }

        try {
            this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            if (!this.stream || !this.stream.active) {
                return false;
            }

            this.stream.getVideoTracks()[0].onended = () => {
                console.log('[POTGManager] Screen capture stopped by user.');
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.cleanUpStream();
                }
            };

            const options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`[POTGManager] video/webm not supported, using default recorder mimeType.`);
                    }
                }
            }
            this.mimeType = options.mimeType || 'video/webm';
            console.log(`[POTGManager] Using mimeType: ${this.mimeType}`);

            this.recorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = []; // Reset chunks

            // --- Updated ondataavailable (No Buffer Limit) ---
            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data); // Just collect chunks
                }
            };
            // --- End of Updated ondataavailable ---

            this.recorder.onstop = async () => {
                console.log('[POTGManager] MediaRecorder stopped.');
                if (this.recordedChunks.length > 0) {
                    // --- Create Blob from ALL recorded chunks ---
                    const finalBlob = new Blob(this.recordedChunks, { type: this.mimeType });
                    console.log(`[POTGManager] Final blob created (Full Duration: ${this.recordedChunks.length * this.TIMESLICE_INTERVAL_MS / 1000}s). Size: ${finalBlob.size}`);
                    try {
                        await this._saveBlobToDB(finalBlob);
                        this.emit('recording_stopped_saved');
                    } catch (error) {
                        console.error('[POTGManager] Failed to save final blob:', error);
                        this.emit('recording_error', new Error('Failed to save recording to DB'));
                    }
                } else {
                    console.warn('[POTGManager] No recorded chunks available to save.');
                    this.emit('recording_error', new Error('No video data recorded'));
                }
                // Cleanup
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.onerror = (event) => {
                console.error('[POTGManager] MediaRecorder error:', event);
                this.emit('recording_error', event);
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.start(this.TIMESLICE_INTERVAL_MS);
            this.isRecording = true;
            console.log(`[POTGManager] Screen recording started (Full Duration).`); // Updated log
            this.emit('recording_started');
            return true;

        } catch (error) {
            console.error('[POTGManager] Error starting screen recording:', error);
            if (error instanceof Error && error.name === 'NotAllowedError') {
                this.emit('permission_denied');
            } else {
                this.emit('recording_error', error);
            }
            this.cleanUpStream();
            this.recorder = null;
            this.isRecording = false;
            return false;
        }
    }

    async startCanvasRecording(frameRate: number = 30): Promise<boolean> {
        const gameContainer = document.getElementById('phaser-game-container'); // Assuming this ID is on the container Phaser targets
        if (!gameContainer) {
            console.error('[POTGManager] Game container not found.');
            this.emit('recording_error', new Error('Game container not found'));
            return false;
        }
        
        const canvasElement = gameContainer.querySelector('canvas');
        if (this.isRecording) {
            console.warn('[POTGManager] Recording already in progress.');
            return false;
        }
        if (!canvasElement) {
            console.error('[POTGManager] Canvas element not provided.');
            this.emit('recording_error', new Error('Canvas element is required'));
            return false;
        }
        if (!canvasElement.captureStream) {
            console.error('[POTGManager] canvas.captureStream() is not supported in this browser.');
            this.emit('recording_error', new Error('Canvas recording not supported'));
            return false;
        }

        console.log(`[POTGManager] Attempting to start recording canvas with frameRate: ${frameRate}`);

        try {
            this.stream = canvasElement.captureStream(frameRate);

            if (!this.stream || !this.stream.active || this.stream.getVideoTracks().length === 0) {
                throw new Error('Failed to capture stream from canvas or stream is inactive.');
            }
            console.log('[POTGManager] Canvas stream captured successfully.');

            const options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`[POTGManager] video/webm not supported, using default recorder mimeType.`);
                    }
                }
            }
            this.mimeType = options.mimeType || 'video/webm';
            console.log(`[POTGManager] Using mimeType: ${this.mimeType}`);

            this.recorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = []; // Reset chunks

            // --- Updated ondataavailable (No Buffer Limit) ---
            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data); // Just collect chunks
                }
            };
            // --- End of Updated ondataavailable ---

            this.recorder.onstop = async () => {
                console.log('[POTGManager] MediaRecorder stopped.');
                if (this.recordedChunks.length > 0) {
                    const finalBlob = new Blob(this.recordedChunks, { type: this.mimeType });
                    console.log(`[POTGManager] Final blob created (Full Duration: ${this.recordedChunks.length * this.TIMESLICE_INTERVAL_MS / 1000}s). Size: ${finalBlob.size}`);
                    try {
                        await this._saveBlobToDB(finalBlob);
                        this.emit('recording_stopped_saved');
                    } catch (error) {
                        console.error('[POTGManager] Failed to save final blob:', error);
                        this.emit('recording_error', new Error('Failed to save recording to DB'));
                    }
                } else {
                    console.warn('[POTGManager] No recorded chunks available to save.');
                    this.emit('recording_error', new Error('No video data recorded'));
                }
                // Cleanup
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.onerror = (event) => {
                console.error('[POTGManager] MediaRecorder error:', event);
                this.emit('recording_error', event);
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.start(this.TIMESLICE_INTERVAL_MS);
            this.isRecording = true;
            console.log(`[POTGManager] Canvas recording started (Full Duration).`); // Updated log
            this.emit('recording_started');
            return true;

        } catch (error) {
            console.error('[POTGManager] Error starting canvas recording:', error);
            this.emit('recording_error', error);
            this.cleanUpStream();
            this.recorder = null;
            this.isRecording = false;
            return false;
        }
    }

    async stopRecording(): Promise<void> {
        if (!this.isRecording || !this.recorder) {
            console.warn('[POTGManager] No recording in progress to stop.');
            if (this.isRecording) {
                this.cleanUpStream();
                this.isRecording = false;
                this.recordedChunks = [];
            }
            return;
        }

        if (this.recorder.state === 'recording' || this.recorder.state === 'paused') {
            console.log('[POTGManager] Stopping MediaRecorder...');
            this.recorder.stop();
        } else {
            console.warn(`[POTGManager] Recorder not in 'recording' or 'paused' state (state: ${this.recorder.state}). Forcing cleanup.`);
            this.cleanUpStream();
            this.recorder = null;
            this.isRecording = false;
            this.recordedChunks = [];
        }
    }

    private cleanUpStream(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            console.log('[POTGManager] Media stream cleaned up.');
        }
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    async uploadRecording(presignedUrl: string): Promise<boolean> {
        const blob = await this.getStoredRecordingBlob();

        if (!blob) {
            console.error('[POTGManager] No recording found in storage to upload.');
            this.emit('upload_error', new Error('No recording available'));
            return false;
        }

        console.log(`[POTGManager] Starting upload of ${blob.size} bytes to presigned URL...`);
        this.emit('upload_started');

        try {
            const response = await fetch(presignedUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': blob.type || this.mimeType,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            console.log('[POTGManager] Upload successful.');
            this.emit('upload_success');
            return true;

        } catch (error) {
            console.error('[POTGManager] Upload error:', error);
            this.emit('upload_error', error);
            return false;
        }
    }

    // 오프스크린 canvas를 받아서 녹화 시작
    async startOffscreenCanvasRecording(canvas: HTMLCanvasElement, frameRate: number = 30): Promise<boolean> {
        if (this.isRecording) {
            console.warn('[POTGManager] Recording already in progress.');
            return false;
        }
        if (!canvas) {
            console.error('[POTGManager] Offscreen canvas is required.');
            this.emit('recording_error', new Error('Offscreen canvas is required'));
            return false;
        }
        if (!canvas.captureStream) {
            console.error('[POTGManager] canvas.captureStream() is not supported in this browser.');
            this.emit('recording_error', new Error('Canvas recording not supported'));
            return false;
        }

        try {
            this.stream = canvas.captureStream(frameRate);

            if (!this.stream || !this.stream.active || this.stream.getVideoTracks().length === 0) {
                throw new Error('Failed to capture stream from offscreen canvas or stream is inactive.');
            }
            console.log('[POTGManager] Offscreen canvas stream captured successfully.');

            const options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`[POTGManager] video/webm not supported, using default recorder mimeType.`);
                    }
                }
            }
            this.mimeType = options.mimeType || 'video/webm';
            console.log(`[POTGManager] Using mimeType: ${this.mimeType}`);

            this.recorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = [];

            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.recorder.onstop = async () => {
                console.log('[POTGManager] MediaRecorder stopped (offscreen).');
                if (this.recordedChunks.length > 0) {
                    const finalBlob = new Blob(this.recordedChunks, { type: this.mimeType });
                    try {
                        await this._saveBlobToDB(finalBlob);
                        this.emit('recording_stopped_saved');
                    } catch (error) {
                        console.error('[POTGManager] Failed to save final blob:', error);
                        this.emit('recording_error', new Error('Failed to save recording to DB'));
                    }
                } else {
                    this.emit('recording_error', new Error('No video data recorded'));
                }
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.onerror = (event) => {
                this.emit('recording_error', event);
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            this.recorder.start(this.TIMESLICE_INTERVAL_MS);
            this.isRecording = true;
            console.log(`[POTGManager] Offscreen canvas recording started.`);
            this.emit('recording_started');
            return true;

        } catch (error) {
            this.emit('recording_error', error);
            this.cleanUpStream();
            this.recorder = null;
            this.isRecording = false;
            return false;
        }
    }

  async startMergedRecording(
    phaserCanvas: HTMLCanvasElement,
    chartContainerId: string,
    frameRate: number = 30
    ): Promise<boolean> {
    if (this.isRecording) {
        console.warn('[POTGManager] Recording already in progress.');
        return false;
    }

    // 1) offscreen 캔버스
    const merged = document.createElement('canvas');
    merged.width  = phaserCanvas.width;
    merged.height = phaserCanvas.height;
    const mCtx = merged.getContext('2d')!;

    // 2) 전체 캔버스 크기 & 위치 정보
    const gRect = phaserCanvas.getBoundingClientRect();
    const chartContainer = document.getElementById(chartContainerId)!;

    // 3) 매 프레임 합성 루프
    const draw = () => {
        mCtx.clearRect(0, 0, merged.width, merged.height);

        // lightweight-charts가 생성한 모든 <canvas> 레이어
        const chartCanvases = chartContainer.querySelectorAll('canvas');
        chartCanvases.forEach((cvs) => {
        const cRect = cvs.getBoundingClientRect();

        // CSS px → 내부 캔버스 px 매핑 비율
        const scaleX = merged.width  / gRect.width;
        const scaleY = merged.height / gRect.height;

        // 그릴 위치와 크기 (canvas 내부 픽셀 기준)
        const dx = (cRect.left - gRect.left) * scaleX;
        const dy = (cRect.top  - gRect.top ) * scaleY;
        const dw = cRect.width  * scaleX;
        const dh = cRect.height * scaleY;

        // intrinsic 크기(src) → dest
        mCtx.drawImage(cvs as HTMLCanvasElement,
            0, 0, cvs.width, cvs.height,
            dx, dy, dw, dh
        );
        });

        // Phaser 캔버스(UI 포함)를 맨 위에
        mCtx.drawImage(phaserCanvas, 0, 0, merged.width, merged.height);

        requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    // 4) 합성된 offscreen 캔버스 녹화
    return this.startOffscreenCanvasRecording(merged, frameRate);
    }
}

// Export a single instance (Singleton pattern)
const potgManager = new POTGManager();
export default potgManager;