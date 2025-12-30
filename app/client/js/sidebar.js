/**
 * ============================================================================
 * Sidebar Dinamica - Dynamic Sidebar Loading
 * ============================================================================
 * Gestisce la navigazione della sidebar per index.html e referto.html
 */

async function loadSidebar() {
    try {
        const response = await fetch('./components/sidebar.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const sidebarContainer = document.getElementById('sidebarContainer');
        
        if (sidebarContainer) {
            sidebarContainer.innerHTML = html;
            console.log('✅ Sidebar caricata con successo');
            
            // Wait for DOM update, then setup listeners
            await new Promise(resolve => setTimeout(resolve, 50));
            setupSidebarNavigationListeners();
        }
    } catch (error) {
        console.error('❌ Errore caricamento sidebar:', error);
        // Fallback sidebar inline
        createFallbackSidebar();
    }
}

/**
 * Rileva se siamo nella pagina referto o dashboard
 */
function isRefertoPage() {
    return window.location.pathname.includes('referto.html') || 
           document.querySelector('.referto-container') !== null;
}

/**
 * Setup event listeners per la navigazione della sidebar
 */
function setupSidebarNavigationListeners() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (navLinks.length === 0) {
        console.warn('⚠️ Nessun nav-link trovato nel sidebar');
        return;
    }
    
    const isReferto = isRefertoPage();
    console.log(`📍 Pagina rilevata: ${isReferto ? 'REFERTO' : 'DASHBOARD'}`);
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const pageName = link.getAttribute('data-page');
            if (!pageName) {
                console.warn('⚠️ data-page attribute mancante');
                return;
            }
            
            console.log(`🔗 Click su: ${pageName}`);
            
            // ✅ CONVERSAZIONI: Sempre apri in nuova scheda
            if (pageName === 'conversations') {
                openConversations(e);
                return;
            }
            
            // ✅ REFERTO PAGE: Reindirizza a index.html
            if (isReferto) {
                console.log(`📄 Torno a index.html dal referto...`);
                window.location.href = 'index.html';
                return;
            }
            
            // ✅ DASHBOARD PAGE: Usa showPage() se disponibile
            if (typeof showPage === 'function') {
                // Rimuovi active da tutti i link
                navLinks.forEach(l => l.classList.remove('active'));
                // Aggiungi active al link cliccato
                link.classList.add('active');
                
                // Mostra la pagina selezionata
                showPage(pageName);
                
                // Reload page-specific data
                reloadPageData(pageName);
                
                console.log(`📄 Pagina cambiata a: ${pageName}`);
            } else {
                console.warn('⚠️ showPage() non trovata, reindirizzamento a index.html');
                window.location.href = 'index.html';
            }
        });
    });
    
    // ✅ Set first link as active by default (SOLO se in dashboard)
    if (!isReferto) {
        const firstLink = navLinks[0];
        if (firstLink && !firstLink.classList.contains('active')) {
            firstLink.classList.add('active');
        }
    }
    
    console.log('✅ Sidebar event listeners configurati');
}

/**
 * Ricarica i dati specifici della pagina selezionata
 */
function reloadPageData(pageName) {
    try {
        switch(pageName) {
            case 'history':
                if (typeof loadHistoryList === 'function') {
                    loadHistoryList();
                }
                break;
                
            case 'patients':
                if (typeof loadPatientsList === 'function') {
                    loadPatientsList();
                }
                break;
                
            case 'recording':
                if (typeof loadPatientsIntoDropdown === 'function') {
                    loadPatientsIntoDropdown();
                }
                break;
                
            case 'guide':
                console.log('📖 Guida aperta');
                break;
                
            case 'profile':
                if (typeof loadProfileData === 'function') {
                    loadProfileData();
                }
                break;
                
            default:
                console.warn(`⚠️ Pagina non riconosciuta: ${pageName}`);
        }
    } catch (error) {
        console.warn(`⚠️ Errore nel caricamento dati per ${pageName}:`, error.message);
    }
}

/**
 * Apri Conversazioni (link esterno)
 */
function openConversations(event) {
    event.preventDefault();
    console.log('💬 Apertura pagina Conversazioni...');
    
    // Apri in nuova scheda
    window.open('https://conversation.medical-ai.it', '_blank');
}

/**
 * Sidebar fallback se il caricamento da file fallisce
 */
function createFallbackSidebar() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <aside class="sidebar">
                <nav class="sidebar-nav">
                    <a href="#" class="nav-link active" data-page="patients">
                        <i class="fas fa-users"></i>
                        <span class="nav-label">Pazienti</span>
                    </a>
                    <a href="#" class="nav-link" data-page="recording">
                        <i class="fas fa-microphone"></i>
                        <span class="nav-label">Registrazioni</span>
                    </a>
                    <a href="#" class="nav-link" data-page="history">
                        <i class="fas fa-history"></i>
                        <span class="nav-label">Storico</span>
                    </a>
                    <a href="#" class="nav-link" data-page="conversations" onclick="openConversations(event)">
                        <i class="fas fa-comments"></i>
                        <span class="nav-label">Conversazioni</span>
                    </a>
                    <a href="#" class="nav-link" data-page="guide">
                        <i class="fas fa-book"></i>
                        <span class="nav-label">Guida</span>
                    </a>
                    <a href="#" class="nav-link" data-page="profile">
                        <i class="fas fa-cog"></i>
                        <span class="nav-label">Profilo</span>
                    </a>
                </nav>
            </aside>
        `;
        console.log('⚠️ Sidebar fallback creato');
        
        // Setup listeners per il fallback (senza await)
        setTimeout(() => {
            setupSidebarNavigationListeners();
        }, 50);
    }
}