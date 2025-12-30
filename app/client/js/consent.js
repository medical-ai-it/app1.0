/**
 * ============================================================================
 * Consent Management - Iubenda Consent Database Integration
 * API HTTP privata di Iubenda
 * ============================================================================
 */

const IUBENDA_CONFIG = {
    api_key: "d8Vck5CPVzs2oWHoKyOt4hG3YOwrzvat",
    consent_api: "https://consent.iubenda.com/consent",
    subjects_api: "https://consent.iubenda.com/subjects"
};

/**
 * Invia i consensi a Iubenda tramite API HTTP privata
 */
async function sendConsentToIubenda() {
    try {
        const privacyChecked = document.getElementById('privacyConsent')?.checked || false;
        const termsChecked = document.getElementById('termsConsent')?.checked || false;

        // Recupera l'utente loggato
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userEmail = currentUser.email || `user_${Date.now()}@example.com`;
        const userName = currentUser.name || 'Utente';
        const [firstName, lastName] = userName.split(' ');

        // Usa email come subject ID
        const subjectId = userEmail;

        console.log('📤 Invio consensi a Iubenda API HTTP:', {
            subject_id: subjectId,
            email: userEmail,
            first_name: firstName,
            last_name: lastName,
            privacy_policy: privacyChecked,
            terms_conditions: termsChecked
        });

        // Prepara il payload secondo la documentazione Iubenda API HTTP
        const consentPayload = {
            subject: {
                id: subjectId,
                email: userEmail,
                first_name: firstName || 'Utente',
                last_name: lastName || '',
                verified: false
            },
            legal_notices: [
                {
                    identifier: "privacy_policy",
                    version: 1
                },
                {
                    identifier: "terms_conditions",
                    version: 1
                }
            ],
            preferences: {
                privacy_policy: privacyChecked,
                terms_conditions: termsChecked
            },
            proofs: [
                {
                    content: privacyChecked ? "Accettato" : "Non accettato",
                    form: "Privacy Policy Checkbox"
                },
                {
                    content: termsChecked ? "Accettato" : "Non accettato",
                    form: "Terms & Conditions Checkbox"
                }
            ],
            autodetect_ip_address: true
        };

        // Invia il consenso a Iubenda
        const response = await fetch(IUBENDA_CONFIG.consent_api, {
            method: 'POST',
            headers: {
                'ApiKey': IUBENDA_CONFIG.api_key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(consentPayload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Consenso salvato in Iubenda Consent Database:', data);
            
            // Salva nel localStorage come backup
            const consentData = {
                privacy_policy: privacyChecked,
                terms_conditions: termsChecked,
                timestamp: new Date().toISOString(),
                subject_id: subjectId,
                email: userEmail,
                iubenda_consent_id: data.id
            };
            localStorage.setItem('iubenda_consent', JSON.stringify(consentData));

            return true;
        } else {
            const errorData = await response.json();
            console.error('❌ Errore Iubenda API:', response.status, errorData);
            return false;
        }
    } catch (error) {
        console.error('❌ Errore nell\'invio dei consensi:', error);
        return false;
    }
}

/**
 * Apri modal Privacy Policy
 */
function openPrivacyPolicy() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('📄 Privacy Policy modal aperto');
    }
}

/**
 * Chiudi modal Privacy Policy
 */
function closePrivacyPolicy() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Apri modal Termini e Condizioni
 */
function openTermsConditions() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('📋 Termini e Condizioni modal aperto');
    }
}

/**
 * Chiudi modal Termini e Condizioni
 */
function closeTermsConditions() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Accetta Privacy Policy
 */
function acceptPrivacy() {
    const checkbox = document.getElementById('privacyConsent');
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }
    closePrivacyPolicy();
    console.log('✅ Privacy Policy accettata');
}

/**
 * Accetta Termini e Condizioni
 */
function acceptTerms() {
    const checkbox = document.getElementById('termsConsent');
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }
    closeTermsConditions();
    console.log('✅ Termini e Condizioni accettati');
}

/**
 * Verifica se entrambi i consensi sono stati accettati
 */
function areAllConsentsAccepted() {
    const privacyConsent = document.getElementById('privacyConsent');
    const termsConsent = document.getElementById('termsConsent');
    
    const privacy = privacyConsent ? privacyConsent.checked : false;
    const terms = termsConsent ? termsConsent.checked : false;
    
    return privacy && terms;
}

/**
 * Recupera lo stato dei consensi
 */
function getConsentsStatus() {
    return {
        privacy_policy: document.getElementById('privacyConsent')?.checked || false,
        terms_conditions: document.getElementById('termsConsent')?.checked || false
    };
}

/**
 * Mostra/nascondi errore di consenso
 */
function showConsentError(show = true) {
    const errorElement = document.getElementById('consentError');
    if (errorElement) {
        errorElement.style.display = show ? 'block' : 'none';
        if (show) {
            console.warn('⚠️ Consensi non accettati - Devi accettare Privacy Policy e Termini & Condizioni');
        }
    }
}

/**
 * Event listener per quando il consenso cambia
 */
document.addEventListener('DOMContentLoaded', () => {
    const privacyCheckbox = document.getElementById('privacyConsent');
    const termsCheckbox = document.getElementById('termsConsent');

    // Listener per Privacy Policy checkbox
    if (privacyCheckbox) {
        privacyCheckbox.addEventListener('change', async () => {
            validateConsents();
            await sendConsentToIubenda();
        });
    }

    // Listener per Terms checkbox
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', async () => {
            validateConsents();
            await sendConsentToIubenda();
        });
    }

    // Carica i consensi salvati se disponibili
    loadSavedConsents();
});

/**
 * Carica i consensi salvati al primo caricamento
 */
function loadSavedConsents() {
    const savedConsents = localStorage.getItem('iubenda_consent');
    if (savedConsents) {
        try {
            const consents = JSON.parse(savedConsents);
            if (consents.privacy_policy) {
                const privacyCheckbox = document.getElementById('privacyConsent');
                if (privacyCheckbox) privacyCheckbox.checked = true;
            }
            if (consents.terms_conditions) {
                const termsCheckbox = document.getElementById('termsConsent');
                if (termsCheckbox) termsCheckbox.checked = true;
            }
            console.log('📥 Consensi caricati da localStorage');
        } catch (error) {
            console.error('❌ Errore nel caricamento dei consensi:', error);
        }
    }
}

/**
 * Valida i consensi e mostra/nascondi errore
 */
function validateConsents() {
    const allAccepted = areAllConsentsAccepted();
    showConsentError(!allAccepted);
}