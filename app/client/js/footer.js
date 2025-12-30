/**
 * ============================================================================
 * Footer Dinamico - Dynamic Footer Loading
 * ============================================================================
 */

async function loadFooter() {
    try {
        const response = await fetch('./components/footer.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const footerContainer = document.getElementById('footerContainer');
        
        if (footerContainer) {
            footerContainer.innerHTML = html;
            console.log('✅ Footer caricato con successo');
        }
    } catch (error) {
        console.error('❌ Errore caricamento footer:', error);
        // Fallback footer inline
        createFallbackFooter();
    }
}

/**
 * Footer fallback se il caricamento da file fallisce
 */
function createFallbackFooter() {
    const footerContainer = document.getElementById('footerContainer');
    if (footerContainer) {
        footerContainer.innerHTML = `
            <footer class="footer">
                <div class="footer-content">
                    <p>&copy; 2025 Studio Dentistico AI. Tutti i diritti riservati.</p>
                    <div class="footer-links">
                        <a href="#" onclick="openPrivacyPolicy(); return false;">Privacy Policy</a>
                        <span class="separator">•</span>
                        <a href="#" onclick="openTermsConditions(); return false;">Termini e Condizioni</a>
                    </div>
                </div>
            </footer>
        `;
        console.log('⚠️ Footer fallback creato');
    }
}