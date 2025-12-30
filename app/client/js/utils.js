function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('it-IT', options).format(date);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
    const re = /^[0-9\s\-\+\(\)]{9,}$/;
    return re.test(String(phone));
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '9999';
    notification.style.animation = 'slideIn 0.3s ease-in';
    
    if (type === 'success') {
        notification.style.background = '#27ae60';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.background = '#e74c3c';
        notification.style.color = 'white';
    } else if (type === 'info') {
        notification.style.background = '#3498db';
        notification.style.color = 'white';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/* ===== SESSION MANAGEMENT ===== */

function getUserSession() {
    const sessionJson = localStorage.getItem('userSession');
    return sessionJson ? JSON.parse(sessionJson) : null;
}

function storeUserSession(session) {
    localStorage.setItem('userSession', JSON.stringify(session));
}

function removeUserSession() {
    localStorage.removeItem('userSession');
}

function isUserLoggedIn() {
    return getUserSession() !== null;
}

function getStoredUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

function storeUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function removeStoredUser() {
    localStorage.removeItem('currentUser');
}

/* ===== STUDIO INFO MANAGEMENT ===== */

function getStoredStudioInfo() {
    const studioJson = localStorage.getItem('studioInfo');
    return studioJson ? JSON.parse(studioJson) : null;
}

function storeStudioInfo(studioInfo) {
    localStorage.setItem('studioInfo', JSON.stringify(studioInfo));
}

function updateHeaderWithStudioInfo() {
    const studioInfo = getStoredStudioInfo();
    if (studioInfo) {
        const studioNameEl = document.querySelector('.studio-name');
        const studioEmailEl = document.querySelector('.studio-email');
        const headerLogoEl = document.querySelector('.header-logo');
        
        if (studioNameEl) studioNameEl.textContent = studioInfo.name || 'Studio';
        if (studioEmailEl) studioEmailEl.textContent = studioInfo.email || '';
        if (headerLogoEl && studioInfo.logo) {
            headerLogoEl.src = studioInfo.logo;
            headerLogoEl.style.display = 'block';
        }
    }
}

/* ===== RECORDINGS MANAGEMENT ===== */

function getStoredRecordings() {
    const recordingsJson = localStorage.getItem('recordings');
    return recordingsJson ? JSON.parse(recordingsJson) : [];
}

function storeRecording(recording) {
    const recordings = getStoredRecordings();
    recordings.push(recording);
    localStorage.setItem('recordings', JSON.stringify(recordings));
}

function removeRecording(recordingId) {
    const recordings = getStoredRecordings();
    const filtered = recordings.filter(r => r.id !== recordingId);
    localStorage.setItem('recordings', JSON.stringify(filtered));
}

/* ===== PATIENTS MANAGEMENT ===== */

function getAllPatients() {
    const patientsJson = localStorage.getItem('patients_database');
    return patientsJson ? JSON.parse(patientsJson) : [];
}

function getPatientById(patientId) {
    const patients = getAllPatients();
    return patients.find(p => p.id === patientId);
}

/* ===== UTILITY FUNCTIONS ===== */

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}