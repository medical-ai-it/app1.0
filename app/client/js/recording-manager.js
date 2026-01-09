/**
 * ============================================================================
 * Recording Manager - Web Audio API Integration
 * ============================================================================
 * Gestisce la registrazione audio dal microfono del browser
 */

class RecordingManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.isRecording = false;
        this.isPaused = false;
        this.recordingUrl = null;
        this.durationInterval = null;
        this.elapsedSeconds = 0;
        
        console.log('✅ RecordingManager inizializzato');
    }

    /**
     * Avvia la registrazione
     */
    async startRecording() {
        try {
            console.log('🎤 Richiesta accesso al microfono...');

            // Richiedi accesso al microfono
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Crea un MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.startTime = Date.now();
            this.totalPausedTime = 0;
            this.elapsedSeconds = 0;
            this.isRecording = true;
            this.isPaused = false;

            // Raccogli i dati audio
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            // Quando la registrazione termina
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.recordingUrl = URL.createObjectURL(audioBlob);
                this.isRecording = false;
                this.isPaused = false;
                console.log('✅ Registrazione terminata');
                
                // Ferma il timer
                this.stopDurationTimer();
            };

            this.mediaRecorder.start();
            
            // Avvia il timer che aggiorna ogni secondo
            this.startDurationTimer();
            
            console.log('✅ Registrazione avviata');
            
            return true;

        } catch (error) {
            console.error('❌ Errore nell\'accesso al microfono:', error);
            showNotification('Errore: accesso al microfono negato', 'error');
            return false;
        }
    }

    /**
     * Mette in pausa la registrazione
     */
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.pauseTime = Date.now();
            this.isPaused = true;
            
            console.log(`⏸️ Registrazione messa in pausa - Tempo trascorso: ${this.elapsedSeconds}s`);
            
            return true;
        }
        return false;
    }

    /**
     * Riprende la registrazione
     */
    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            
            // Calcola il tempo di pausa e aggiungilo al totale
            const resumeTime = Date.now();
            const pauseDuration = resumeTime - this.pauseTime;
            this.totalPausedTime += pauseDuration;
            
            this.pauseTime = null;
            this.isPaused = false;
            
            console.log(`▶️ Registrazione ripresa - Tempo totale in pausa: ${Math.round(this.totalPausedTime / 1000)}s`);
            
            return true;
        }
        return false;
    }

    /**
     * Avvia il timer che aggiorna il timer del display
     */
    startDurationTimer() {
        // Ferma qualsiasi timer precedente
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }

        this.durationInterval = setInterval(() => {
            if (!this.isRecording) {
                clearInterval(this.durationInterval);
                return;
            }

            // Calcola il tempo trascorso escludendo i tempi di pausa
            let elapsedTime = Date.now() - this.startTime - this.totalPausedTime;
            
            // Se attualmente in pausa, sottrai il tempo dalla pausa fino ad ora
            if (this.isPaused && this.pauseTime) {
                elapsedTime -= (Date.now() - this.pauseTime);
            }
            
            this.elapsedSeconds = Math.round(elapsedTime / 1000);
            
            // Aggiorna il display del timer se esiste
            const timerElement = document.getElementById('recordingTimer');
            if (timerElement) {
                const mins = Math.floor(this.elapsedSeconds / 60);
                const secs = this.elapsedSeconds % 60;
                timerElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                console.log(`⏱️ Timer: ${mins}:${String(secs).padStart(2, '0')}${this.isPaused ? ' (in pausa)' : ''}`);
            }
        }, 100); // Aggiorna ogni 100ms per fluidità
    }

    /**
     * Ferma il timer
     */
    stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    /**
     * Arresta la registrazione
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            
            // Chiudi il flusso audio
            this.audioStream.getTracks().forEach(track => track.stop());
            
            // Se era in pausa, aggiungi il tempo dalla pausa al totale
            if (this.isPaused && this.pauseTime) {
                const pauseDuration = Date.now() - this.pauseTime;
                this.totalPausedTime += pauseDuration;
            }
            
            // Salva la durata finale
            let elapsedTime = Date.now() - this.startTime - this.totalPausedTime;
            this.elapsedSeconds = Math.round(elapsedTime / 1000);
            
            console.log(`🛑 Registrazione interrotta - Durata: ${this.elapsedSeconds}s (pausa totale: ${Math.round(this.totalPausedTime / 1000)}s)`);
            return true;
        }
        return false;
    }

    /**
     * Ottiene la durata della registrazione in secondi (escludendo le pause)
     */
    getRecordingDuration() {
        if (!this.startTime) return 0;
        
        let elapsedTime = Date.now() - this.startTime - this.totalPausedTime;
        
        // Se attualmente in pausa, sottrai il tempo dalla pausa fino ad ora
        if (this.isPaused && this.pauseTime) {
            elapsedTime -= (Date.now() - this.pauseTime);
        }
        
        return this.elapsedSeconds > 0 ? this.elapsedSeconds : Math.round(elapsedTime / 1000);
    }

    /**
     * Ottiene lo stato di pausa
     */
    getIsPaused() {
        return this.isPaused;
    }

    /**
     * Ottiene il Blob dell'audio registrato
     */
    getRecordingBlob() {
        if (!this.audioChunks || this.audioChunks.length === 0) {
            return null;
        }
        return new Blob(this.audioChunks, { type: 'audio/webm' });
    }

    /**
     * Resetta la registrazione
     */
    reset() {
        this.audioChunks = [];
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.isRecording = false;
        this.isPaused = false;
        this.recordingUrl = null;
        this.elapsedSeconds = 0;
        
        // Ferma il timer
        this.stopDurationTimer();
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
        
        console.log('🔄 RecordingManager resettato');
    }

    /**
     * Riproduce la registrazione
     */
    playRecording() {
        if (this.recordingUrl) {
            const audio = new Audio(this.recordingUrl);
            audio.play();
            console.log('▶️ Riproduzione avviata');
        }
    }
}