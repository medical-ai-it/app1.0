/**
 * ============================================================================
 * Admin Sidebar Manager - Dynamic Sidebar Loading
 * ============================================================================
 */

async function loadAdminSidebar() {
    try {
        const response = await fetch('./components/sidebar.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const sidebarContainer = document.getElementById('adminSidebarContainer');
        
        if (sidebarContainer) {
            sidebarContainer.innerHTML = html;
            console.log('✅ Admin sidebar caricato con successo');
            
            // Wait for DOM update
            await new Promise(resolve => setTimeout(resolve, 50));
            setupAdminSidebarEventListeners();
            highlightCurrentAdminPage();
        }
    } catch (error) {
        console.error('❌ Errore caricamento sidebar:', error);
        // Fallback sidebar inline
        createFallbackAdminSidebar();
    }
}

/**
 * Setup event listeners per la sidebar
 */
function setupAdminSidebarEventListeners() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Get page name from onclick or data attribute
            const page = link.getAttribute('onclick')?.match(/navigateAdminTo\('(\w+)'\)/)?.[1] ||
                        link.getAttribute('data-page');
            
            if (page) {
                console.log(`📄 Sidebar link cliccato: ${page}`);
                navigateAdminTo(page);
            }
        });
    });
    
    console.log('✅ Admin sidebar event listeners configurati');
}

/**
 * Highlight current page in sidebar
 */
function highlightCurrentAdminPage() {
    const currentPage = localStorage.getItem('currentAdminPage') || 'studios';
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        
        // Check if link matches current page
        const linkPage = link.getAttribute('onclick')?.match(/navigateAdminTo\('(\w+)'\)/)?.[1] ||
                        link.getAttribute('data-page');
        
        if (linkPage === currentPage) {
            link.classList.add('active');
            console.log(`✅ Sidebar evidenziato: ${currentPage}`);
        }
    });
}

/**
 * Show admin page and update sidebar
 */
function showAdminPage(page) {
    // Save current page
    localStorage.setItem('currentAdminPage', page);
    
    // Hide all pages
    const pages = document.querySelectorAll('[id$="Page"]');
    pages.forEach(p => p.style.display = 'none');
    
    // Show requested page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.style.display = 'block';
        console.log(`✅ Pagina visibile: ${page}Page`);
    }
    
    // Update sidebar highlight
    highlightCurrentAdminPage();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Admin sidebar fallback
 */
function createFallbackAdminSidebar() {
    const sidebarContainer = document.getElementById('adminSidebarContainer');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <aside class="app-sidebar">
                <nav class="sidebar-nav">
                    <div class="sidebar-menu">
                        <h3 class="sidebar-menu-title">
                            <i class="fas fa-cog"></i>
                            Gestione
                        </h3>
                        <ul class="sidebar-menu-list">
                            <li><a href="#" class="sidebar-link active" onclick="navigateAdminTo('studios'); return false;"><i class="fas fa-hospital"></i> <span>Studio</span></a></li>
                            <li><a href="#" class="sidebar-link" onclick="navigateAdminTo('users'); return false;"><i class="fas fa-users"></i> <span>Utenti</span></a></li>
                            <li><a href="#" class="sidebar-link" onclick="navigateAdminTo('team'); return false;"><i class="fas fa-user-tie"></i> <span>Team</span></a></li>
                        </ul>
                    </div>

                    <div class="sidebar-menu">
                        <h3 class="sidebar-menu-title">
                            <i class="fas fa-chart-bar"></i>
                            Analytics
                        </h3>
                        <ul class="sidebar-menu-list">
                            <li><a href="#" class="sidebar-link" onclick="navigateAdminTo('analytics'); return false;"><i class="fas fa-chart-line"></i> <span>Dashboard</span></a></li>
                        </ul>
                    </div>

                    <div class="sidebar-menu">
                        <h3 class="sidebar-menu-title">
                            <i class="fas fa-sliders-h"></i>
                            Configurazione
                        </h3>
                        <ul class="sidebar-menu-list">
                            <li><a href="#" class="sidebar-link" onclick="navigateAdminTo('profile'); return false;"><i class="fas fa-user-circle"></i> <span>Profilo</span></a></li>
                            <li><a href="#" class="sidebar-link" onclick="navigateAdminTo('settings'); return false;"><i class="fas fa-cog"></i> <span>Impostazioni</span></a></li>
                        </ul>
                    </div>

                    <div class="sidebar-menu">
                        <h3 class="sidebar-menu-title">
                            <i class="fas fa-info-circle"></i>
                            Supporto
                        </h3>
                        <ul class="sidebar-menu-list">
                            <li><a href="https://docs.medical-ai.it" target="_blank" class="sidebar-link"><i class="fas fa-book"></i> <span>Documentazione</span></a></li>
                            <li><a href="https://support.medical-ai.it" target="_blank" class="sidebar-link"><i class="fas fa-life-ring"></i> <span>Supporto</span></a></li>
                        </ul>
                    </div>
                </nav>
            </aside>
        `;
        console.log('⚠️ Admin sidebar fallback creato');
        
        // Wait for DOM update
        setTimeout(() => {
            setupAdminSidebarEventListeners();
            highlightCurrentAdminPage();
        }, 50);
    }
}