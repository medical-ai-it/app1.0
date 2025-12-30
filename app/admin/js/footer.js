/**
 * ============================================================================
 * Admin Footer Manager - Dynamic Footer Loading
 * ============================================================================
 */

async function loadAdminFooter() {
    try {
        const response = await fetch('./components/footer.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const footerContainer = document.getElementById('adminFooterContainer');
        
        if (footerContainer) {
            footerContainer.innerHTML = html;
            console.log('✅ Admin footer caricato con successo');
        }
    } catch (error) {
        console.error('❌ Errore caricamento footer:', error);
        // Fallback footer inline
        createFallbackAdminFooter();
    }
}

/**
 * Subscribe to newsletter
 */
function subscribeAdminNewsletter(event) {
    event.preventDefault();
    
    const emailInput = event.target.querySelector('input[type="email"]');
    const email = emailInput?.value;
    
    if (!email) {
        alert('Per favore inserisci un\'email valida');
        return;
    }
    
    console.log('📧 Newsletter subscription:', email);
    
    // Salva subscription
    const subscriptions = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
    if (!subscriptions.includes(email)) {
        subscriptions.push(email);
        localStorage.setItem('newsletter_subscriptions', JSON.stringify(subscriptions));
    }
    
    // Reset form
    emailInput.value = '';
    
    // Mostra notifica
    showAdminNotification('Iscrizione newsletter completata!', 'success');
}

/**
 * Show notification
 */
function showAdminNotification(message, type = 'info') {
    // Create notification element if doesn't exist
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        padding: 15px 20px;
        border-radius: 8px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Admin footer fallback
 */
function createFallbackAdminFooter() {
    const footerContainer = document.getElementById('adminFooterContainer');
    if (footerContainer) {
        footerContainer.innerHTML = `
            <footer class="app-footer">
                <div class="footer-wrapper">
                    <div class="footer-bottom">
                        <div class="footer-bottom-left">
                            <p class="footer-copyright">
                                &copy; 2025 <strong>Medical AI</strong>. Admin Panel. Tutti i diritti riservati.
                            </p>
                        </div>
                        <div class="footer-bottom-center">
                            <div class="footer-badges">
                                <span class="badge"><i class="fas fa-lock"></i> Sicuro</span>
                                <span class="badge"><i class="fas fa-shield-alt"></i> Protetto</span>
                                <span class="badge"><i class="fas fa-check-circle"></i> Verificato</span>
                            </div>
                        </div>
                        <div class="footer-bottom-right">
                            <p class="footer-version">v1.0 - Medical AI Admin Dashboard</p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
        console.log('⚠️ Admin footer fallback creato');
    }
}

/**
 * Add CSS animation for notifications
 */
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
})();