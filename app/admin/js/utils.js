// Utility functions per admin

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('it-IT', options);
}

function formatTime(seconds) {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
        box-shadow: var(--shadow-lg);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, var(--success-color) 0%, #26A69A 100%)';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, var(--danger-color) 0%, #E53935 100%)';
        notification.style.color = 'white';
    } else {
        notification.style.background = 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)';
        notification.style.color = 'white';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function createModal(title, message, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.innerHTML = `
        <h2 class="modal-title">${title}</h2>
        <p>${message}</p>
    `;
    
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'modal-actions';
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.label;
        button.className = btn.className || 'btn-secondary';
        button.addEventListener('click', () => {
            if (btn.onClick) btn.onClick();
            modal.remove();
        });
        actionsContainer.appendChild(button);
    });
    
    content.appendChild(actionsContainer);
    overlay.appendChild(content);
    modal.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) modal.remove();
    });
    
    return modal;
}

function getStoredStudioInfo() {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    return {
        name: session.name || 'Studio',
        email: session.email || 'email@studio.com'
    };
}