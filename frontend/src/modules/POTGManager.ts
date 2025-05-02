import { EventEmitter } from 'eventemitter3';

// --- IndexedDB Configuration ---
const DB_NAME = 'POTGDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';
const RECORDING_KEY = 'latestRecording'; // Fixed key to always overwrite

class POTGManager extends EventEmitter {
    // Use native MediaRecorder
    private recorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private isRecording: boolean = false;
    private dbPromise: Promise<IDBDatabase> | null = null;

    // --- Chunk Buffering Properties ---
    private recordedChunks: Blob[] = [];
    private readonly TARGET_CLIP_DURATION_SEC = 15; // Target duration to keep
    // Timeslice interval in milliseconds (e.g., 1 second)
    private readonly TIMESLICE_INTERVAL_MS = 1000;
    // Calculate max chunks needed (add a small buffer, e.g., 2 extra seconds)
    private readonly MAX_BUFFERED_CHUNKS = Math.ceil((this.TARGET_CLIP_DURATION_SEC + 2) * 1000 / this.TIMESLICE_INTERVAL_MS);
    private mimeType: string = 'video/webm'; // Store the mimeType used

    constructor() {
        super();
        this.dbPromise = this._openDB();
        this.dbPromise.catch(err => console.error("[POTGManager] Failed to open IndexedDB:", err));
    }

    // --- IndexedDB Helper Methods ---
    // ... (_openDB, _getDB, _saveBlobToDB, getStoredRecordingBlob - remain the same) ...
    private _openDB(): Promise<IDBDatabase> {
        // Return existing promise if available
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
            this.dbPromise = this._openDB(); // Attempt to re-establish
            return await this.dbPromise; // Wait for the new attempt
        }
    }

    private async _saveBlobToDB(blob: Blob): Promise<void> {
        try {
            const db = await this._getDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(blob, RECORDING_KEY); // Use fixed key to overwrite

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('[POTGManager] Recording saved to IndexedDB.');
                    resolve();
                };
                request.onerror = () => {
                    console.error('[POTGManager] Error saving blob to IndexedDB:', request.error);
                    reject(request.error);
                };
                transaction.oncomplete = () => {
                     // Transaction complete doesn't mean put succeeded, rely on request.onsuccess
                };
                transaction.onerror = () => {
                    console.error('[POTGManager] Transaction error saving blob:', transaction.error);
                    reject(transaction.error);
                };
            });
        } catch (error) {
            console.error('[POTGManager] Failed to get DB for saving:', error);
            throw error; // Re-throw error
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
            return null; // Return null on DB connection failure
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
            if (!this.stream || !this.stream.active) { /* ... error handling ... */ return false; }

            this.stream.getVideoTracks()[0].onended = () => {
                console.log('[POTGManager] Screen capture stopped by user.');
                if (this.isRecording) { this.stopScreenRecording(); }
                else { this.cleanUpStream(); }
            };

            // Determine supported mimeType
            const options = { mimeType: 'video/webm;codecs=vp9' }; // Prefer VP9
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(`[POTGManager] ${options.mimeType} not supported, trying vp8.`);
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(`[POTGManager] ${options.mimeType} not supported, trying default webm.`);
                    options.mimeType = 'video/webm';
                     if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`[POTGManager] video/webm not supported, using default recorder mimeType.`);
                        // @ts-ignore - allow options to be empty if necessary
                        options = {};
                    }
                }
            }
            this.mimeType = options.mimeType || 'video/webm'; // Store the actual mimeType being used
            console.log(`[POTGManager] Using mimeType: ${this.mimeType}`);

            // --- Initialize MediaRecorder ---
            this.recorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = []; // Clear previous chunks

            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    // console.debug(`[POTGManager] Chunk received: ${event.data.size} bytes. Buffer size: ${this.recordedChunks.length}`);

                    // --- Buffer Management ---
                    // Remove oldest chunks if buffer exceeds max size
                    while (this.recordedChunks.length > this.MAX_BUFFERED_CHUNKS) {
                        const removedChunk = this.recordedChunks.shift(); // Remove from the beginning
                        // console.debug(`[POTGManager] Removed old chunk: ${removedChunk?.size} bytes`);
                    }
                }
            };

            this.recorder.onstop = async () => {
                console.log('[POTGManager] MediaRecorder stopped.');
                if (this.recordedChunks.length > 0) {
                    const finalBlob = new Blob(this.recordedChunks, { type: this.mimeType });
                    console.log(`[POTGManager] Final blob created from ${this.recordedChunks.length} chunks. Size: ${finalBlob.size}`);
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
                // Clean up after processing is done
                this.recordedChunks = []; // Clear buffer
                this.cleanUpStream();
                this.recorder = null; // Ensure recorder is nullified
                this.isRecording = false; // Update state *after* processing
            };

             this.recorder.onerror = (event) => {
                console.error('[POTGManager] MediaRecorder error:', event);
                this.emit('recording_error', event);
                // Attempt cleanup even on error
                this.recordedChunks = [];
                this.cleanUpStream();
                this.recorder = null;
                this.isRecording = false;
            };

            // Start recording with timeslice
            this.recorder.start(this.TIMESLICE_INTERVAL_MS);
            this.isRecording = true;
            console.log(`[POTGManager] Screen recording started with ${this.TIMESLICE_INTERVAL_MS}ms timeslice.`);
            this.emit('recording_started');
            return true;

        } catch (error) {
            console.error('[POTGManager] Error starting screen recording:', error);
            if (error instanceof Error && error.name === 'NotAllowedError') { this.emit('permission_denied'); }
            else { this.emit('recording_error', error); }
            this.cleanUpStream();
            this.recorder = null;
            this.isRecording = false;
            return false;
        }
    }

    async stopScreenRecording(): Promise<void> {
        if (!this.isRecording || !this.recorder) {
            console.warn('[POTGManager] No recording in progress to stop.');
            // Ensure cleanup if recorder somehow became null while isRecording was true
            if (this.isRecording) {
                 this.cleanUpStream();
                 this.isRecording = false;
                 this.recordedChunks = [];
            }
            return;
        }

        // Check recorder state before stopping
        if (this.recorder.state === 'recording' || this.recorder.state === 'paused') {
             console.log('[POTGManager] Stopping MediaRecorder...');
             // The actual blob creation and saving happens in the 'onstop' handler
             this.recorder.stop();
        } else {
             console.warn(`[POTGManager] Recorder not in 'recording' or 'paused' state (state: ${this.recorder.state}). Forcing cleanup.`);
             // Force cleanup if state is unexpected (e.g., 'inactive')
             this.cleanUpStream();
             this.recorder = null;
             this.isRecording = false;
             this.recordedChunks = [];
        }
        // Note: isRecording state is fully set to false within the onstop/onerror handlers
    }

    // Remove the _trimBlob method as it's no longer used
    // private _trimBlob(...) { ... }

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

    // --- Upload Method ---
    // ... (uploadRecording remains the same, uses getStoredRecordingBlob) ...
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
                    'Content-Type': blob.type || this.mimeType, // Use stored mimeType as fallback
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
}

// Export a single instance (Singleton pattern)
const potgManager = new POTGManager();
export default potgManager;