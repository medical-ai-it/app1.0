/**
 * ============================================================================
 * Admin Manager - Medical AI
 * Gestione Studios, Users, Analytics, Profile, Team, Settings
 * Con integrazione Backend Express + MySQL
 * ============================================================================
 */

let currentStudioDetail = null;
let loadedStudios = [];  // ✅ VARIABILE GLOBALE - Salva gli studi caricati dal backend

// ===== STUDIOS MANAGEMENT =====

async function loadStudios() {
    const studiosGrid = document.getElementById('studiosGrid');
    if (!studiosGrid) {
        console.error('❌ Elemento studiosGrid non trovato');
        return;
    }

    try {
        // 🔑 CHIAMA IL BACKEND E SALVA IN VARIABILE GLOBALE
        loadedStudios = await fetchStudiosFromDB();

        if (loadedStudios.length === 0) {
            studiosGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-icon">🏢</div>
                    <h3>Nessuno Studio</h3>
                    <p>Crea il primo studio per iniziare</p>
                </div>
            `;
            return;
        }

        studiosGrid.innerHTML = loadedStudios.map(studio => {
            const stats = calculateStudioStats(studio.id);
            return `
                <div class="studio-card" onclick="openStudioDetail('${studio.id}')">
                    <div class="studio-card-header">
                        <h3 class="studio-card-title">${studio.name}</h3>
                        <span class="studio-status-badge ${studio.status}">${getStudioStatusLabel(studio.status)}</span>
                    </div>
                    <div class="studio-card-body">
                        <div class="studio-card-info">
                            <p><strong>Email:</strong> ${studio.email}</p>
                            <p><strong>Tel:</strong> ${studio.phone}</p>
                            <p><strong>Creato:</strong> ${formatAdminDate(studio.created_at || studio.createdAt)}</p>
                        </div>
                    </div>
                    <div class="studio-card-stats">
                        <div class="studio-stat">
                            <div class="studio-stat-number">${stats.totalRecordings}</div>
                            <div class="studio-stat-label">Registrazioni</div>
                        </div>
                        <div class="studio-stat">
                            <div class="studio-stat-number">${stats.uniquePatients}</div>
                            <div class="studio-stat-label">Pazienti</div>
                        </div>
                    </div>
                    <div class="studio-card-actions">
                        <button class="btn-primary btn-small" onclick="openStudioDetail('${studio.id}'); event.stopPropagation();">
                            📋 Dettagli
                        </button>
                        <button class="btn-danger btn-small" onclick="confirmDeleteStudio('${studio.id}'); event.stopPropagation();">
                            🗑️ Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Errore caricamento studios:', error);
        showNotification('Errore nel caricamento degli studios', 'error');
    }
}

function openStudioDetail(studioId) {
    // ✅ CERCA IN loadedStudios INVECE DI adminDB
    currentStudioDetail = loadedStudios.find(s => s.id === studioId);
    
    if (!currentStudioDetail) {
        showNotification('❌ Studio non trovato', 'error');
        console.error('Studio ID non trovato:', studioId);
        console.error('Studios disponibili:', loadedStudios);
        return;
    }

    const stats = calculateStudioStats(studioId);

    const elements = {
        studioDetailTitle: document.getElementById('studioDetailTitle'),
        totalRecordings: document.getElementById('totalRecordings'),
        uniquePatients: document.getElementById('uniquePatients'),
        totalHours: document.getElementById('totalHours'),
        createdDate: document.getElementById('createdDate'),
        infoStudioName: document.getElementById('infoStudioName'),
        infoStudioEmail: document.getElementById('infoStudioEmail'),
        infoStudioPhone: document.getElementById('infoStudioPhone'),
        infoStudioStatus: document.getElementById('infoStudioStatus'),
        editStudioName: document.getElementById('editStudioName'),
        editStudioEmail: document.getElementById('editStudioEmail'),
        editStudioPhone: document.getElementById('editStudioPhone'),
        editStudioStatus: document.getElementById('editStudioStatus')
    };

    if (elements.studioDetailTitle) elements.studioDetailTitle.textContent = currentStudioDetail.name;
    if (elements.totalRecordings) elements.totalRecordings.textContent = stats.totalRecordings;
    if (elements.uniquePatients) elements.uniquePatients.textContent = stats.uniquePatients;
    if (elements.totalHours) elements.totalHours.textContent = stats.totalHours + 'h';
    if (elements.createdDate) elements.createdDate.textContent = formatAdminDate(currentStudioDetail.created_at || currentStudioDetail.createdAt);

    if (elements.infoStudioName) elements.infoStudioName.textContent = currentStudioDetail.name;
    if (elements.infoStudioEmail) elements.infoStudioEmail.textContent = currentStudioDetail.email;
    if (elements.infoStudioPhone) elements.infoStudioPhone.textContent = currentStudioDetail.phone;
    if (elements.infoStudioStatus) elements.infoStudioStatus.textContent = getStudioStatusLabel(currentStudioDetail.status);

    if (elements.editStudioName) elements.editStudioName.value = currentStudioDetail.name;
    if (elements.editStudioEmail) elements.editStudioEmail.value = currentStudioDetail.email;
    if (elements.editStudioPhone) elements.editStudioPhone.value = currentStudioDetail.phone;
    if (elements.editStudioStatus) elements.editStudioStatus.value = currentStudioDetail.status;

    loadStudioRecordings(studioId, stats.recordings);
    setupDetailTabs();
    showAdminPage('studioDetail');
}

function loadStudioRecordings(studioId, recordings) {
    const recordingsList = document.getElementById('studioRecordingsList');

    if (!recordingsList) {
        console.error('❌ Elemento studioRecordingsList non trovato');
        return;
    }

    if (recordings.length === 0) {
        recordingsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎤</div>
                <h3>Nessuna Registrazione</h3>
                <p>Non ci sono registrazioni per questo studio</p>
            </div>
        `;
        return;
    }

    recordingsList.innerHTML = recordings.map(recording => `
        <div class="recording-item">
            <div class="recording-item-header">
                <div class="patient-info">
                    <h4>👤 ${recording.patientName || 'Paziente Sconosciuto'}</h4>
                    <p>📧 ${recording.patientEmail || '-'}</p>
                    <p>📱 ${recording.patientPhone || '-'}</p>
                </div>
                <div class="recording-meta">
                    <span class="recording-date">📅 ${formatAdminDate(recording.timestamp)}</span>
                    <span class="recording-duration">⏱️ ${formatTime(recording.duration || 0)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupDetailTabs() {
    const tabs = document.querySelectorAll('.detail-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick);
        tab.addEventListener('click', handleTabClick);
    });

    function handleTabClick(e) {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        e.target.classList.add('active');
        const tabName = e.target.getAttribute('data-tab');
        const selectedTab = document.getElementById(tabName + 'Tab');
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
    }
}

async function saveStudioChanges() {
    if (!currentStudioDetail) {
        showNotification('❌ Nessuno studio selezionato', 'error');
        return;
    }

    const nameEl = document.getElementById('editStudioName');
    const emailEl = document.getElementById('editStudioEmail');
    const phoneEl = document.getElementById('editStudioPhone');
    const statusEl = document.getElementById('editStudioStatus');

    if (!nameEl || !emailEl || !phoneEl || !statusEl) {
        showNotification('❌ Errore: elementi form mancanti', 'error');
        return;
    }

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();
    const status = statusEl.value;

    if (!name || !email || !phone) {
        showNotification('⚠️ Compila tutti i campi', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('⚠️ Email non valida', 'error');
        return;
    }

    try {
        const data = {
            name: name,
            email: email,
            phone: phone,
            status: status
        };

        // 🔑 Aggiorna nel backend
        await updateStudioInDB(currentStudioDetail.id, data);
        
        // Aggiorna anche in loadedStudios
        const studioIndex = loadedStudios.findIndex(s => s.id === currentStudioDetail.id);
        if (studioIndex !== -1) {
            loadedStudios[studioIndex] = { ...loadedStudios[studioIndex], ...data };
        }
        
        showNotification('✅ Studio aggiornato con successo', 'success');
        
        // Ricarica i dettagli
        currentStudioDetail = { ...currentStudioDetail, ...data };
        openStudioDetail(currentStudioDetail.id);
    } catch (error) {
        console.error('❌ Errore aggiornamento studio:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}

async function confirmDeleteStudio(studioId) {
    const studio = loadedStudios.find(s => s.id === studioId);
    if (!studio) {
        showNotification('❌ Studio non trovato', 'error');
        return;
    }

    const modal = createModal(
        '🗑️ Elimina Studio',
        `Sei sicuro di voler eliminare lo studio "<strong>${studio.name}</strong>"? Questa azione non può essere annullata.`,
        [
            {
                label: 'Annulla',
                className: 'btn-secondary'
            },
            {
                label: 'Elimina',
                className: 'btn-danger',
                onClick: async () => {
                    try {
                        // 🔑 Elimina dal backend
                        await deleteStudioFromDB(studioId);
                        
                        // Rimuovi da loadedStudios
                        loadedStudios = loadedStudios.filter(s => s.id !== studioId);
                        
                        showNotification('✅ Studio eliminato', 'success');
                        await loadStudios();
                        showAdminPage('studios');
                    } catch (error) {
                        console.error('❌ Errore eliminazione studio:', error);
                        showNotification(`Errore: ${error.message}`, 'error');
                    }
                }
            }
        ]
    );
    document.body.appendChild(modal);
}

// ===== USERS MANAGEMENT =====

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        console.error('❌ Elemento usersTableBody non trovato');
        return;
    }

    try {
        // 🔑 CHIAMA IL BACKEND PER CARICARE GLI UTENTI
        let users = await fetchUsersFromDB();

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <div class="empty-state" style="margin: 0;">
                            <div class="empty-icon">👥</div>
                            <h3>Nessun Utente</h3>
                            <p>Crea il primo utente per iniziare</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => {
            const studio = loadedStudios.find(s => s.id === user.studio_id);
            const stats = calculateUserStats(user.id);
            return `
                <tr>
                    <td class="user-email">${user.email}</td>
                    <td>${studio ? studio.name : '-'}</td>
                    <td><span class="user-role-badge ${user.role}">${getUserRoleLabel(user.role)}</span></td>
                    <td><span class="user-status-badge ${user.status}">${getUserStatusLabel(user.status)}</span></td>
                    <td>
                        <div class="user-metric">
                            <span class="metric-icon">📊</span>
                            <span class="metric-value">${stats.monthlyRecordings}</span>
                            <span class="metric-label">questo mese</span>
                        </div>
                    </td>
                    <td>
                        <div class="user-metric">
                            <span class="metric-icon">⏱️</span>
                            <span class="metric-value">${stats.totalMinutes}</span>
                            <span class="metric-label">minuti</span>
                        </div>
                    </td>
                    <td>${formatAdminDate(user.created_at)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-small" onclick="editUser('${user.id}')">✏️ Modifica</button>
                            <button class="btn-small btn-danger" onclick="confirmDeleteUser('${user.id}')">🗑️ Elimina</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Errore caricamento users:', error);
        showNotification('Errore nel caricamento degli utenti', 'error');
    }
}

function editUser(userId) {
    const user = adminDB.users.find(u => u.id === userId);
    if (!user) {
        showNotification('❌ Utente non trovato', 'error');
        return;
    }

    showNotification(`📝 Modifica utente: ${user.email} - In sviluppo`, 'info');
}

async function confirmDeleteUser(userId) {
    const user = adminDB.users.find(u => u.id === userId);
    if (!user) {
        showNotification('❌ Utente non trovato', 'error');
        return;
    }

    const modal = createModal(
        '🗑️ Elimina Utente',
        `Sei sicuro di voler eliminare l'utente "<strong>${user.email}</strong>"?`,
        [
            {
                label: 'Annulla',
                className: 'btn-secondary'
            },
            {
                label: 'Elimina',
                className: 'btn-danger',
                onClick: async () => {
                    try {
                        // 🔑 Elimina dal backend
                        await deleteUserFromDB(userId);
                        
                        // Elimina da localStorage
                        adminDB.deleteUser(userId);
                        showNotification('✅ Utente eliminato', 'success');
                        await loadUsers();
                    } catch (error) {
                        console.error('❌ Errore eliminazione utente:', error);
                        showNotification(`Errore: ${error.message}`, 'error');
                    }
                }
            }
        ]
    );
    document.body.appendChild(modal);
}

// ===== ANALYTICS =====

function loadAnalytics() {
    const globalStats = calculateGlobalStats();

    const elements = {
        totalStudios: document.getElementById('totalStudios'),
        totalUsers: document.getElementById('totalUsers'),
        analyticsRecordings: document.getElementById('analyticsRecordings'),
        storageUsed: document.getElementById('storageUsed')
    };

    if (elements.totalStudios) elements.totalStudios.textContent = globalStats.totalStudios;
    if (elements.totalUsers) elements.totalUsers.textContent = globalStats.totalUsers;
    if (elements.analyticsRecordings) elements.analyticsRecordings.textContent = globalStats.totalRecordings;
    if (elements.storageUsed) elements.storageUsed.textContent = globalStats.storageUsed;

    console.log('✅ Analytics caricati:', globalStats);
}

// ===== PROFILE MANAGEMENT =====

function loadProfile() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    if (!session || !session.userId) {
        console.warn('❌ Sessione non trovata');
        return;
    }

    const profileElements = {
        profileName: document.getElementById('profileName'),
        profileEmail: document.getElementById('profileEmail'),
        profilePassword: document.getElementById('profilePassword'),
        profileNewPassword: document.getElementById('profileNewPassword'),
        profileConfirmPassword: document.getElementById('profileConfirmPassword')
    };

    if (profileElements.profileName) profileElements.profileName.value = session.name || '';
    if (profileElements.profileEmail) profileElements.profileEmail.value = session.email || '';
    if (profileElements.profilePassword) profileElements.profilePassword.value = '';
    if (profileElements.profileNewPassword) profileElements.profileNewPassword.value = '';
    if (profileElements.profileConfirmPassword) profileElements.profileConfirmPassword.value = '';

    console.log('✅ Profilo caricato dalla sessione');
}

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

        showNotification('✅ Profilo salvato completamente!', 'success');

    } catch (error) {
        console.error('❌ Errore nel salvataggio del profilo:', error);
        showNotification('❌ Errore nel salvataggio: ' + error.message, 'error');
    }
}

function resetProfile() {
    loadProfile();
    showNotification('↩️ Modifiche annullate', 'info');
}

// ===== TEAM MANAGEMENT =====

async function loadTeam() {
    const tableBody = document.getElementById('teamTableBody');
    if (!tableBody) {
        console.error('❌ Elemento teamTableBody non trovato');
        return;
    }

    try {
        // 🔑 CHIAMA IL BACKEND PER CARICARE GLI ADMIN
        let admins = await fetchAdminsFromDB();

        if (admins.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div class="empty-state" style="margin: 0;">
                            <div class="empty-icon">🤝</div>
                            <h3>Nessun Amministratore</h3>
                            <p>Aggiungi il tuo primo amministratore</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = admins.map(admin => `
            <tr data-admin-id="${admin.id}">
                <td>${admin.name || '-'}</td>
                <td class="admin-email">${admin.email}</td>
                <td><span class="admin-role-badge ${admin.role}" data-role="${admin.role}">${getAdminRoleLabel(admin.role)}</span></td>
                <td><span class="admin-status-badge ${admin.status}">${getUserStatusLabel(admin.status)}</span></td>
                <td>${formatAdminDate(admin.created_at)}</td>
                <td>
                    <div class="team-table-actions">
                        ${admin.role !== 'super_admin' ? `
                            <button class="btn-small" onclick="editAdmin('${admin.id}')">✏️ Modifica</button>
                            <button class="btn-small" onclick="openResetPasswordModal('${admin.id}', '${admin.email}')">🔑 Reset</button>
                            <button class="btn-small btn-danger" onclick="confirmDeleteAdmin('${admin.id}', '${admin.name}')">🗑️ Elimina</button>
                        ` : `
                            <span style="color: var(--text-light); font-size: 0.85em;">Super Admin</span>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('❌ Errore caricamento team:', error);
        showNotification('Errore nel caricamento del team', 'error');
    }
}

function openNewAdminModal() {
    const modal = document.getElementById('newAdminModal');
    if (modal) {
        modal.style.display = 'flex';
        clearNewAdminForm();
    }
}

function closeNewAdminModal() {
    const modal = document.getElementById('newAdminModal');
    if (modal) {
        modal.style.display = 'none';
        clearNewAdminForm();
    }
}

function clearNewAdminForm() {
    const elements = {
        newAdminName: document.getElementById('newAdminName'),
        newAdminEmail: document.getElementById('newAdminEmail'),
        newAdminPassword: document.getElementById('newAdminPassword'),
        newAdminRole: document.getElementById('newAdminRole')
    };

    if (elements.newAdminName) elements.newAdminName.value = '';
    if (elements.newAdminEmail) elements.newAdminEmail.value = '';
    if (elements.newAdminPassword) elements.newAdminPassword.value = '';
    if (elements.newAdminRole) elements.newAdminRole.value = 'admin';
}

async function createNewAdmin() {
    const nameEl = document.getElementById('newAdminName');
    const emailEl = document.getElementById('newAdminEmail');
    const passwordEl = document.getElementById('newAdminPassword');
    const roleEl = document.getElementById('newAdminRole');

    if (!nameEl || !emailEl || !passwordEl || !roleEl) {
        showNotification('❌ Errore: elementi form mancanti', 'error');
        return;
    }

    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const role = roleEl.value;

    if (!name || !email || !password) {
        showNotification('⚠️ Compila tutti i campi', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('⚠️ Email non valida', 'error');
        return;
    }

    if (adminDB.getAdminByEmail(email)) {
        showNotification('⚠️ Questo email è già in uso', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showNotification('⚠️ Password deve avere almeno 6 caratteri', 'error');
        return;
    }

    try {
        // 🔑 CREA NEL BACKEND
        await createAdminInDB({
            name: name,
            email: email,
            password: password,
            role: role
        });

        // Crea anche in localStorage
        adminDB.addAdmin({
            name: name,
            email: email,
            password: password,
            role: role
        });

        showNotification('✅ Amministratore aggiunto con successo!', 'success');
        closeNewAdminModal();
        await loadTeam();

    } catch (error) {
        console.error('❌ Errore creazione admin:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}

function editAdmin(adminId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'editAdminModal';
    
    const admin = adminDB.getAdminById(adminId);
    if (!admin) {
        showNotification('❌ Amministratore non trovato', 'error');
        return;
    }

    modal.innerHTML = `
        <div class="modal-overlay" onclick="document.getElementById('editAdminModal').remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">✏️ Modifica Amministratore</h2>
                <button class="modal-close" onclick="document.getElementById('editAdminModal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editAdminId" value="${adminId}">
                <div class="form-group">
                    <label for="editAdminName">Nome Completo:</label>
                    <input type="text" id="editAdminName" class="input-field" value="${admin.name || ''}">
                </div>
                <div class="form-group">
                    <label for="editAdminRole">Ruolo:</label>
                    <select id="editAdminRole" class="input-field">
                        <option value="admin" ${admin.role === 'admin' ? 'selected' : ''}>Amministratore</option>
                        <option value="super_admin" ${admin.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="document.getElementById('editAdminModal').remove()">Annulla</button>
                <button class="btn-primary" onclick="saveAdminChanges('${adminId}')">Salva</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function saveAdminChanges(adminId) {
    const nameEl = document.getElementById('editAdminName');
    const roleEl = document.getElementById('editAdminRole');

    if (!nameEl || !roleEl) {
        showNotification('❌ Errore: elementi form mancanti', 'error');
        return;
    }

    try {
        const data = {
            name: nameEl.value.trim(),
            role: roleEl.value,
            status: 'active'
        };

        // 🔑 Aggiorna nel backend
        await updateAdminInDB(adminId, data);

        // Aggiorna in localStorage
        adminDB.updateAdmin(adminId, data);
        showNotification('✅ Amministratore aggiornato con successo', 'success');
        document.getElementById('editAdminModal').remove();
        await loadTeam();

    } catch (error) {
        console.error('❌ Errore aggiornamento admin:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}

function openResetPasswordModal(adminId, adminEmail) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'resetPasswordModal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="document.getElementById('resetPasswordModal').remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">🔑 Reset Password</h2>
                <button class="modal-close" onclick="document.getElementById('resetPasswordModal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Reset password per: <strong>${adminEmail}</strong></p>
                <div class="form-group">
                    <label for="resetPassword">Nuova Password:</label>
                    <input type="password" id="resetPassword" class="input-field" placeholder="Inserisci nuova password">
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="document.getElementById('resetPasswordModal').remove()">Annulla</button>
                <button class="btn-primary" onclick="confirmResetPassword('${adminId}')">Reset Password</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmResetPassword(adminId) {
    const passwordEl = document.getElementById('resetPassword');
    const newPassword = passwordEl.value.trim();

    if (!newPassword) {
        showNotification('⚠️ Inserisci una password', 'error');
        return;
    }

    if (!validatePassword(newPassword)) {
        showNotification('⚠️ Password deve avere almeno 6 caratteri', 'error');
        return;
    }

    try {
        // 🔑 Reset nel backend
        await resetPasswordInDB(adminId, newPassword);

        // Aggiorna in localStorage
        const admin = adminDB.getAdminById(adminId);
        if (admin) {
            admin.password = newPassword;
            adminDB.updateAdmin(adminId, admin);
        }

        showNotification('✅ Password resetata con successo', 'success');
        document.getElementById('resetPasswordModal').remove();
        await loadTeam();

    } catch (error) {
        console.error('❌ Errore reset password:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}

async function confirmDeleteAdmin(adminId, adminName) {
    const modal = createModal(
        '🗑️ Elimina Amministratore',
        `Sei sicuro di voler eliminare l'amministratore "<strong>${adminName}</strong>"? Questa azione non può essere annullata.`,
        [
            {
                label: 'Annulla',
                className: 'btn-secondary'
            },
            {
                label: 'Elimina',
                className: 'btn-danger',
                onClick: async () => {
                    try {
                        // 🔑 Elimina dal backend
                        await deleteAdminFromDB(adminId);

                        // Elimina da localStorage
                        if (!adminDB.deleteAdmin(adminId)) {
                            showNotification('❌ Impossibile eliminare questo amministratore', 'error');
                            return;
                        }

                        showNotification('✅ Amministratore eliminato', 'success');
                        await loadTeam();

                    } catch (error) {
                        console.error('❌ Errore eliminazione admin:', error);
                        showNotification(`Errore: ${error.message}`, 'error');
                    }
                }
            }
        ]
    );
    document.body.appendChild(modal);
}

// ===== NEW STUDIO MODAL =====

function openNewStudioModal() {
    const modal = document.getElementById('newStudioModal');
    if (modal) {
        modal.style.display = 'flex';
        clearNewStudioForm();
    }
}

function closeNewStudioModal() {
    const modal = document.getElementById('newStudioModal');
    if (modal) {
        modal.style.display = 'none';
        clearNewStudioForm();
    }
}

function clearNewStudioForm() {
    const elements = {
        modalStudioName: document.getElementById('modalStudioName'),
        modalStudioEmail: document.getElementById('modalStudioEmail'),
        modalStudioPhone: document.getElementById('modalStudioPhone'),
        modalStudioAdminEmail: document.getElementById('modalStudioAdminEmail'),
        modalStudioAdminPassword: document.getElementById('modalStudioAdminPassword')
    };

    Object.values(elements).forEach(el => {
        if (el) el.value = '';
    });
}

async function createNewStudio() {
    const nameEl = document.getElementById('modalStudioName');
    const emailEl = document.getElementById('modalStudioEmail');
    const phoneEl = document.getElementById('modalStudioPhone');
    const adminEmailEl = document.getElementById('modalStudioAdminEmail');
    const adminPasswordEl = document.getElementById('modalStudioAdminPassword');

    if (!nameEl || !emailEl || !phoneEl || !adminEmailEl || !adminPasswordEl) {
        showNotification('❌ Errore: elementi form mancanti', 'error');
        return;
    }

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();
    const adminEmail = adminEmailEl.value.trim();
    const adminPassword = adminPasswordEl.value;

    if (!name || !email || !phone || !adminEmail || !adminPassword) {
        showNotification('⚠️ Compila tutti i campi', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('⚠️ Email studio non valida', 'error');
        return;
    }

    if (!validateEmail(adminEmail)) {
        showNotification('⚠️ Email admin non valida', 'error');
        return;
    }

    if (!validatePassword(adminPassword)) {
        showNotification('⚠️ Password deve avere almeno 6 caratteri', 'error');
        return;
    }

    try {
        // 🔑 STEP 1: CREA STUDIO NEL BACKEND
        const createdStudio = await createStudioInDB({
            name: name,
            email: email,
            phone: phone
        });
        console.log('✅ Studio creato nel DB:', createdStudio);

        // 🔑 STEP 2: CREA ADMIN UTENTE NEL BACKEND
        await createUserInDB({
            email: adminEmail,
            password: adminPassword,
            name: name + ' Admin',
            studio_id: createdStudio.id,
            role: 'admin'
        });
        console.log('✅ Admin utente creato nel DB');

        // Aggiungi il nuovo studio a loadedStudios
        loadedStudios.push(createdStudio);

        showNotification('✅ Studio e admin creati con successo!', 'success');
        closeNewStudioModal();
        await loadStudios();

    } catch (error) {
        console.error('❌ Errore creazione studio:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}