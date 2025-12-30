/**
 * ============================================================================
 * Header Dinamico - Dynamic Header Loading
 * ============================================================================
 */

async function loadHeader() {
    try {
        const response = await fetch('./components/header.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const headerContainer = document.getElementById('headerContainer');
        
        if (headerContainer) {
            headerContainer.innerHTML = html;
            console.log('✅ Header caricato con successo');
            
            // Wait for DOM update
            await new Promise(resolve => setTimeout(resolve, 50));
            setupHeaderEventListeners();
            populateHeaderWithStudioInfo();
        }
    } catch (error) {
        console.error('❌ Errore caricamento header:', error);
        // Fallback header inline
        createFallbackHeader();
    }
}

/**
 * Setup event listeners per l'header
 */
function setupHeaderEventListeners() {
    // Profile menu button
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileMenuBtn && profileDropdown) {
        profileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
            console.log('✅ Profile menu toggleato');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileMenuBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });

        // Close dropdown when clicking on a dropdown item
        const dropdownItems = profileDropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                profileDropdown.classList.remove('active');
            });
        });

        console.log('✅ Profile menu button listeners aggiunti');
    }
}

/**
 * Popola l'header con informazioni dello studio
 */
function populateHeaderWithStudioInfo() {
    const session = getUserSession();
    const studioInfo = getStoredStudioInfo();
    
    // Elementi header
    const headerStudioName = document.getElementById('headerStudioName');
    const headerStudioEmail = document.getElementById('headerStudioEmail');
    const headerUserEmail = document.getElementById('headerUserEmail');
    const headerLogo = document.getElementById('headerLogo');
    
    // Popola nome studio
    if (headerStudioName) {
        headerStudioName.textContent = studioInfo?.name || session?.studioName || 'Studio Dentistico';
    }
    
    // Popola email studio
    if (headerStudioEmail) {
        headerStudioEmail.textContent = studioInfo?.email || session?.email || 'studio@example.com';
    }
    
    // Popola email utente
    if (headerUserEmail) {
        headerUserEmail.textContent = session?.email || 'utente@example.com';
    }
    
    // Carica logo se disponibile
    if (headerLogo) {
        if (studioInfo?.logo) {
            headerLogo.src = studioInfo.logo;
            headerLogo.style.display = 'block';
            console.log('✅ Logo studio caricato');
        } else {
            // Default Medical AI logo
            headerLogo.src = 'https://medical-ai.it/assets/images/logo.png';
            headerLogo.style.display = 'block';
            console.log('✅ Logo Medical AI caricato come default');
        }
    }
    
    console.log('✅ Header popolato con dati studio');
}

/**
 * Navigate to different pages
 */
function navigateTo(page) {
    event.preventDefault();
    console.log('📄 Navigazione a:', page);
    
    switch(page) {
        case 'profile':
            showDashboardPage('profile');
            break;
        case 'consumi':
            showDashboardPage('consumi');
            break;
        case 'settings':
            showDashboardPage('settings');
            break;
        default:
            console.warn('⚠️ Pagina non riconosciuta:', page);
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    console.log('🚪 Logout in corso...');
    
    // Confirm logout
    if (confirm('Sei sicuro di voler uscire?')) {
        // Clear session data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userSession');
        
        console.log('✅ Sessione terminata');
        
        // Redirect to login
        window.location.href = '../login/index.html';
    }
}

/**
 * Header fallback se il caricamento da file fallisce
 */
function createFallbackHeader() {
    const headerContainer = document.getElementById('headerContainer');
    if (headerContainer) {
        headerContainer.innerHTML = `
            <header class="app-header">
                <div class="header-content">
                    <div class="header-left">
                        <img id="headerLogo" class="header-logo" src="https://medical-ai.it/assets/images/logo.png" alt="Medical AI" style="height: 50px; width: auto;">
                        <h1 class="app-title">Medical AI</h1>
                    </div>
                    <div class="header-right">
                        <div class="studio-info">
                            <div class="studio-details">
                                <span id="headerStudioName" class="studio-name">Studio</span>
                                <span id="headerStudioEmail" class="studio-email">email@studio.com</span>
                            </div>
                        </div>
                        <div class="header-actions">
                            <div class="header-user-info">
                                <span class="user-label">Utente:</span>
                                <span id="headerUserEmail" class="user-email">user@studio.com</span>
                            </div>
                            <div class="profile-menu-container">
                                <button id="profileMenuBtn" class="btn-profile">
                                    <i class="fas fa-user"></i>
                                    <span>Profilo</span>
                                </button>
                                <div id="profileDropdown" class="profile-dropdown">
                                    <a href="#" class="dropdown-item" onclick="navigateTo('profile')">
                                        <i class="fas fa-user-circle"></i>
                                        <span>Profilo</span>
                                    </a>
                                    <a href="#" class="dropdown-item" onclick="navigateTo('consumi')">
                                        <i class="fas fa-chart-bar"></i>
                                        <span>Consumi</span>
                                    </a>
                                    <a href="#" class="dropdown-item" onclick="navigateTo('settings')">
                                        <i class="fas fa-cog"></i>
                                        <span>Impostazioni</span>
                                    </a>
                                    <div class="dropdown-divider"></div>
                                    <a href="#" class="dropdown-item logout-item" onclick="handleLogout()">
                                        <i class="fas fa-sign-out-alt"></i>
                                        <span>Esci</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
        console.log('⚠️ Header fallback creato');
        
        // Wait for DOM update
        setTimeout(() => {
            setupHeaderEventListeners();
            populateHeaderWithStudioInfo();
        }, 50);
    }
}