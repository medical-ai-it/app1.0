/**
 * ============================================================================
 * Admin Header Manager - Dynamic Header Loading & Navigation
 * ============================================================================
 */

async function loadAdminHeader() {
    try {
        const response = await fetch('./components/header.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const headerContainer = document.getElementById('adminHeaderContainer');
        
        if (headerContainer) {
            headerContainer.innerHTML = html;
            console.log('✅ Admin header caricato con successo');
            
            // Wait for DOM update
            await new Promise(resolve => setTimeout(resolve, 50));
            setupAdminHeaderEventListeners();
            populateAdminHeaderWithInfo();
            updateHeaderStats();
        }
    } catch (error) {
        console.error('❌ Errore caricamento header:', error);
        createFallbackAdminHeader();
    }
}

/**
 * Setup event listeners per l'admin header
 */
function setupAdminHeaderEventListeners() {
    console.log('🔧 Setup header event listeners...');
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleAdminLogout();
        });
        
        console.log('✅ Logout button event listener configurato');
    } else {
        console.warn('⚠️ Logout button non trovato');
    }
}

/**
 * Popola l'admin header con informazioni
 */
function populateAdminHeaderWithInfo() {
    const adminSession = getAdminSession();
    
    // Elementi header
    const headerUserEmail = document.getElementById('headerUserEmail');
    const headerLogo = document.getElementById('headerLogo');
    
    // Popola email admin
    if (headerUserEmail) {
        headerUserEmail.textContent = adminSession?.email || 'admin@medical-ai.it';
    }
    
    // Carica logo
    if (headerLogo) {
        headerLogo.src = 'https://medical-ai.it/assets/images/logo.png';
        headerLogo.onerror = () => {
            console.warn('⚠️ Logo non caricato, usando fallback');
            headerLogo.style.backgroundColor = '#0061b1';
            headerLogo.style.color = 'white';
            headerLogo.textContent = 'MA';
        };
        console.log('✅ Logo Medical AI caricato nell\'admin header');
    }
    
    console.log('✅ Admin header popolato con dati');
}

/**
 * Update header statistics from adminDB
 */
function updateHeaderStats() {
    const headerStudioCount = document.getElementById('headerStudioCount');
    const headerUserCount = document.getElementById('headerUserCount');
    const headerRecordingCount = document.getElementById('headerRecordingCount');
    
    // Verifica se adminDB è disponibile
    if (typeof adminDB !== 'undefined') {
        if (headerStudioCount) {
            headerStudioCount.textContent = adminDB.studios?.length || '0';
        }
        
        if (headerUserCount) {
            headerUserCount.textContent = adminDB.users?.length || '0';
        }
        
        if (headerRecordingCount) {
            headerRecordingCount.textContent = adminDB.recordings?.length || '0';
        }
        
        console.log('✅ Header stats aggiornati');
    }
}

/**
 * Navigate to admin pages - CORE FUNCTION
 */
function navigateAdminTo(page) {
    console.log(`📄 Navigazione admin a: ${page}`);
    
    // Save current page
    localStorage.setItem('currentAdminPage', page);
    
    // Hide all pages
    const pages = document.querySelectorAll('[id$="Page"]');
    pages.forEach(p => p.style.display = 'none');
    
    // Show requested page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.style.display = 'block';
        pageElement.style.animation = 'fadeIn 0.3s ease';
        console.log(`✅ Pagina visibile: ${page}Page`);
        
        // Load page-specific data
        loadPageData(page);
    } else {
        console.warn(`⚠️ Pagina non trovata: ${page}Page`);
    }
    
    // Update sidebar highlight
    updateSidebarActiveState(page);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Update sidebar active state
 */
function updateSidebarActiveState(page) {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('onclick')?.match(/navigateAdminTo\('(\w+)'\)/)?.[1] ||
                        link.getAttribute('data-page');
        
        if (linkPage === page) {
            link.classList.add('active');
            console.log(`✅ Sidebar aggiornato: ${page}`);
        }
    });
}

/**
 * Load page-specific data
 */
function loadPageData(page) {
    switch(page) {
        case 'studios':
            if (typeof loadStudios === 'function') {
                loadStudios();
                updateHeaderStats();
            }
            break;
        case 'users':
            if (typeof loadUsers === 'function') {
                loadUsers();
                updateHeaderStats();
            }
            break;
        case 'analytics':
            if (typeof loadAnalytics === 'function') {
                loadAnalytics();
            }
            break;
        case 'profile':
            if (typeof loadProfile === 'function') {
                loadProfile();
            }
            break;
        case 'team':
            if (typeof loadTeam === 'function') {
                loadTeam();
                updateHeaderStats();
            }
            break;
        case 'settings':
            console.log('📋 Settings page loaded');
            break;
        default:
            console.log(`⚠️ Nessun caricamento dati per: ${page}`);
    }
}

/**
 * Handle admin logout
 */
function handleAdminLogout() {
    console.log('🚪 Admin logout in corso...');
    
    const confirmed = confirm('Sei sicuro di voler uscire dal pannello admin?');
    
    if (confirmed) {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('currentAdminPage');
        localStorage.removeItem('userSession');
        localStorage.removeItem('newsletter_subscriptions');
        
        console.log('✅ Sessione admin terminata');
        
        if (typeof showNotification === 'function') {
            showNotification('Logout effettuato. Arrivederci!', 'success');
        }
        
        setTimeout(() => {
            window.location.href = '../login/index.html';
        }, 500);
    } else {
        console.log('❌ Logout annullato');
    }
}

/**
 * Get admin session from localStorage
 */
function getAdminSession() {
    try {
        let session = localStorage.getItem('adminSession');
        if (session) {
            return JSON.parse(session);
        }
        
        session = localStorage.getItem('userSession');
        if (session) {
            return JSON.parse(session);
        }
        
        return { 
            email: 'admin@medical-ai.it', 
            role: 'admin',
            name: 'Amministratore'
        };
    } catch (error) {
        console.error('❌ Errore lettura sessione admin:', error);
        return { 
            email: 'admin@medical-ai.it', 
            role: 'admin',
            name: 'Amministratore'
        };
    }
}

/**
 * Admin header fallback
 */
function createFallbackAdminHeader() {
    const headerContainer = document.getElementById('adminHeaderContainer');
    if (headerContainer) {
        headerContainer.innerHTML = `
            <header class="app-header">
                <div class="header-content">
                    <div class="header-left">
                        <img id="headerLogo" class="header-logo" src="https://medical-ai.it/assets/images/logo.png" alt="Medical AI" style="height: 50px; width: auto;">
                        <div class="admin-panel-badge">
                            <i class="fas fa-shield-alt"></i>
                            <span>Admin Panel</span>
                        </div>
                        <div class="header-divider"></div>
                        <div class="admin-info">
                            <span class="admin-label">Pannello Amministrativo</span>
                            <span class="admin-version">v1.0</span>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="header-stats">
                            <div class="stat-badge">
                                <i class="fas fa-hospital"></i>
                                <span id="headerStudioCount">0</span>
                                <label>Studio</label>
                            </div>
                            <div class="stat-badge">
                                <i class="fas fa-users"></i>
                                <span id="headerUserCount">0</span>
                                <label>Utenti</label>
                            </div>
                            <div class="stat-badge">
                                <i class="fas fa-microphone"></i>
                                <span id="headerRecordingCount">0</span>
                                <label>Registrazioni</label>
                            </div>
                        </div>
                        <div class="header-divider-vertical"></div>
                        <div class="header-user-info">
                            <span class="user-label">Amministratore:</span>
                            <span id="headerUserEmail" class="user-email">admin@medical-ai.it</span>
                        </div>
                        <button id="logoutBtn" class="btn-logout" title="Esci dal pannello">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Esci</span>
                        </button>
                    </div>
                </div>
            </header>
        `;
        console.log('⚠️ Admin header fallback creato');
        
        setTimeout(() => {
            setupAdminHeaderEventListeners();
            populateAdminHeaderWithInfo();
            updateHeaderStats();
        }, 50);
    }
}