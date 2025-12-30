/**
 * ============================================================================
 * Admin Patients API - Backend Integration
 * Gestisce pazienti per l'admin (view-only, per ora)
 * ============================================================================
 */

const ADMIN_PATIENTS_CONFIG = {
    baseURL: 'http://localhost:3001/api',
    endpoints: {
        patients: '/patients',
        recordings: '/recordings'
    }
};

/**
 * Wrapper per chiamate API admin
 */
async function callAdminPatientsAPI(endpoint, method = 'GET', data = null) {
    try {
        const url = ADMIN_PATIENTS_CONFIG.baseURL + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        console.log(`📡 ${method} ${url}`, data || '');
        
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        console.log(`✅ Response:`, result);
        return result;
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error);
        showNotification(`Errore: ${error.message}`, 'error');
        throw error;
    }
}

// ==================== PATIENTS (ADMIN VIEW) ====================

/**
 * GET - Admin visualizza pazienti di uno studio
 */
async function fetchStudioPatientsAdmin(studioId) {
    try {
        const result = await callAdminPatientsAPI(
            `${ADMIN_PATIENTS_CONFIG.endpoints.patients}?studio_id=${studioId}`,
            'GET'
        );
        return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
        console.warn('⚠️ Backend unavailable');
        return [];
    }
}

/**
 * GET - Admin visualizza registrazioni di uno studio
 */
async function fetchStudioRecordingsAdmin(studioId) {
    try {
        const result = await callAdminPatientsAPI(
            `${ADMIN_PATIENTS_CONFIG.endpoints.recordings}?studio_id=${studioId}`,
            'GET'
        );
        return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
        console.warn('⚠️ Backend unavailable');
        return [];
    }
}

/**
 * DELETE - Admin elimina paziente
 */
async function deletePatientAsAdmin(patientId, studioId) {
    try {
        await callAdminPatientsAPI(
            `${ADMIN_PATIENTS_CONFIG.endpoints.patients}/${patientId}`,
            'DELETE',
            { studio_id: studioId }
        );
        showNotification('✅ Paziente eliminato', 'success');
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * DELETE - Admin elimina registrazione
 */
async function deleteRecordingAsAdmin(recordingId, studioId) {
    try {
        await callAdminPatientsAPI(
            `${ADMIN_PATIENTS_CONFIG.endpoints.recordings}/${recordingId}`,
            'DELETE',
            { studio_id: studioId }
        );
        showNotification('✅ Registrazione eliminata', 'success');
        return true;
    } catch (error) {
        throw error;
    }
}