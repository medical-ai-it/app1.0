/**
 * ============================================================================
 * Medical AI Client - Components & UI Management
 * ============================================================================
 * Gestisce dashboard, pazienti, registrazioni, e profilo
 */

let recordingManager;

/**
 * Inizializza l'applicazione al caricamento della pagina
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Inizializzazione Medical AI Client Panel');
        
        // Verifica sessione
        const session = JSON.parse(localStorage.getItem('userSession') || '{}');
        if (!session.userId || !session.studioId) {
            console.error('❌ Sessione non valida');
            window.location.replace('../login/index.html');
            return;
        }
        
        console.log(`✅ Sessione valida: ${session.email}`);
        
        // Inizializza RecordingManager
        recordingManager = new RecordingManager();
        
        // Carica componenti UI
        await initializeDashboard();
        
        console.log('✅ Applicazione inizializzata');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        showNotification('Errore nel caricamento dell\'applicazione', 'error');
    }
});

/**
 * Inizializza la dashboard e carica tutti i componenti
 */
async function initializeDashboard() {
    try {
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.style.display = 'flex';
        }
        
        console.log('📦 Caricamento componenti...');
        
        // Carica componenti UI
        await loadHeader();
        await loadSidebar();
        await loadFooter();
        
        // Setup event listeners
        setupRecordingListeners();
        setupProfileListeners();
        setupHistoryListeners();
        setupPatientsListeners();
        
        // Mostra pagina pazienti di default
        showPage('patients');
        
        // Carica dati iniziali
        await loadPatientsList();
        
        console.log('✅ Dashboard inizializzata');
    } catch (error) {
        console.error('❌ Errore inizializzazione dashboard:', error);
        throw error;
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Genera ID univoco
 */
function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida email
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Valida telefono
 */
function validatePhone(phone) {
    const re = /^[0-9+\-\s()]{10,}$/;
    return re.test(phone);
}

/**
 * Mostra notifica
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    
    notificationContainer.appendChild(notification);
    
    // Auto-close dopo 3 secondi
    const timeout = setTimeout(() => {
        notification.remove();
    }, 3000);
    
    // Click per chiudere
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.remove();
    });
}

/**
 * Formatta durata in MM:SS
 */
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formatta data
 */
function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Crea stato vuoto
 */
function createEmptyState(title, description, icon = '📭') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${description}</p>
    `;
    return div;
}

// ==================== PATIENTS SECTION ====================

/**
 * Setup listeners per pazienti
 */
function setupPatientsListeners() {
    const addPatientBtn = document.getElementById('addPatientBtn');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', openAddPatientModal);
    }
}

/**
 * Apri modal Aggiungi Paziente
 */
function openAddPatientModal() {
    const modal = document.getElementById('addPatientModal');
    if (modal) {
        const form = document.getElementById('addPatientForm');
        if (form) form.reset();
        modal.classList.add('active');
        console.log('📝 Modal Aggiungi Paziente aperto');
    }
}

/**
 * Chiudi modal Aggiungi Paziente
 */
function closeAddPatientModal() {
    const modal = document.getElementById('addPatientModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Gestisce l'aggiunta di un nuovo paziente
 */
async function handleAddPatient(event) {
    event.preventDefault();
    
    try {
        const firstName = document.getElementById('addPatientFirstName').value.trim();
        const lastName = document.getElementById('addPatientLastName').value.trim();
        const email = document.getElementById('addPatientEmailField').value.trim();
        const phone = document.getElementById('addPatientPhoneField').value.trim();
        const policyConsent = document.getElementById('addPatientPolicyConsent').checked;
        
        // Validazione
        if (!firstName || !lastName || !email || !phone) {
            showNotification('❌ Completa tutti i campi obbligatori', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showNotification('❌ Email non valida', 'error');
            return;
        }
        
        if (!validatePhone(phone)) {
            showNotification('❌ Telefono non valido', 'error');
            return;
        }
        
        if (!policyConsent) {
            showNotification('❌ Accetta la Privacy Policy e i Termini e Condizioni', 'error');
            return;
        }
        
        console.log('📝 Aggiunta paziente:', { firstName, lastName, email, phone });
        
        // Chiama API per salvare paziente
        const newPatient = await savePatient({
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone
        });
        
        console.log('✅ Paziente aggiunto:', newPatient);
        
        // Chiudi modal
        closeAddPatientModal();
        
        // Reset form
        document.getElementById('addPatientForm').reset();
        
        // Mostra notifica
        showNotification(`✅ Paziente ${firstName} ${lastName} aggiunto con successo`, 'success');
        
        // Ricarica lista pazienti
        await loadPatientsList();
        await loadPatientsIntoDropdown();
        
    } catch (error) {
        console.error('❌ Errore aggiunta paziente:', error);
        showNotification('❌ Errore: ' + error.message, 'error');
    }
}

/**
 * Carica lista pazienti dal backend
 */
async function loadPatientsList() {
    try {
        const patientsTable = document.getElementById('patientsTable');
        const patientsTableBody = document.getElementById('patientsTableBody');
        const target = patientsTableBody || (patientsTable ? patientsTable.querySelector('tbody') : null);
        
        if (!target) {
            console.warn('⚠️ Element patientsTableBody non trovato');
            return;
        }
        
        console.log('\n📥 Caricamento pazienti...');
        
        // Carica dal backend
        const patients = await getPatients();
        
        target.innerHTML = '';
        
        if (!patients || patients.length === 0) {
            console.warn('⚠️ Nessun paziente disponibile');
            target.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-user-md"></i> Nessun paziente aggiunto
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordina per data creazione
        const sorted = [...patients].sort((a, b) => {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA;
        });
        
        // Renderizza pazienti
        sorted.forEach(patient => {
            const row = document.createElement('tr');
            
            const firstName = patient.firstName || patient.first_name || '';
            const lastName = patient.lastName || patient.last_name || '';
            const email = patient.email || '';
            const phone = patient.phone || '';
            const createdDate = patient.created_at || patient.createdAt || new Date().toISOString();
            
            row.innerHTML = `
                <td>${firstName}</td>
                <td>${lastName}</td>
                <td>${email}</td>
                <td>${phone}</td>
                <td>${formatDate(new Date(createdDate))}</td>
                <td class="actions-cell">
                    <button class="btn-small" onclick="openEditPatientModal('${patient.id}')" title="Modifica">
                        ✏️ Modifica
                    </button>
                    <button class="btn-small btn-danger" onclick="handleDeletePatient('${patient.id}')" title="Elimina">
                        🗑 Elimina
                    </button>
                </td>
            `;
            target.appendChild(row);
        });
        
        console.log(`📊 Tabella aggiornata con ${sorted.length} pazienti`);
        
    } catch (error) {
        console.error('❌ Errore caricamento pazienti:', error);
        showNotification('Errore caricamento pazienti', 'error');
    }
}

/**
 * Apri modal Modifica Paziente
 */
async function openEditPatientModal(patientId) {
    const modal = document.getElementById('editPatientModal');
    const patients = await getPatients();
    
    const patient = patients.find(p => p.id === patientId);
    
    if (patient && modal) {
        const firstName = patient.firstName || patient.first_name || '';
        const lastName = patient.lastName || patient.last_name || '';
        const email = patient.email || '';
        const phone = patient.phone || '';
        
        document.getElementById('editPatientId').value = patient.id;
        document.getElementById('editPatientFirstName').value = firstName;
        document.getElementById('editPatientLastName').value = lastName;
        document.getElementById('editPatientEmailField').value = email;
        document.getElementById('editPatientPhoneField').value = phone;
        
        modal.classList.add('active');
        console.log('✏️ Modal Modifica Paziente aperto:', patientId);
    }
}

/**
 * Chiudi modal Modifica Paziente
 */
function closeEditPatientModal() {
    const modal = document.getElementById('editPatientModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Gestisce la modifica di un paziente
 */
async function handleEditPatient(event) {
    event.preventDefault();
    
    try {
        const patientId = document.getElementById('editPatientId').value;
        const firstName = document.getElementById('editPatientFirstName').value.trim();
        const lastName = document.getElementById('editPatientLastName').value.trim();
        const email = document.getElementById('editPatientEmailField').value.trim();
        const phone = document.getElementById('editPatientPhoneField').value.trim();
        
        // Validazione
        if (!firstName || !lastName || !email || !phone) {
            showNotification('❌ Completa tutti i campi obbligatori', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showNotification('❌ Email non valida', 'error');
            return;
        }
        
        if (!validatePhone(phone)) {
            showNotification('❌ Telefono non valido', 'error');
            return;
        }
        
        console.log('📝 Modifica paziente:', { patientId, firstName, lastName, email, phone });
        
        // Chiama API per aggiornare paziente
        const updatedPatient = await updatePatient(patientId, {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone
        });
        
        console.log('✅ Paziente aggiornato:', updatedPatient);
        
        // Chiudi modal
        closeEditPatientModal();
        
        // Reset form
        document.getElementById('editPatientForm').reset();
        
        // Mostra notifica
        showNotification(`✅ Paziente ${firstName} ${lastName} modificato con successo`, 'success');
        
        // Ricarica lista pazienti
        await loadPatientsList();
        await loadPatientsIntoDropdown();
        
    } catch (error) {
        console.error('❌ Errore modifica paziente:', error);
        showNotification('❌ Errore: ' + error.message, 'error');
    }
}

/**
 * Elimina paziente
 */
async function handleDeletePatient(patientId) {
    if (confirm('Sei sicuro di voler eliminare questo paziente?')) {
        try {
            console.log(`\n🗑️ Eliminazione paziente ${patientId}...`);
            
            await deletePatient(patientId);
            
            console.log('✅ Paziente eliminato');
            showNotification('✅ Paziente eliminato', 'success');
            
            await loadPatientsList();
            await loadPatientsIntoDropdown();
            
        } catch (error) {
            console.error('❌ Errore eliminazione:', error);
            showNotification('❌ Errore: ' + error.message, 'error');
        }
    }
}

/**
 * Carica pazienti nel dropdown registrazione
 */
async function loadPatientsIntoDropdown() {
    try {
        const dropdown = document.getElementById('patientSelect');
        if (!dropdown) return;
        
        console.log('\n📋 Aggiornamento dropdown pazienti...');
        
        const patients = await getPatients();
        const currentValue = dropdown.value;
        
        dropdown.innerHTML = '<option value="">-- Seleziona paziente --</option>';
        
        if (patients && patients.length > 0) {
            patients.forEach(patient => {
                const firstName = patient.firstName || patient.first_name || '';
                const lastName = patient.lastName || patient.last_name || '';
                const option = document.createElement('option');
                option.value = patient.id;
                option.textContent = `${firstName} ${lastName}`;
                dropdown.appendChild(option);
            });
            
            console.log(`📋 Dropdown aggiornato con ${patients.length} pazienti`);
        } else {
            console.warn('⚠️ Nessun paziente disponibile');
        }
        
        // Ripristina selezione precedente
        if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
            dropdown.value = currentValue;
        }
        
    } catch (error) {
        console.error('❌ Errore aggiornamento dropdown:', error);
    }
}

// ==================== RECORDING SECTION ====================

/**
 * Setup recording listeners ✅ CON doctorName E PAUSA/RIPRESA
 */
function setupRecordingListeners() {
    const startBtn = document.getElementById('startRecording');
    const pauseBtn = document.getElementById('pauseRecording');
    const resumeBtn = document.getElementById('resumeRecording');
    const stopBtn = document.getElementById('stopRecording');
    const retakeBtn = document.getElementById('retakeRecording');
    const submitBtn = document.getElementById('submitRecording');
    const patientSelect = document.getElementById('patientSelect');
    const visitTypeSelect = document.getElementById('visitType');
    const doctorNameInput = document.getElementById('doctorName');
    
    if (startBtn) startBtn.addEventListener('click', handleStartRecording);
    if (pauseBtn) pauseBtn.addEventListener('click', handlePauseRecording);
    if (resumeBtn) resumeBtn.addEventListener('click', handleResumeRecording);
    if (stopBtn) stopBtn.addEventListener('click', handleStopRecording);
    if (retakeBtn) retakeBtn.addEventListener('click', handleRetakeRecording);
    if (submitBtn) submitBtn.addEventListener('click', handleSubmitRecording);
    if (patientSelect) patientSelect.addEventListener('change', handlePatientSelection);
    if (visitTypeSelect) visitTypeSelect.addEventListener('change', handleVisitTypeSelection);
    if (doctorNameInput) doctorNameInput.addEventListener('change', handleDoctorNameChange);
    
    loadPatientsIntoDropdown();
}

/**
 * Gestisce selezione paziente
 */
function handlePatientSelection() {
    const patientSelect = document.getElementById('patientSelect');
    const visitTypeGroup = document.getElementById('visitTypeGroup');
    const doctorNameGroup = document.getElementById('doctorNameGroup');
    const consentForm = document.getElementById('consentForm');
    const recordingControls = document.querySelector('.recording-controls');
    
    if (patientSelect.value) {
        if (visitTypeGroup) visitTypeGroup.style.display = 'block';
        if (doctorNameGroup) doctorNameGroup.style.display = 'block';
        if (consentForm) consentForm.style.display = 'block';
        if (recordingControls) recordingControls.style.display = 'flex';
        console.log('✅ Paziente selezionato:', patientSelect.value);
    } else {
        if (visitTypeGroup) {
            visitTypeGroup.style.display = 'none';
            const visitType = document.getElementById('visitType');
            if (visitType) visitType.value = '';
        }
        if (doctorNameGroup) {
            doctorNameGroup.style.display = 'none';
            const doctorName = document.getElementById('doctorName');
            if (doctorName) doctorName.value = '';
        }
        if (consentForm) consentForm.style.display = 'none';
        if (recordingControls) recordingControls.style.display = 'none';
    }
}

/**
 * Gestisce selezione tipologia visita
 */
function handleVisitTypeSelection() {
    const visitTypeSelect = document.getElementById('visitType');
    console.log('✅ Tipologia visita selezionata:', visitTypeSelect.value);
}

/**
 * Gestisce inserimento nome dottore
 */
function handleDoctorNameChange() {
    const doctorName = document.getElementById('doctorName');
    if (doctorName && doctorName.value.trim()) {
        console.log('✅ Nome dottore inserito:', doctorName.value);
    }
}

/**
 * Verifica consensi
 */
function areAllConsentsAccepted() {
    const privacyConsent = document.getElementById('privacyConsent');
    const termsConsent = document.getElementById('termsConsent');
    
    return privacyConsent && termsConsent && privacyConsent.checked && termsConsent.checked;
}

/**
 * Mostra/nascondi errore consensi
 */
function showConsentError(show) {
    const errorMsg = document.getElementById('consentError');
    if (errorMsg) {
        errorMsg.style.display = show ? 'block' : 'none';
    }
}

/**
 * Ottieni stato consensi
 */
function getConsentsStatus() {
    const privacyConsent = document.getElementById('privacyConsent');
    const termsConsent = document.getElementById('termsConsent');
    
    return {
        privacyAccepted: privacyConsent?.checked || false,
        termsAccepted: termsConsent?.checked || false
    };
}

/**
 * Avvia registrazione ✅ CON doctorName
 */
async function handleStartRecording() {
    const patientSelect = document.getElementById('patientSelect');
    const visitTypeSelect = document.getElementById('visitType');
    const doctorNameInput = document.getElementById('doctorName');
    const selectedPatientId = patientSelect.value;
    const selectedVisitType = visitTypeSelect.value;
    const selectedDoctorName = doctorNameInput?.value.trim();
    
    if (!selectedPatientId) {
        showNotification('⚠️ Seleziona un paziente', 'error');
        return;
    }
    
    if (!selectedVisitType) {
        showNotification('⚠️ Seleziona una tipologia di visita', 'error');
        return;
    }
    
    if (!selectedDoctorName) {
        showNotification('⚠️ Inserisci il nome del dottore', 'error');
        return;
    }
    
    if (!areAllConsentsAccepted()) {
        showConsentError(true);
        showNotification('⚠️ Accetta Privacy Policy e Termini & Condizioni', 'error');
        return;
    }
    
    showConsentError(false);

    const success = await recordingManager.startRecording();
    
    if (success) {
        document.getElementById('startRecording').style.display = 'none';
        document.getElementById('pauseRecording').style.display = 'flex';
        document.getElementById('stopRecording').style.display = 'flex';
        const recordingStatus = document.getElementById('recordingStatus');
        if (recordingStatus) recordingStatus.style.display = 'block';
        showRecordingTipsCarousel();
        showNotification('🎤 Registrazione avviata', 'info');
        console.log('✅ Consensi verificati:', getConsentsStatus());
        console.log('✅ Dottore:', selectedDoctorName);
    } else {
        showNotification('❌ Errore avvio registrazione', 'error');
    }
}

/**
 * Pausa registrazione ✅ NUOVO
 */
function handlePauseRecording() {
    if (recordingManager.pauseRecording()) {
        document.getElementById('pauseRecording').style.display = 'none';
        document.getElementById('resumeRecording').style.display = 'flex';
        showNotification('⏸️ Registrazione in pausa', 'info');
        console.log('⏸️ Registrazione messa in pausa');
    }
}

/**
 * Riprendi registrazione ✅ NUOVO
 */
function handleResumeRecording() {
    if (recordingManager.resumeRecording()) {
        document.getElementById('resumeRecording').style.display = 'none';
        document.getElementById('pauseRecording').style.display = 'flex';
        showNotification('▶️ Registrazione ripresa', 'info');
        console.log('▶️ Registrazione ripresa');
    }
}

/**
 * Ferma registrazione
 */
function handleStopRecording() {
    recordingManager.stopRecording();
    
    hideRecordingTipsCarousel();
    document.getElementById('startRecording').style.display = 'flex';
    document.getElementById('pauseRecording').style.display = 'none';
    document.getElementById('resumeRecording').style.display = 'none';
    document.getElementById('stopRecording').style.display = 'none';
    const recordingStatus = document.getElementById('recordingStatus');
    if (recordingStatus) recordingStatus.style.display = 'none';
    document.getElementById('recordingPlayback').style.display = 'block';
    
    showNotification('⏹️ Registrazione completata', 'success');
}

/**
 * Ripeti registrazione
 */
function handleRetakeRecording() {
    document.getElementById('recordingPlayback').style.display = 'none';
    document.getElementById('startRecording').style.display = 'flex';
    recordingManager.reset();
    showNotification('🔄 Pronto per nuova registrazione', 'info');
}

/**
 * Invia registrazione al backend ✅ CON doctorName
 */
async function handleSubmitRecording() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    const patientSelect = document.getElementById('patientSelect');
    const visitTypeSelect = document.getElementById('visitType');
    const doctorNameInput = document.getElementById('doctorName');
    const selectedPatientId = patientSelect.value;
    const selectedVisitType = visitTypeSelect.value;
    const selectedDoctorName = doctorNameInput?.value.trim();
    const patients = await getPatients();
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    
    if (!selectedPatient) {
        showNotification('❌ Paziente non trovato', 'error');
        return;
    }
    
    if (!selectedVisitType) {
        showNotification('❌ Tipologia di visita non selezionata', 'error');
        return;
    }
    
    if (!selectedDoctorName) {
        showNotification('❌ Nome dottore non inserito', 'error');
        return;
    }
    
    const statusDiv = document.getElementById('submissionStatus');
    const statusMessage = document.getElementById('statusMessage');
    
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'submission-status loading';
        statusMessage.textContent = '📤 Invio registrazione in corso...';
    }
    
    try {
        console.log(`\n📤 Salvataggio registrazione per paziente ${selectedPatientId}...`);
        console.log(`👨‍⚕️ Dottore: ${selectedDoctorName}`);
        console.log(`📋 Tipo visita: ${selectedVisitType}`);
        
        // ✅ Ottieni il Blob dell'audio
        const audioBlob = recordingManager.getRecordingBlob();
        
        if (!audioBlob) {
            showNotification('❌ Nessuna registrazione disponibile', 'error');
            return;
        }
        
        console.log('📦 Audio Blob ottenuto:', audioBlob.size, 'bytes');
        
        // ✅ STEP 1: Salva registrazione al backend con visit_type e doctorName
        const recording = await saveRecording({
            patientId: selectedPatientId,
            visitType: selectedVisitType,
            doctorName: selectedDoctorName,
            duration: recordingManager.getRecordingDuration(),
            audioBlob: audioBlob
        });
        
        console.log('✅ Registrazione salvata con ID:', recording.id);
        console.log('✅ Dottore salvato:', recording.doctor_name || recording.doctorName);
        console.log('✅ URL audio salvato:', recording.audio_url || recording.audioUrl);
        
        if (statusDiv) {
            statusDiv.className = 'submission-status loading';
            statusMessage.textContent = '🤖 Generazione referto in corso... questo potrebbe richiedere 1-2 minuti';
        }
        
        showNotification('✅ Registrazione salvata! Avvio elaborazione AI...', 'success');
        
        // ✅ STEP 2: Avvia AI processing per generare referto
        console.log(`\n🤖 Avvio processing AI per registrazione ${recording.id}...`);
        try {
            const processingResult = await processRecording(recording.id);
            console.log('✅ Processing completato:', processingResult);
            
            if (statusDiv) {
                statusDiv.className = 'submission-status success';
                statusMessage.textContent = '✓ Referto generato con successo!';
            }
            
            showNotification('✅ Referto generato con successo!', 'success');
            
            // ✅ STEP 3: Reindirizza al referto dopo 2 secondi
            setTimeout(() => {
                console.log('📄 Reindirizzamento alla pagina del referto...');
                window.location.href = `referto.html?patientId=${selectedPatientId}&recordingId=${recording.id}`;
            }, 2000);
            
        } catch (processingError) {
            console.warn('⚠️ Processing AI non completato (non-blocco):', processingError.message);
            
            // Il salvataggio è riuscito, il processing continua in background
            if (statusDiv) {
                statusDiv.className = 'submission-status warning';
                statusMessage.textContent = '⚠️ Registrazione salvata. Referto in elaborazione...';
            }
            
            showNotification('⚠️ Registrazione salvata. Elaborazione referto in corso...', 'info');
            
            // Reindirizza comunque al referto (l'elaborazione continua in background)
            setTimeout(() => {
                console.log('📄 Reindirizzamento alla pagina del referto...');
                window.location.href = `referto.html?patientId=${selectedPatientId}&recordingId=${recording.id}`;
            }, 3000);
        }
        
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        
        if (statusDiv) {
            statusDiv.className = 'submission-status error';
            statusMessage.textContent = `✗ Errore: ${error.message}`;
        }
        
        showNotification('❌ Errore nell\'invio della registrazione', 'error');
    }
}

/**
 * Resetta form registrazione
 */
function resetRecordingForm() {
    const patientSelect = document.getElementById('patientSelect');
    const visitTypeSelect = document.getElementById('visitType');
    const doctorNameInput = document.getElementById('doctorName');
    
    if (patientSelect) patientSelect.value = '';
    if (visitTypeSelect) visitTypeSelect.value = '';
    if (doctorNameInput) doctorNameInput.value = '';
    
    document.getElementById('recordingPlayback').style.display = 'none';
    const submissionStatus = document.getElementById('submissionStatus');
    if (submissionStatus) submissionStatus.style.display = 'none';
    document.getElementById('startRecording').style.display = 'flex';
    document.getElementById('pauseRecording').style.display = 'none';
    document.getElementById('resumeRecording').style.display = 'none';
    document.getElementById('stopRecording').style.display = 'none';
    
    recordingManager.reset();
    
    const privacyConsent = document.getElementById('privacyConsent');
    const termsConsent = document.getElementById('termsConsent');
    if (privacyConsent) privacyConsent.checked = false;
    if (termsConsent) termsConsent.checked = false;
    
    handlePatientSelection();
}

// ==================== HISTORY SECTION ====================

/**
 * Setup history listeners
 */
function setupHistoryListeners() {
    loadHistoryList();
}

/**
 * Carica lista registrazioni
 */
async function loadHistoryList() {
    try {
        const recordingsList = document.getElementById('recordingsList');
        if (!recordingsList) return;
        
        console.log('\n📥 Caricamento registrazioni...');
        
        const recordings = await getRecordings();
        
        recordingsList.innerHTML = '';
        
        if (!recordings || recordings.length === 0) {
            console.warn('⚠️ Nessuna registrazione disponibile');
            recordingsList.appendChild(createEmptyState(
                'Nessuna registrazione',
                'Non hai ancora nessuna registrazione salvata',
                '🎤'
            ));
            return;
        }
        
        // Ordina per data
        const sorted = [...recordings].sort((a, b) => {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA;
        });
        
        sorted.forEach(recording => {
            const item = createRecordingItem(recording);
            recordingsList.appendChild(item);
        });
        
        console.log(`✅ Caricate ${sorted.length} registrazioni`);
        
    } catch (error) {
        console.error('❌ Errore caricamento registrazioni:', error);
        showNotification('Errore caricamento registrazioni', 'error');
    }
}

/**
 * Crea elemento registrazione
 */
function createRecordingItem(recording) {
    const div = document.createElement('div');
    div.className = 'recording-item';
    div.id = `recording-${recording.id}`;
    
    const firstName = recording.first_name || recording.firstName || '';
    const lastName = recording.last_name || recording.lastName || '';
    const displayName = (firstName && lastName) ? `${firstName} ${lastName}` : 'Paziente sconosciuto';
    const duration = formatDuration(recording.duration || 0);
    const createdDate = recording.created_at || recording.createdAt || new Date().toISOString();
    
    // Ottieni etichetta visita
    const visitType = recording.visit_type || recording.visitType || '';
    const visitTypeLabel = getVisitTypeLabel(visitType);
    
    // Controlla se audio_url è valido
    const hasAudio = (recording.audio_url || recording.audioUrl) && 
                     !String(recording.audio_url || recording.audioUrl).startsWith('blob:');
    
    // Controlla stato processing
    const processingStatus = recording.processing_status || 'pending';
    const isProcessed = processingStatus === 'completed';
    const refertoBtnText = isProcessed ? '📄 Visualizza Referto' : '⏳ In elaborazione...';
    const refertoBtnDisabled = !isProcessed ? 'disabled' : '';
    
    div.innerHTML = `
        <div class="recording-header">
            <div class="recording-info">
                <h4>${displayName}</h4>
                <p class="recording-date">${formatDate(new Date(createdDate))}</p>
                <p class="recording-duration">⏱️ ${duration}</p>
                ${visitTypeLabel ? `<p class="recording-visit-type">📋 ${visitTypeLabel}</p>` : ''}
            </div>
            <div class="recording-actions">
                <button type="button" class="btn-icon" title="Visualizza referto" onclick="viewReferto('${recording.id}', '${recording.patient_id || recording.patientId}')" ${refertoBtnDisabled}>
                    ${refertoBtnText}
                </button>
                ${hasAudio ? `
                    <button type="button" class="btn-icon" title="Ascolta" onclick="playRecording('${recording.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                ` : ''}
                <button type="button" class="btn-icon btn-danger" title="Elimina" onclick="deleteRecordingFromUI('${recording.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div id="player-${recording.id}" class="recording-player" style="display: none;">
            ${hasAudio ? `
                <audio controls>
                    <source src="${recording.audio_url || recording.audioUrl}" type="audio/webm">
                    Il tuo browser non supporta l'elemento audio.
                </audio>
            ` : '<p>Audio non disponibile</p>'}
        </div>
    `;
    
    return div;
}

/**
 * Converte visit_type in etichetta leggibile
 */
function getVisitTypeLabel(visitType) {
    const labels = {
        'prima_visita_generica': 'Prima visita generica',
        'prima_visita_pedodonzia': 'Prima visita pedodonzia',
        'chirurgia_impianti': 'Visita Chirurgia e Impianti',
        'visita_ortodontica': 'Visita Ortodontica',
        'visita_parodontale': 'Visita Parodontale'
    };
    
    return labels[visitType] || '';
}

/**
 * Visualizza referto
 */
function viewReferto(recordingId, patientId) {
    if (!recordingId || !patientId) {
        showNotification('❌ Dati non validi', 'error');
        return;
    }
    
    console.log(`📄 Apertura referto per recording ${recordingId}`);
    window.location.href = `referto.html?patientId=${patientId}&recordingId=${recordingId}`;
}

/**
 * Riproduci registrazione
 */
function playRecording(recordingId) {
    const player = document.getElementById(`player-${recordingId}`);
    if (player) {
        const isHidden = player.style.display === 'none';
        
        // Nascondi altri player
        document.querySelectorAll('.recording-player').forEach(p => {
            p.style.display = 'none';
        });
        
        if (isHidden) {
            player.style.display = 'block';
            const audio = player.querySelector('audio');
            if (audio) audio.play();
        }
    }
}

/**
 * Elimina registrazione da UI
 */
async function deleteRecordingFromUI(recordingId) {
    if (confirm('Sei sicuro di voler eliminare questa registrazione?')) {
        try {
            console.log(`\n🗑️ Eliminazione registrazione ${recordingId}...`);
            
            await deleteRecording(recordingId);
            
            const item = document.getElementById(`recording-${recordingId}`);
            if (item) item.remove();
            
            console.log('✅ Registrazione eliminata');
            showNotification('✅ Registrazione eliminata', 'success');
            
            await loadHistoryList();
            
        } catch (error) {
            console.error('❌ Errore eliminazione:', error);
            showNotification('❌ Errore: ' + error.message, 'error');
        }
    }
}

// ==================== PROFILE SECTION ====================

/**
 * Setup profile listeners
 */
function setupProfileListeners() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    loadProfileData();
}

/**
 * Carica dati profilo
 */
function loadProfileData() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    const emailField = document.getElementById('profileEmail');
    const nameField = document.getElementById('profileName');
    
    if (emailField) emailField.value = session.email || '';
    if (nameField) nameField.value = session.name || '';
    
    console.log('✅ Dati profilo caricati');
}

/**
 * Salva profilo
 */
function handleSaveProfile() {
    const statusDiv = document.getElementById('profileStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'submission-status success';
        const statusMessage = document.getElementById('profileStatusMessage');
        if (statusMessage) statusMessage.textContent = '✓ Profilo salvato con successo';
    }
    
    showNotification('✅ Profilo aggiornato!', 'success');
    
    setTimeout(() => {
        if (statusDiv) statusDiv.style.display = 'none';
    }, 2000);
    
    console.log('✅ Profilo salvato');
}

/**
 * Logout
 */
function handleLogout() {
    if (confirm('Sei sicuro di voler uscire?')) {
        console.log('👋 Logout in corso...');
        
        localStorage.removeItem('userSession');
        showNotification('👋 Logout effettuato', 'success');
        
        setTimeout(() => {
            window.location.replace('../login/index.html');
        }, 1000);
    }
}

// ==================== PAGE NAVIGATION ====================

/**
 * Mostra pagina
 */
function showPage(pageName) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    const selectedPage = document.getElementById(pageName + 'Page');
    if (selectedPage) {
        selectedPage.style.display = 'block';
        console.log(`✅ Pagina visibile: ${pageName}Page`);
    }
}

/**
 * Carica registrazioni storia (richiesto da sidebar.js)
 */
function loadRecordingsHistory() {
    loadHistoryList();
}

// ==================== RECORDING TIPS CAROUSEL ====================

const recordingTips = [
    "✓ Ho descritto i denti mancanti",
    "✓ Ho analizzato i denti presenti per ogni quadrante",
    "✓ Ho descritto la situazione generale della bocca",
    "✓ Ho proposto le cure quadrante per quadrante",
    "✓ Ho usato la nomenclatura corretta",
    "✓ Ho spiegato chiaramente ogni cura",
    "✓ Ho identificato gli esami aggiuntivi necessari",
    "✓ Ho comunicato che il preventivo sarà elaborato dopo gli esami",
    "✓ Ho registrato tutto nell'appuntamento"
];

let currentTipIndex = 0;
let tipAutoPlayInterval = null;

/**
 * Mostra carousel tips
 */
function showRecordingTipsCarousel() {
    const carousel = document.getElementById('recordingTipsCarousel');
    if (!carousel) return;
    
    carousel.style.display = 'block';
    currentTipIndex = 0;
    initializeTipsDots();
    updateRecordingTip(0);
    startTipsAutoPlay();
    
    console.log('✅ Carousel tips avviato');
}

/**
 * Nascondi carousel tips
 */
function hideRecordingTipsCarousel() {
    const carousel = document.getElementById('recordingTipsCarousel');
    if (carousel) carousel.style.display = 'none';
    stopTipsAutoPlay();
    console.log('✅ Carousel tips nascosto');
}

/**
 * Inizializza dots
 */
function initializeTipsDots() {
    const dotsContainer = document.getElementById('tipsDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = '';
    
    recordingTips.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot' + (index === 0 ? ' active' : '');
        dot.onclick = (e) => {
            e.preventDefault();
            goToRecordingTip(index);
        };
        dotsContainer.appendChild(dot);
    });
}

/**
 * Aggiorna tip visualizzato
 */
function updateRecordingTip(index) {
    if (index < 0 || index >= recordingTips.length) return;
    
    currentTipIndex = index;
    
    const tipText = document.getElementById('tipText');
    const tipCounter = document.getElementById('tipCounter');
    const dots = document.querySelectorAll('.dot');
    
    if (tipText) tipText.textContent = recordingTips[index];
    if (tipCounter) tipCounter.textContent = index + 1;
    
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    console.log(`📝 Tip ${index + 1}/${recordingTips.length}: ${recordingTips[index]}`);
}

/**
 * Tip successivo
 */
function nextRecordingTip() {
    let nextIndex = currentTipIndex + 1;
    if (nextIndex >= recordingTips.length) nextIndex = 0;
    updateRecordingTip(nextIndex);
    resetTipsAutoPlay();
}

/**
 * Tip precedente
 */
function previousRecordingTip() {
    let prevIndex = currentTipIndex - 1;
    if (prevIndex < 0) prevIndex = recordingTips.length - 1;
    updateRecordingTip(prevIndex);
    resetTipsAutoPlay();
}

/**
 * Vai a tip specifico
 */
function goToRecordingTip(index) {
    if (index >= 0 && index < recordingTips.length) {
        updateRecordingTip(index);
        resetTipsAutoPlay();
    }
}

/**
 * Avvia auto-play
 */
function startTipsAutoPlay() {
    stopTipsAutoPlay();
    tipAutoPlayInterval = setInterval(() => {
        nextRecordingTip();
    }, 8000);
    console.log('⏱️ Auto-play tips avviato');
}

/**
 * Ferma auto-play
 */
function stopTipsAutoPlay() {
    if (tipAutoPlayInterval) {
        clearInterval(tipAutoPlayInterval);
        tipAutoPlayInterval = null;
        console.log('⏱️ Auto-play tips fermato');
    }
}

/**
 * Resetta timer auto-play
 */
function resetTipsAutoPlay() {
    stopTipsAutoPlay();
    startTipsAutoPlay();
}