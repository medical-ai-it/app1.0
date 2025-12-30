let currentAdminUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Panel inizializzato');

    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    console.log('📌 Session trovata:', session);
    
    // ✅ CONTROLLA userType INVECE DI role
    if (session && session.userId && (session.userType === 'admin' || session.role === 'admin')) {
        console.log('✅ Accesso admin confermato');
        currentAdminUser = session;
        await initializeAdminDashboard();
    } else {
        // Non è loggato o non è admin - reindirizza al login
        console.warn('❌ Accesso negato: non sei loggato come admin');
        localStorage.removeItem('userSession');
        window.location.replace('../login/index.html');
    }
});

async function initializeAdminDashboard() {
    // Mostra dashboard section
    document.getElementById('adminDashboardSection').style.display = 'block';

    await loadAdminHeader();
    await loadAdminSidebar();
    await loadAdminFooter();

    // Carica dati
    await loadStudios();
    await loadUsers();
    await loadAnalytics();
    await loadTeam();
    loadProfile();

    // Setup event listeners
    setupAdminEventListeners();
    setupTeamEventListeners();
    setupProfileEventListeners();
    
    // Mostra prima pagina
    showAdminPage('studios');
}

// ===== ADMIN EVENTS =====
function setupAdminEventListeners() {
    const newStudioBtn = document.getElementById('newStudioBtn');
    if (newStudioBtn) {
        newStudioBtn.addEventListener('click', openNewStudioModal);
    }

    const cancelNewStudioBtn = document.getElementById('cancelNewStudioBtn');
    if (cancelNewStudioBtn) {
        cancelNewStudioBtn.addEventListener('click', closeNewStudioModal);
    }

    const createStudioBtn = document.getElementById('createStudioBtn');
    if (createStudioBtn) {
        createStudioBtn.addEventListener('click', createNewStudio);
    }

    const backToStudiosBtn = document.getElementById('backToStudiosBtn');
    if (backToStudiosBtn) {
        backToStudiosBtn.addEventListener('click', () => showAdminPage('studios'));
    }

    const saveStudioBtn = document.getElementById('saveStudioBtn');
    if (saveStudioBtn) {
        saveStudioBtn.addEventListener('click', saveStudioChanges);
    }

    const deleteStudioBtn = document.getElementById('deleteStudioBtn');
    if (deleteStudioBtn) {
        deleteStudioBtn.addEventListener('click', () => {
            if (currentStudioDetail) {
                confirmDeleteStudio(currentStudioDetail.id);
            }
        });
    }

    // Gestisci click su overlay del modal
    const modal = document.getElementById('newStudioModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeNewStudioModal();
            }
        });
    }
}

// ===== TEAM EVENTS =====
function setupTeamEventListeners() {
    const newAdminBtn = document.getElementById('newAdminBtn');
    if (newAdminBtn) {
        newAdminBtn.addEventListener('click', openNewAdminModal);
    }

    const createAdminBtn = document.getElementById('createAdminBtn');
    if (createAdminBtn) {
        createAdminBtn.addEventListener('click', createNewAdmin);
    }

    const cancelNewAdminBtn = document.getElementById('cancelNewAdminBtn');
    if (cancelNewAdminBtn) {
        cancelNewAdminBtn.addEventListener('click', closeNewAdminModal);
    }
}

// ===== PROFILE EVENTS =====
function setupProfileEventListeners() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    const resetProfileBtn = document.getElementById('resetProfileBtn');
    if (resetProfileBtn) {
        resetProfileBtn.addEventListener('click', resetProfile);
    }
}

// ===== PROFILE FUNCTIONS =====

/**
 * Carica profilo admin dalla sessione
 */
function loadProfile() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    if (!session || !session.userId) {
        console.warn('❌ Sessione non trovata');
        return;
    }

    // Popola i campi del profilo
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    
    if (profileName) profileName.value = session.name || '';
    if (profileEmail) profileEmail.value = session.email || '';
    
    console.log('✅ Profilo caricato:', session);
}

/**
 * Salva le modifiche del profilo nel database
 */
async function saveProfile() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    if (!session || !session.userId) {
        showNotification('❌ Sessione non valida', 'error');
        return;
    }

    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePassword = document.getElementById('profilePassword');
    const profileNewPassword = document.getElementById('profileNewPassword');
    const profileConfirmPassword = document.getElementById('profileConfirmPassword');

    if (!profileName || !profileEmail) {
        showNotification('❌ Elementi del modulo non trovati', 'error');
        return;
    }

    const name = profileName.value.trim();
    const email = profileEmail.value.trim();

    // Validazione
    if (!name || !email) {
        showNotification('❌ Nome ed email sono obbligatori', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('❌ Email non valida', 'error');
        return;
    }

    try {
        // 1️⃣ Aggiorna profilo (nome e email)
        console.log('📌 Aggiornamento profilo:', { name, email });
        
        await updateAdminProfileInDB(session.userId, {
            name: name,
            email: email
        });

        // 2️⃣ Se inserito, cambia la password
        const newPassword = profileNewPassword.value.trim();
        const confirmPassword = profileConfirmPassword.value.trim();
        const oldPassword = profilePassword.value.trim();

        if (newPassword || confirmPassword) {
            // Se una password è inserita, entrambe devono essere inserite
            if (!newPassword || !confirmPassword || !oldPassword) {
                showNotification('❌ Inserisci vecchia password, nuova password e conferma', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification('❌ Le password non corrispondono', 'error');
                return;
            }

            if (newPassword.length < 6) {
                showNotification('❌ Password deve avere almeno 6 caratteri', 'error');
                return;
            }

            console.log('🔑 Cambio password in corso...');
            
            // Cambia password
            await changeAdminPasswordInDB(session.userId, oldPassword, newPassword);

            // Pulisci i campi password
            profilePassword.value = '';
            profileNewPassword.value = '';
            profileConfirmPassword.value = '';
        }

        // Aggiorna la sessione con i nuovi dati
        session.name = name;
        session.email = email;
        localStorage.setItem('userSession', JSON.stringify(session));
        currentAdminUser = session;

        showNotification('✅ Profilo salvato completamente!', 'success');

    } catch (error) {
        console.error('❌ Errore nel salvataggio del profilo:', error);
        showNotification('❌ Errore nel salvataggio: ' + error.message, 'error');
    }
}

/**
 * Annulla le modifiche (ripristina i valori originali)
 */
function resetProfile() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePassword = document.getElementById('profilePassword');
    const profileNewPassword = document.getElementById('profileNewPassword');
    const profileConfirmPassword = document.getElementById('profileConfirmPassword');

    if (profileName) profileName.value = session.name || '';
    if (profileEmail) profileEmail.value = session.email || '';
    if (profilePassword) profilePassword.value = '';
    if (profileNewPassword) profileNewPassword.value = '';
    if (profileConfirmPassword) profileConfirmPassword.value = '';

    showNotification('✅ Modifiche annullate', 'info');
}

// ===== UTILITY FUNCTIONS =====

function handleAdminLogout() {
    currentAdminUser = null;
    localStorage.removeItem('userSession');
    
    // Reindirizza al login
    window.location.replace('../login/index.html');
}

function showAdminPage(pageName) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    const selectedPage = document.getElementById(pageName + 'Page');
    if (selectedPage) {
        selectedPage.style.display = 'block';
    }
}