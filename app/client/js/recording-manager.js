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
        this.isRecording = false;
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
            this.elapsedSeconds = 0;
            this.isRecording = true;

            // Raccogli i dati audio
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            // Quando la registrazione termina
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.recordingUrl = URL.createObjectURL(audioBlob);
                this.isRecording = false;
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

            this.elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);
            
            // Aggiorna il display del timer se esiste
            const timerElement = document.getElementById('recordingTimer');
            if (timerElement) {
                const mins = Math.floor(this.elapsedSeconds / 60);
                const secs = this.elapsedSeconds % 60;
                timerElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                console.log(`⏱️ Timer: ${mins}:${String(secs).padStart(2, '0')}`);
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
            
            // Salva la durata finale
            this.elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);
            
            console.log(`🛑 Registrazione interrotta - Durata: ${this.elapsedSeconds}s`);
            return true;
        }
        return false;
    }

    /**
     * Ottiene la durata della registrazione in secondi
     */
    getRecordingDuration() {
        if (!this.startTime) return 0;
        return this.elapsedSeconds > 0 ? this.elapsedSeconds : Math.round((Date.now() - this.startTime) / 1000);
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
        this.isRecording = false;
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