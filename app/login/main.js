/**
 * ============================================================================
 * Medical AI Login - Backend Authentication
 * Autentica admin e studio users dal database
 * ============================================================================
 */

// Determina l'URL base in base all'ambiente
const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://app1-0-m2yf.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Login page initialized');
    console.log('📍 Backend URL:', BACKEND_URL);
    
    // 🔑 CONTROLLA SESSIONE SOLO SE SIAMO SULLA LOGIN PAGE
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login') && !currentPath.includes('reset-password');
    
    console.log('📍 Current path:', currentPath);
    console.log('📍 Is login page:', isLoginPage);
    
    if (isLoginPage) {
        checkExistingSession();
    }
    
    // Setup form listeners
    setupLoginForm();
    setupForgotPasswordForm();
});

/**
 * Controlla se esiste una sessione valida
 * Se c'è, reindirizza verso la dashboard corretta
 * ⚠️ SOLO SULLA LOGIN PAGE
 */
function checkExistingSession() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    if (!session || !session.userId || !session.userType) {
        console.log('❌ Nessuna sessione trovata');
        return;
    }
    
    console.log('✅ Sessione trovata:', session.userType);
    
    // Verifica veloce senza loop infinito
    if (session.userType === 'admin') {
        console.log('👤 Admin trovato - redirect a admin dashboard');
        window.location.href = '../admin/index.html';
    } else if (session.userType === 'studio') {
        console.log('🏥 Studio trovato - redirect a client dashboard');
        window.location.href = '../client/index.html';
    }
}

/**
 * Setup form di login
 */
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ loginForm element not found!');
        return;
    }

    console.log('✅ Login form found, attaching event listener');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📤 Form submitted');

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        console.log('📝 Email:', email);
        console.log('🔐 Password length:', password.length);
        console.log('☑️ Remember me:', rememberMe);

        // Validazione
        if (!email || !password) {
            showError('Compila tutti i campi');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Email non valida');
            return;
        }

        showLoading(true);
        console.log('⏳ Sending login request to:', BACKEND_URL + '/auth/login');

        try {
            // 🔑 CHIAMA BACKEND PER LOGIN
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('📥 Response received:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('📊 Response data:', result);

            if (!response.ok) {
                console.error('❌ Login failed:', result.error);
                showError(result.error || 'Login fallito');
                showLoading(false);
                return;
            }

            if (result.success) {
                console.log('✅ Login successful:', result.role);
                console.log('👤 User data:', result.data);
                
                // 🔑 SALVA SESSIONE SICURA
                const session = {
                    userId: result.data.id,
                    email: result.data.email,
                    name: result.data.name,
                    role: result.data.role,
                    userType: result.role,  // 🔑 IMPORTANTE: 'admin' o 'studio'
                    loginTime: new Date().toISOString(),
                    rememberMe: rememberMe
                };

                // 🔑 Aggiungi dati studio per studio users
                if (result.role === 'studio') {
                    session.studioId = result.data.studio_id;
                    session.studioName = result.data.studio_name;
                    console.log('🏥 Studio user detected - studio_id:', result.data.studio_id);
                }

                console.log('📌 Sessione salvata:', session);
                localStorage.setItem('userSession', JSON.stringify(session));
                
                if (rememberMe) {
                    localStorage.setItem('rememberMe', email);
                }

                showNotification('✅ Login effettuato!');
                
                // Reindirizza IMMEDIATAMENTE
                setTimeout(() => {
                    const redirectPath = result.role === 'admin' 
                        ? '../admin/index.html' 
                        : '../client/index.html';
                    
                    console.log('🔄 Reindirizzamento verso:', redirectPath);
                    window.location.href = redirectPath;
                }, 500);
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            showError('Errore di connessione. Verifica il backend.');
            showLoading(false);
        }
    });

    // Pre-popola email se "Ricordami" era abilitato
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe) {
        document.getElementById('email').value = rememberMe;
        if (document.getElementById('rememberMe')) {
            document.getElementById('rememberMe').checked = true;
        }
        console.log('📧 Pre-filled email from "Remember me":', rememberMe);
    }
}

/**
 * Setup form password dimenticata
 */
function setupForgotPasswordForm() {
    const forgotLink = document.querySelector('.forgot-password');
    if (!forgotLink) return;

    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
}

/**
 * Mostra modal recupero password
 */
function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'forgot-password-modal';
    modal.id = 'forgotModal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeForgotPasswordModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>🔑 Recupera Password</h2>
                <button class="modal-close" onclick="closeForgotPasswordModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Inserisci la tua email per ricevere un link di reset della password</p>
                <div class="form-group">
                    <input type="email" id="forgotEmail" placeholder="La tua email" class="input-field">
                </div>
                <div id="forgotMessage" class="form-message"></div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeForgotPasswordModal()">Annulla</button>
                <button class="btn-primary" onclick="sendPasswordReset()">Invia Link Reset</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Abilita invio al premere Enter
    document.getElementById('forgotEmail').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendPasswordReset();
    });
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.remove();
}

/**
 * Invia richiesta reset password
 * ✅ AGGIORNATA: Usa BACKEND_URL dinamico
 */
async function sendPasswordReset() {
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const messageEl = document.getElementById('forgotMessage');

    if (!email || !isValidEmail(email)) {
        messageEl.className = 'form-message error';
        messageEl.textContent = '⚠️ Email non valida';
        return;
    }

    try {
        console.log('📧 Sending password reset request for:', email);
        
        const response = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        console.log('📊 Password reset response:', result);

        if (result.success) {
            messageEl.className = 'form-message success';
            messageEl.textContent = '✅ Link di reset inviato all\'email';
            
            // DEBUG: Mostra token (rimuovere in produzione)
            if (result.resetToken) {
                console.log('🔑 DEBUG - Reset Token:', result.resetToken);
                console.log('Link reset:', `https://medical-ai.it/app/login/reset-password.html?token=${result.resetToken}`);
            }

            setTimeout(() => closeForgotPasswordModal(), 3000);
        } else {
            messageEl.className = 'form-message error';
            messageEl.textContent = '❌ ' + (result.error || 'Errore');
        }
    } catch (error) {
        console.error('❌ Password reset error:', error);
        messageEl.className = 'form-message error';
        messageEl.textContent = '❌ Errore di connessione';
    }
}

/**
 * Mostra errore
 */
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (!errorEl) return;
    
    errorEl.textContent = message;
    errorEl.classList.add('show');

    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

/**
 * Mostra notifica
 */
function showNotification(message) {
    const notifEl = document.createElement('div');
    notifEl.className = 'notification success';
    notifEl.textContent = message;
    document.body.appendChild(notifEl);

    setTimeout(() => notifEl.remove(), 3000);
}

/**
 * Mostra/nascondi loading
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const form = document.getElementById('loginForm');
    
    if (!spinner || !form) return;
    
    if (show) {
        spinner.style.display = 'flex';
        form.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        form.style.display = 'flex';
    }
}

/**
 * Valida email
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Logout
 */
function logout() {
    localStorage.removeItem('userSession');
    window.location.href = './index.html';
}