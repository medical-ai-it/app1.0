// ============================================================================
// Admin Utilities - Medical AI
// Database simulato + Funzioni utility per stats e formatting
// ============================================================================

// Database simulato per admin (fallback quando backend non disponibile)
const adminDB = {
    studios: [],
    users: [],
    recordings: [],
    admins: [
        {
            id: 'admin-001',
            name: 'Amministratore Principale',
            email: 'digitalandmoreit@gmail.com',
            password: 'admin123',
            role: 'super_admin',
            createdAt: new Date().toISOString(),
            status: 'attivo'
        }
    ],

    // ===== STUDIO MANAGEMENT =====
    addStudio(data) {
        const studio = {
            id: generateUniqueId(),
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: 'attivo',
            createdAt: new Date().toISOString()
        };
        this.studios.push(studio);
        return studio;
    },

    getStudioById(id) {
        return this.studios.find(s => s.id === id);
    },

    updateStudio(id, data) {
        const studio = this.getStudioById(id);
        if (studio) {
            Object.assign(studio, data);
        }
        return studio;
    },

    deleteStudio(id) {
        this.studios = this.studios.filter(s => s.id !== id);
        this.users = this.users.filter(u => u.studioId !== id);
    },

    getAllStudios() {
        return this.studios;
    },

    // ===== USER MANAGEMENT =====
    addUser(data) {
        const user = {
            id: generateUniqueId(),
            email: data.email,
            password: data.password,
            name: data.name || '',
            studioId: data.studioId,
            role: data.role || 'utente',
            status: 'attivo',
            createdAt: new Date().toISOString()
        };
        this.users.push(user);
        return user;
    },

    getUserById(id) {
        return this.users.find(u => u.id === id);
    },

    updateUser(id, data) {
        const user = this.getUserById(id);
        if (user) {
            Object.assign(user, data);
        }
        return user;
    },

    deleteUser(id) {
        this.users = this.users.filter(u => u.id !== id);
    },

    getAllUsers() {
        return this.users;
    },

    // ===== ADMIN MANAGEMENT =====
    addAdmin(data) {
        const admin = {
            id: generateUniqueId(),
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role || 'admin',
            status: 'attivo',
            createdAt: new Date().toISOString()
        };
        this.admins.push(admin);
        return admin;
    },

    getAdminById(id) {
        return this.admins.find(a => a.id === id);
    },

    getAdminByEmail(email) {
        return this.admins.find(a => a.email === email.toLowerCase());
    },

    updateAdmin(id, data) {
        const admin = this.getAdminById(id);
        if (admin) {
            Object.assign(admin, data);
        }
        return admin;
    },

    deleteAdmin(id) {
        // Non permettere di eliminare il super_admin
        const admin = this.getAdminById(id);
        if (admin && admin.role === 'super_admin') {
            return false;
        }
        this.admins = this.admins.filter(a => a.id !== id);
        return true;
    },

    getAllAdmins() {
        return this.admins;
    },

    validateAdmin(email, password) {
        // Valida l'admin dal login
        const admin = this.getAdminByEmail(email);
        if (admin && admin.password === password) {
            return admin;
        }
        return null;
    },

    // ===== RECORDING MANAGEMENT =====
    addRecording(data) {
        const recording = {
            id: generateUniqueId(),
            studioId: data.studioId,
            userId: data.userId,
            patientName: data.patientName,
            patientEmail: data.patientEmail,
            patientPhone: data.patientPhone,
            duration: data.duration || 0,
            timestamp: new Date().toISOString()
        };
        this.recordings.push(recording);
        return recording;
    },

    getRecordingsByStudio(studioId) {
        return this.recordings.filter(r => r.studioId === studioId);
    },

    getRecordingsByUser(userId) {
        return this.recordings.filter(r => r.userId === userId);
    }
};

// ============================================================================
// UTILITY FUNCTIONS - Stats & Calculations
// ============================================================================

/**
 * Calcola statistiche di uno studio
 * @param {string} studioId - ID dello studio
 * @returns {object} Stats con totalRecordings, uniquePatients, totalHours, recordings
 */
function calculateStudioStats(studioId) {
    const studioRecordings = adminDB.recordings.filter(r => r.studioId === studioId) || [];
    const uniquePatients = new Set(studioRecordings.map(r => r.patientEmail)).size;
    const totalHours = Math.round(studioRecordings.reduce((acc, r) => acc + (r.duration || 0), 0) / 3600);

    return {
        totalRecordings: studioRecordings.length,
        uniquePatients: uniquePatients,
        totalHours: totalHours,
        recordings: studioRecordings
    };
}

/**
 * Calcola statistiche di un utente
 * @param {string} userId - ID dell'utente
 * @returns {object} Stats con monthlyRecordings, totalMinutes
 */
function calculateUserStats(userId) {
    const userRecordings = adminDB.recordings.filter(r => r.userId === userId) || [];
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    const monthlyRecordings = userRecordings.filter(r => {
        const recordingDate = new Date(r.timestamp);
        return recordingDate >= monthAgo && recordingDate <= now;
    }).length;

    const totalMinutes = Math.round(userRecordings.reduce((acc, r) => acc + (r.duration || 0), 0) / 60);

    return {
        monthlyRecordings: monthlyRecordings,
        totalMinutes: totalMinutes
    };
}

/**
 * Calcola statistiche globali della piattaforma
 * @returns {object} Stats globali
 */
function calculateGlobalStats() {
    const totalStudios = adminDB.studios.length;
    const totalUsers = adminDB.users.length;
    const totalRecordings = adminDB.recordings.length;
    const totalDuration = adminDB.recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
    const totalHours = Math.round(totalDuration / 3600);
    const totalMinutes = Math.round((totalDuration % 3600) / 60);

    return {
        totalStudios: totalStudios,
        totalUsers: totalUsers,
        totalRecordings: totalRecordings,
        totalHours: totalHours,
        totalMinutes: totalMinutes,
        storageUsed: (totalDuration / (1024 * 1024 * 1024)).toFixed(2) + ' GB' // Approssimazione
    };
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formatta una data in italiano
 * @param {string} dateString - Data in formato ISO
 * @returns {string} Data formattata
 */
function formatAdminDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('it-IT', options);
}

/**
 * Formatta un timestamp in formato leggibile
 * @param {string} timestamp - Timestamp ISO
 * @returns {string} Data e ora formattate
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('it-IT');
    const dateStr = date.toLocaleDateString('it-IT');
    return `${dateStr} ${time}`;
}

/**
 * Formatta secondi in ore e minuti
 * @param {number} seconds - Secondi
 * @returns {string} Formato "Xh Ym" o "Xm"
 */
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// ============================================================================
// LABEL FUNCTIONS - Status & Role Badges
// ============================================================================

/**
 * Ritorna l'etichetta dello status dello studio
 * @param {string} status - Status del studio
 * @returns {string} Etichetta leggibile
 */
function getStudioStatusLabel(status) {
    const statusMap = {
        'attivo': 'Attivo',
        'active': 'Attivo',
        'inattivo': 'Inattivo',
        'inactive': 'Inattivo',
        'sospeso': 'Sospeso',
        'suspended': 'Sospeso',
        'deleted': 'Eliminato'
    };
    return statusMap[status] || status;
}

/**
 * Ritorna l'etichetta dello status utente
 * @param {string} status - Status dell'utente
 * @returns {string} Etichetta leggibile
 */
function getUserStatusLabel(status) {
    const statusMap = {
        'attivo': 'Attivo',
        'active': 'Attivo',
        'inattivo': 'Inattivo',
        'inactive': 'Inattivo',
        'sospeso': 'Sospeso',
        'suspended': 'Sospeso',
        'deleted': 'Eliminato'
    };
    return statusMap[status] || status;
}

/**
 * Ritorna l'etichetta del ruolo utente
 * @param {string} role - Ruolo dell'utente
 * @returns {string} Etichetta leggibile
 */
function getUserRoleLabel(role) {
    const roleMap = {
        'admin': 'Amministratore',
        'utente': 'Utente',
        'user': 'Utente',
        'operatore': 'Operatore',
        'operator': 'Operatore'
    };
    return roleMap[role] || role;
}

/**
 * Ritorna l'etichetta del ruolo amministratore
 * @param {string} role - Ruolo dell'amministratore
 * @returns {string} Etichetta leggibile
 */
function getAdminRoleLabel(role) {
    const roleMap = {
        'super_admin': 'Super Amministratore',
        'admin': 'Amministratore',
        'moderator': 'Moderatore',
        'moderatore': 'Moderatore'
    };
    return roleMap[role] || role;
}

// ============================================================================
// COLOR & CSS HELPER FUNCTIONS
// ============================================================================

/**
 * Ritorna la classe CSS per lo status
 * @param {string} status - Status
 * @returns {string} Classe CSS
 */
function getStatusClass(status) {
    const classMap = {
        'attivo': 'status-active',
        'active': 'status-active',
        'inattivo': 'status-inactive',
        'inactive': 'status-inactive',
        'sospeso': 'status-suspended',
        'suspended': 'status-suspended',
        'deleted': 'status-deleted'
    };
    return classMap[status] || 'status-default';
}

/**
 * Ritorna il colore per un status
 * @param {string} status - Status
 * @returns {string} Colore hex
 */
function getStatusColor(status) {
    const colorMap = {
        'attivo': '#26A69A',
        'active': '#26A69A',
        'inattivo': '#FBC02D',
        'inactive': '#FBC02D',
        'sospeso': '#EF5350',
        'suspended': '#EF5350',
        'deleted': '#757575'
    };
    return colorMap[status] || '#999999';
}