/**
 * ============================================================================
 * Medical AI Client - Main Application
 * Gestisce UI components e logica principale dell'app
 * ============================================================================
 */

// ==================== UI COMPONENTS FACTORY ====================

/**
 * Crea un bottone
 */
function createButton(label, className = 'btn-primary', onClick = null) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = className;
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    return button;
}

/**
 * Crea una card
 */
function createCard(title, content) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardTitle.className = 'card-title';
    
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    if (typeof content === 'string') {
        cardContent.textContent = content;
    } else {
        cardContent.appendChild(content);
    }
    
    card.appendChild(cardTitle);
    card.appendChild(cardContent);
    
    return card;
}

/**
 * Crea un modale
 */
function createModal(title, message, actions = []) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = title;
    modalTitle.className = 'modal-title';
    
    const modalMessage = document.createElement('p');
    modalMessage.textContent = message;
    modalMessage.className = 'modal-message';
    
    const modalActions = document.createElement('div');
    modalActions.className = 'modal-actions';
    
    actions.forEach(action => {
        const button = createButton(action.label, action.className || 'btn-primary', () => {
            action.onClick();
            modal.remove();
        });
        modalActions.appendChild(button);
    });
    
    if (actions.length === 0) {
        const closeButton = createButton('Chiudi', 'btn-secondary', () => {
            modal.remove();
        });
        modalActions.appendChild(closeButton);
    }
    
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalMessage);
    modalContent.appendChild(modalActions);
    
    modalOverlay.appendChild(modalContent);
    modal.appendChild(modalOverlay);
    
    return modal;
}

/**
 * Crea un input group
 */
function createInputGroup(label, type = 'text', placeholder = '', id = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    if (label) {
        const labelElement = document.createElement('label');
        labelElement.htmlFor = id;
        labelElement.textContent = label;
        group.appendChild(labelElement);
    }
    
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.className = 'input-field';
    if (id) input.id = id;
    
    group.appendChild(input);
    
    return { group, input };
}

/**
 * Crea uno spinner di caricamento
 */
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-animation"></div>
        <p>Caricamento...</p>
    `;
    return spinner;
}

/**
 * Crea uno stato vuoto
 */
function createEmptyState(title, message, icon = '📭') {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.innerHTML = `
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${message}</p>
    `;
    return state;
}

/**
 * Crea un elemento della lista registrazioni
 */
function createRecordingItem(recording) {
    const item = document.createElement('div');
    item.className = 'recording-item';
    item.dataset.recordingId = recording.id;
    
    const header = document.createElement('div');
    header.className = 'recording-item-header';
    
    const patientInfo = document.createElement('div');
    patientInfo.className = 'patient-info';
    
    // Ottieni il nome completo dal paziente
    const firstName = recording.first_name || recording.firstName || '';
    const lastName = recording.last_name || recording.lastName || '';
    const displayName = (firstName && lastName) ? `${firstName} ${lastName}` : 'Paziente sconosciuto';
    
    patientInfo.innerHTML = `
        <h4>${displayName}</h4>
        <p>${recording.email || recording.patient_email || ''}</p>
        <p>${recording.phone || ''}</p>
    `;
    
    const recordingMeta = document.createElement('div');
    recordingMeta.className = 'recording-meta';
    
    const recordingDate = recording.created_at || recording.createdAt || new Date().toISOString();
    const recordingDuration = recording.duration || 0;
    
    recordingMeta.innerHTML = `
        <span class="recording-date">${formatDate(new Date(recordingDate))}</span>
        <span class="recording-duration">${formatTime(recordingDuration)}</span>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'recording-actions';
    
    // Bottone riproduci (solo se audio_url disponibile)
    if (recording.audio_url || recording.audioUrl) {
        const playBtn = createButton('▶ Riproduci', 'btn-small', () => {
            const audioUrl = recording.audio_url || recording.audioUrl;
            const audio = new Audio(audioUrl);
            audio.play();
        });
        actions.appendChild(playBtn);
    }
    
    // Bottone elimina
    const deleteBtn = createButton('🗑 Elimina', 'btn-small btn-danger', async () => {
        if (confirm('Sei sicuro di voler eliminare questa registrazione?')) {
            try {
                await deleteRecordingFromBackend(recording.id);
                item.remove();
                showNotification('✅ Registrazione eliminata', 'success');
            } catch (error) {
                showNotification('❌ Errore: ' + error.message, 'error');
            }
        }
    });
    actions.appendChild(deleteBtn);
    
    header.appendChild(patientInfo);
    header.appendChild(recordingMeta);
    header.appendChild(actions);
    
    item.appendChild(header);
    
    return item;
}

// ==================== INITIALIZATION ====================

/**
 * Inizializza l'applicazione
 */
async function initializeApp() {
    try {
        console.log('🚀 Inizializzazione Medical AI Client App');
        
        // Verifica sessione
        const session = JSON.parse(localStorage.getItem('userSession') || '{}');
        if (!session.userId || !session.studioId) {
            console.error('❌ Sessione non valida');
            window.location.replace('../login/index.html');
            return;
        }
        
        console.log(`✅ Sessione valida: ${session.email}`);
        
        // Inizializza UI
        initializeUI();
        
        // Carica dati iniziali
        await loadInitialData();
        
        console.log('✅ Applicazione inizializzata');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        showNotification('Errore nel caricamento dell\'applicazione', 'error');
    }
}

/**
 * Inizializza elementi UI
 */
function initializeUI() {
    console.log('🎨 Inizializzazione UI');
    
    // Qui puoi aggiungere event listeners globali
    // Esempio: gestione logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Carica dati iniziali
 */
async function loadInitialData() {
    try {
        console.log('📥 Caricamento dati iniziali');
        
        // Carica pazienti
        await loadPatientsList();
        
        // Carica registrazioni
        await loadHistoryList();
        
        console.log('✅ Dati caricati');
    } catch (error) {
        console.error('❌ Errore caricamento dati:', error);
    }
}

/**
 * Gestisce logout
 */
async function handleLogout() {
    try {
        console.log('👋 Logout in corso...');
        
        // Chiama API logout (opzionale)
        await fetch('http://localhost:3001/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Pulisci localStorage
        localStorage.removeItem('userSession');
        
        // Redirect a login
        window.location.replace('../login/index.html');
        
    } catch (error) {
        console.error('❌ Errore logout:', error);
        // Comunque reindirizza a login
        window.location.replace('../login/index.html');
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Formatta una data in formato leggibile
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
 * Formatta il tempo in MM:SS
 */
function formatTime(seconds) {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Mostra notifica
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Genera ID unico
 */
function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida email
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida telefono
 */
function validatePhone(phone) {
    const regex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

/**
 * Valida password
 */
function validatePassword(password) {
    return password && password.length >= 6;
}

/**
 * Salva utente in localStorage
 */
function storeUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

/**
 * Ottiene utente da localStorage
 */
function getStoredUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

/**
 * Rimuove utente da localStorage
 */
function removeStoredUser() {
    localStorage.removeItem('currentUser');
}