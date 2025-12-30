/**
 * ============================================================================
 * Medical AI Client - API Layer
 * Gestisce tutte le chiamate al backend con fallback localStorage
 * ============================================================================
 */

const CLIENT_API_CONFIG = {
    baseURL: 'http://localhost:3001/api',
    endpoints: {
        auth: '/auth',
        patients: '/patients',
        recordings: '/recordings',
        studios: '/studios'
    }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Ottiene dati sessione
 */
function getSessionData() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    return {
        userId: session.userId,
        studioId: session.studioId,
        email: session.email,
        userType: session.userType
    };
}

// ============================================================================
// PATIENTS API
// ============================================================================

/**
 * GET - Carica lista pazienti dal backend
 */
async function getPatients() {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.patients}?studio_id=${session.studioId}`;
        console.log(`📡 GET ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        const patients = Array.isArray(result.data) ? result.data : [];
        
        // Salva in localStorage come fallback
        localStorage.setItem('cachedPatients', JSON.stringify(patients));
        console.log(`✅ Pazienti caricati: ${patients.length}`);
        
        return patients;
    } catch (error) {
        console.warn('⚠️ Backend unavailable, usando cache:', error.message);
        const cached = localStorage.getItem('cachedPatients');
        return cached ? JSON.parse(cached) : [];
    }
}

/**
 * POST - Salva nuovo paziente
 */
async function savePatient(patientData) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const payload = {
            studio_id: session.studioId,
            first_name: patientData.firstName || patientData.first_name,
            last_name: patientData.lastName || patientData.last_name,
            email: patientData.email,
            phone: patientData.phone || patientData.telephone
        };
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.patients}`;
        console.log(`📡 POST ${url}`, payload);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log(`✅ Paziente salvato:`, result.data);
        
        return result.data;
    } catch (error) {
        console.error('❌ Error saving patient:', error);
        throw error;
    }
}

/**
 * PUT - Aggiorna paziente
 */
async function updatePatient(patientId, patientData) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const payload = {
            studio_id: session.studioId,
            first_name: patientData.firstName || patientData.first_name,
            last_name: patientData.lastName || patientData.last_name,
            email: patientData.email,
            phone: patientData.phone || patientData.telephone
        };
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.patients}/${patientId}`;
        console.log(`📡 PUT ${url}`, payload);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log(`✅ Paziente aggiornato:`, result.data);
        
        return result.data;
    } catch (error) {
        console.error('❌ Error updating patient:', error);
        throw error;
    }
}

/**
 * DELETE - Elimina paziente
 */
async function deletePatient(patientId) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.patients}/${patientId}`;
        console.log(`📡 DELETE ${url}`);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studio_id: session.studioId })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        console.log(`✅ Paziente eliminato`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting patient:', error);
        throw error;
    }
}

// ============================================================================
// RECORDINGS API
// ============================================================================

/**
 * GET - Carica lista registrazioni dal backend
 */
async function getRecordings() {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}?studio_id=${session.studioId}`;
        console.log(`📡 GET ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        const recordings = Array.isArray(result.data) ? result.data : [];
        
        // Salva in localStorage come fallback
        localStorage.setItem('cachedRecordings', JSON.stringify(recordings));
        console.log(`✅ Registrazioni caricate: ${recordings.length}`);
        
        return recordings;
    } catch (error) {
        console.warn('⚠️ Backend unavailable, usando cache:', error.message);
        const cached = localStorage.getItem('cachedRecordings');
        return cached ? JSON.parse(cached) : [];
    }
}

/**
 * GET - Carica singola registrazione con dati completi
 */
async function getRecording(recordingId) {
    try {
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}/${recordingId}`;
        console.log(`📡 GET ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log(`✅ Registrazione caricata:`, result.data);
        
        return result.data;
    } catch (error) {
        console.error('❌ Error loading recording:', error);
        throw error;
    }
}

/**
 * POST - Salva nuova registrazione ✅ AGGIORNATA CON visit_type E doctorName
 */
async function saveRecording(recordingData) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        // Se audioBlob è presente, converti in Base64
        let audioData = null;
        if (recordingData.audioBlob) {
            audioData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(recordingData.audioBlob);
            });
        }
        
        const payload = {
            studio_id: session.studioId,
            patient_id: recordingData.patientId || recordingData.patient_id,
            duration: recordingData.duration || 0,
            visit_type: recordingData.visitType || recordingData.visit_type,
            doctor_name: recordingData.doctorName || recordingData.doctor_name,  // ✅ NUOVO
            notes: recordingData.notes || '',
            audio_data: audioData,
            audio_url: recordingData.audioUrl || recordingData.audio_url
        };
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}`;
        console.log(`📡 POST ${url}`, { ...payload, audio_data: '[AUDIO DATA]' });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log(`✅ Registrazione salvata:`, result.data);
        
        return result.data;
    } catch (error) {
        console.error('❌ Error saving recording:', error);
        throw error;
    }
}

/**
 * PUT - Aggiorna registrazione ✅ AGGIORNATA CON doctorName
 */
async function updateRecording(recordingId, recordingData) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const payload = {
            studio_id: session.studioId,
            doctor_name: recordingData.doctorName || recordingData.doctor_name,  // ✅ NUOVO
            duration: recordingData.duration || 0,
            notes: recordingData.notes || '',
            transcript: recordingData.transcript || null,
            referto_data: recordingData.refertoData || recordingData.referto_data || null,
            odontogramma_data: recordingData.odontogrammaData || recordingData.odontogramma_data || null,
            audio_url: recordingData.audioUrl || recordingData.audio_url
        };
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}/${recordingId}`;
        console.log(`📡 PUT ${url}`, payload);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log(`✅ Registrazione aggiornata:`, result.data);
        
        return result.data;
    } catch (error) {
        console.error('❌ Error updating recording:', error);
        throw error;
    }
}

/**
 * DELETE - Elimina registrazione
 */
async function deleteRecording(recordingId) {
    try {
        const session = getSessionData();
        if (!session.studioId) throw new Error('Studio ID not found');
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}/${recordingId}`;
        console.log(`📡 DELETE ${url}`);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studio_id: session.studioId })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        console.log(`✅ Registrazione eliminata`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting recording:', error);
        throw error;
    }
}

// ============================================================================
// AI PROCESSING API
// ============================================================================

/**
 * POST - Avvia processing AI (Trascrizione + Referto + Odontogramma)
 */
async function processRecording(recordingId) {
    try {
        console.log(`\n🤖 Avvio AI processing per recording ${recordingId}...`);
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}/${recordingId}/process`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Processing completato:`, result);
        
        return result;
    } catch (error) {
        console.error('❌ Error processing recording:', error);
        throw error;
    }
}

/**
 * GET - Recupera referto e dati processati ✅ AGGIORNATA
 */
async function getReferto(recordingId) {
    try {
        console.log(`📋 Caricamento referto per recording ${recordingId}...`);
        
        const url = `${CLIENT_API_CONFIG.baseURL}${CLIENT_API_CONFIG.endpoints.recordings}/${recordingId}/referto`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        // Ritorna l'intera risposta che contiene:
        // - success: boolean
        // - processing_status: string (completed, processing, failed)
        // - referto: { referto, transcript, odontogramma }
        // - doctor_name: string ✅ NUOVO
        // - patient: { first_name, last_name, ... }
        
        console.log(`✅ Referto caricato:`, result);
        
        return result;
    } catch (error) {
        console.error('❌ Error loading referto:', error);
        throw error;
    }
}

/**
 * Check processing status
 */
async function checkProcessingStatus(recordingId) {
    try {
        const recording = await getRecording(recordingId);
        
        return {
            recordingId: recordingId,
            processingStatus: recording.processing_status || 'pending',
            isProcessed: (recording.processing_status || 'pending') === 'completed',
            hasTranscript: !!recording.transcript,
            hasReferto: !!recording.referto,
            hasOdontogramma: !!recording.odontogramma,
            doctorName: recording.doctor_name || null  // ✅ NUOVO
        };
    } catch (error) {
        console.error('❌ Error checking processing status:', error);
        throw error;
    }
}

// ============================================================================
// REFERTO MANAGEMENT
// ============================================================================

/**
 * Salva referto processato in localStorage per accesso rapido
 */
function saveRefertoLocally(recordingId, refertoData) {
    try {
        const referti = JSON.parse(localStorage.getItem('referti_processed') || '[]');
        
        const index = referti.findIndex(r => r.recordingId === recordingId);
        
        const refertoEntry = {
            recordingId: recordingId,
            visitType: refertoData.visitType,
            doctorName: refertoData.doctorName,  // ✅ NUOVO
            transcript: refertoData.transcript,
            referto: refertoData.referto,
            odontogramma: refertoData.odontogramma,
            savedAt: new Date().toISOString()
        };
        
        if (index >= 0) {
            referti[index] = refertoEntry;
        } else {
            referti.push(refertoEntry);
        }
        
        localStorage.setItem('referti_processed', JSON.stringify(referti));
        console.log(`✅ Referto salvato in localStorage`);
        
        return refertoEntry;
    } catch (error) {
        console.error('❌ Error saving referto locally:', error);
    }
}

/**
 * Carica referto da localStorage
 */
function getRefertoLocally(recordingId) {
    try {
        const referti = JSON.parse(localStorage.getItem('referti_processed') || '[]');
        return referti.find(r => r.recordingId === recordingId) || null;
    } catch (error) {
        console.error('❌ Error loading referto from localStorage:', error);
        return null;
    }
}

/**
 * Elimina referto da localStorage
 */
function deleteRefertoLocally(recordingId) {
    try {
        const referti = JSON.parse(localStorage.getItem('referti_processed') || '[]');
        const filtered = referti.filter(r => r.recordingId !== recordingId);
        localStorage.setItem('referti_processed', JSON.stringify(filtered));
        console.log(`✅ Referto rimosso da localStorage`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting referto from localStorage:', error);
        return false;
    }
}

/**
 * Esporta referto come JSON
 */
function exportRefertoAsJSON(refertoData) {
    try {
        const json = JSON.stringify(refertoData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `referto_${refertoData.recordingId}_${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`✅ Referto esportato`);
        return true;
    } catch (error) {
        console.error('❌ Error exporting referto:', error);
        return false;
    }
}

// ============================================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================================

// Patients API
window.getPatients = getPatients;
window.savePatient = savePatient;
window.updatePatient = updatePatient;
window.deletePatient = deletePatient;

// Recordings API
window.getRecordings = getRecordings;
window.getRecording = getRecording;
window.saveRecording = saveRecording;
window.updateRecording = updateRecording;
window.deleteRecording = deleteRecording;

// AI Processing API
window.processRecording = processRecording;
window.getReferto = getReferto;
window.checkProcessingStatus = checkProcessingStatus;

// Referto Management
window.saveRefertoLocally = saveRefertoLocally;
window.getRefertoLocally = getRefertoLocally;
window.deleteRefertoLocally = deleteRefertoLocally;
window.exportRefertoAsJSON = exportRefertoAsJSON;

// Session
window.getSessionData = getSessionData;