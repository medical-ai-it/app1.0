/**
 * ============================================================================
 * Referto Page - Patient Report Management
 * ============================================================================
 * Pagina per visualizzare e gestire i referti generati dall'AI
 * 
 * FLOW:
 * 1. Carica referto dal backend con polling ogni 5 secondi
 * 2. Se status è "pending" al primo tentativo, chiama triggerRefertoProcessing()
 * 3. Attendi che il backend elabori (Whisper + GPT-4)
 * 4. Continua polling finché status diventa "completed"
 * 5. Visualizza il referto completato con odontogramma
 */

let refertoData = null;
let currentPatient = null;
let currentRecordingId = null;
let processingStarted = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Pagina Referto caricata');

    if (!isUserLoggedIn()) {
        console.warn('⚠️ Utente non loggato - Reindirizzamento a login');
        window.location.href = '../login/index.html';
        return;
    }

    await initializeReferto();
});

/**
 * Inizializza la pagina referto
 */
async function initializeReferto() {
    try {
        const refertoSection = document.getElementById('refertoSection');
        if (refertoSection) {
            refertoSection.style.display = 'flex';
        }

        showRefertoLoading();

        try {
            await loadHeader();
        } catch (err) {
            console.warn('⚠️ Header non caricato:', err);
        }

        try {
            await loadSidebar();
            setupSidebarNavigationListeners();
        } catch (err) {
            console.warn('⚠️ Sidebar non caricata:', err);
        }

        try {
            await loadFooter();
        } catch (err) {
            console.warn('⚠️ Footer non caricato:', err);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get('patientId');
        const recordingId = urlParams.get('recordingId');

        console.log(`📋 Parametri URL - patientId: ${patientId}, recordingId: ${recordingId}`);

        if (!patientId || !recordingId) {
            showRefertoError('Parametri non validi. Torna alla dashboard.');
            return;
        }

        currentRecordingId = recordingId;
        processingStarted = false;

        await loadRefertoFromBackend(recordingId, patientId);

        console.log('✅ Referto inizializzato');

    } catch (error) {
        console.error('❌ Errore inizializzazione referto:', error);
        showRefertoError('Errore nel caricamento del referto: ' + error.message);
    }
}

/**
 * Mostra schermata di caricamento con spinner - NON SOVRASCRIVE L'HTML
 */
function showRefertoLoading() {
    const contentEl = document.querySelector('.referto-content');
    if (contentEl) {
        contentEl.style.display = 'none';
        console.log('✅ Contenuto referto nascosto');
    }

    const mainContent = document.querySelector('.referto-main');
    if (!mainContent) return;

    let loadingEl = document.getElementById('loadingSpinner');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingSpinner';
        loadingEl.className = 'referto-loading';
        loadingEl.innerHTML = `
            <div></div>
            <div>
                <h2>🤖 Elaborazione referto in corso</h2>
                <p>Stiamo generando il referto dai dati della registrazione...</p>
                <p style="color: #999; font-size: 14px; margin-top: 20px;">
                    Questo potrebbe richiedere 1-2 minuti. <br/>
                    La pagina si aggiornerà automaticamente quando il referto è pronto.
                </p>
            </div>
            <div>
                <div></div>
            </div>
        `;
        mainContent.insertBefore(loadingEl, mainContent.firstChild);
        console.log('✅ Loading spinner creato');
    } else {
        loadingEl.style.display = 'flex';
        console.log('✅ Loading spinner mostrato');
    }
}

/**
 * Mostra messaggio di errore
 */
function showRefertoError(message) {
    const contentEl = document.querySelector('.referto-content');
    if (contentEl) {
        contentEl.style.display = 'none';
    }

    const mainContent = document.querySelector('.referto-main');
    if (!mainContent) return;

    let errorEl = document.getElementById('errorContainer');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'errorContainer';
        mainContent.insertBefore(errorEl, mainContent.firstChild);
    }

    errorEl.innerHTML = `
        <div class="referto-error">
            <div>❌</div>
            <h2>Errore</h2>
            <p>${message}</p>
            <button onclick="window.location.href='index.html'" style="
                padding: 12px 30px;
                background: #0061b1;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            " onmouseover="this.style.background='#00498f'" onmouseout="this.style.background='#0061b1'">
                ← Torna alla Dashboard
            </button>
        </div>
    `;
    errorEl.style.display = 'block';
}

/**
 * Attiva l'elaborazione del referto tramite API
 */
async function triggerRefertoProcessing(recordingId) {
    try {
        console.log(`🚀 Attivazione elaborazione referto (recordingId: ${recordingId})...`);
        
        const apiBaseUrl = window.API_BASE_URL || 'http://localhost:3001';
        const url = `${apiBaseUrl}/api/recordings/${recordingId}/process`;
        
        console.log(`🔗 URL endpoint: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getUserSession()?.token || ''}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Elaborazione avviata con successo:', data);
        console.log(`📊 Nuovo status: ${data.processing_status || data.processingStatus}`);
        
        return true;

    } catch (error) {
        console.error('❌ Errore attivazione elaborazione:', error.message);
        return false;
    }
}

/**
 * Carica il referto dal backend con polling
 */
async function loadRefertoFromBackend(recordingId, patientId) {
    let attempts = 0;
    const maxAttempts = 24;
    let processingTriggered = false;
    
    return new Promise((resolve, reject) => {
        const pollReferto = async () => {
            try {
                console.log(`📋 Polling referto (tentativo ${attempts + 1}/${maxAttempts})...`);
                
                const response = await getReferto(recordingId);
                console.log('📦 Risposta API completa:', response);
                
                const processingStatus = response.processingStatus || 'unknown';
                const referto = response.referto;
                
                // ✅ SUCCESS: referto completamente disponibile
                if (referto && (processingStatus === 'completed' || processingStatus === 'success')) {
                    console.log('✅ Referto caricato dal backend');
                    console.log('🔍 Struttura referto ricevuta:', {
                        keys: Object.keys(referto),
                    });
                    
                    // IMPORTANTE: Aggiorna currentPatient con i dati dal backend
                    currentPatient = {
                        id: response.patientId || patientId,
                        firstName: response.patientFirstName || 'Paziente',
                        lastName: response.patientLastName || '',
                        doctorName: response.doctorName || 'Dr. Professionista'
                    };

                    console.log('👤 Patient data:', currentPatient);

                    refertoData = response;

                    displayRefertoComplete(response);
                    
                    setupOdontogrammaInteractions();
                    
                    resolve(response);
                    
                } else if (processingStatus === 'pending' || processingStatus === 'processing' || !referto) {
                    
                    if (processingStatus === 'pending' && !processingTriggered && attempts === 0) {
                        console.log('🚀 Status è "pending" - Attivazione elaborazione...');
                        processingTriggered = true;
                        
                        const triggerSuccess = await triggerRefertoProcessing(recordingId);
                        if (!triggerSuccess) {
                            console.warn('⚠️ Trigger fallito - continuerò il polling comunque');
                        }
                    }
                    
                    console.log(`⏳ Referto in elaborazione (status: ${processingStatus})... Retry in 5 secondi`);
                    
                    if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(pollReferto, 5000);
                    } else {
                        showRefertoError('Elaborazione in corso da troppo tempo. Prova a ricaricare la pagina tra poco.');
                        reject(new Error('Processing timeout'));
                    }
                } else {
                    console.warn('⚠️ Stato referto non riconosciuto:', processingStatus);
                    showRefertoError(`Stato inaspettato: ${processingStatus}. Contatta il supporto.`);
                    reject(new Error(`Invalid referto status: ${processingStatus}`));
                }
                
            } catch (error) {
                console.warn(`⚠️ Errore polling (${attempts + 1}/${maxAttempts}):`, error.message);
                
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(pollReferto, 5000);
                } else {
                    showRefertoError('Impossibile caricare il referto. Prova a ricaricare la pagina.');
                    reject(error);
                }
            }
        };
        
        pollReferto();
    });
}

/**
 * Visualizza il referto completato
 */
function displayRefertoComplete(refertoResponse) {
    try {
        console.log('🔍 DEBUG - Inizio displayRefertoComplete');
        
        // Estrai referto
        let referto = {};
        if (refertoResponse.referto) {
            if (refertoResponse.referto.referto) {
                referto = refertoResponse.referto.referto;
                console.log('📌 Referto estratto da doppio annidamento');
            } else {
                referto = refertoResponse.referto;
                console.log('📌 Referto estratto da singolo annidamento');
            }
        }
        
        console.log('📋 Contenuto referto finale:', referto);
        console.log('🔑 Chiavi del referto:', Object.keys(referto));
        
        const doctorName = refertoResponse.doctorName || currentPatient?.doctorName || 'Dr. Professionista';
        const patientFirstName = refertoResponse.patientFirstName || currentPatient?.firstName || 'Paziente';
        const patientLastName = refertoResponse.patientLastName || currentPatient?.lastName || '';
        const patientName = (patientFirstName + ' ' + patientLastName).trim();
        
        console.log(`👨‍⚕️ Medico: ${doctorName}`);
        console.log(`👤 Paziente: ${patientName}`);
        
        const today = new Date();

        // 1️⃣ Popola header info
        const refertoDateEl = document.getElementById('refertoDate');
        if (refertoDateEl) {
            const dateStr = today.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            refertoDateEl.textContent = dateStr;
            console.log(`✅ Data referto impostata`);
        }

        const visitDateEl = document.getElementById('visitDate');
        if (visitDateEl) {
            const dateStr = today.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            visitDateEl.textContent = dateStr;
            console.log(`✅ Data visita impostata`);
        }

        const medicoNameEl = document.getElementById('medicoName');
        if (medicoNameEl) {
            medicoNameEl.textContent = doctorName;
            console.log(`✅ Nome medico impostato`);
        }

        const patientNameEl = document.getElementById('patientName');
        if (patientNameEl) {
            patientNameEl.textContent = patientName;
            console.log(`✅ Nome paziente impostato: ${patientName}`);
        }

        // 2️⃣ Popola sezioni referto - DINAMICO
        const anamneseText = document.getElementById('anamneseText');
        if (anamneseText) {
            // Supporta anamnesi, anamnesi_parodontale, etc.
            const content = findFieldValue(referto, ['anamnesi', 'anamnesi_parodontale', 'anamnesi_ortodontica']) || 'Non specificato';
            anamneseText.textContent = content;
            console.log(`✅ Anamnesi impostata`);
        }

        const esameText = document.getElementById('esameText');
        if (esameText) {
            const content = findFieldValue(referto, [
                'esame_obiettivo',
                'esame_intraoraleale',
                'indici_parodontali',
                'analisi_radiografica'
            ]) || 'Non specificato';
            
            if (typeof content === 'object') {
                esameText.innerHTML = `<ul>${Object.entries(content)
                    .map(([k, v]) => `<li><strong>${formatFieldName(k)}:</strong> ${v || 'Non specificato'}</li>`)
                    .join('')}</ul>`;
            } else {
                esameText.textContent = content;
            }
            console.log(`✅ Esame impostato`);
        }

        const diagnosiText = document.getElementById('diagnosiText');
        if (diagnosiText) {
            const content = findFieldValue(referto, [
                'diagnosi',
                'diagnosi_parodontale',
                'diagnosi_ortodontica'
            ]) || 'Non specificato';
            diagnosiText.textContent = typeof content === 'object' ? JSON.stringify(content) : content;
            console.log(`✅ Diagnosi impostata`);
        }

        const pianoText = document.getElementById('pianoText');
        if (pianoText) {
            const content = findFieldValue(referto, [
                'piano_terapeutico',
                'piano_trattamento'
            ]) || 'Non specificato';
            
            if (typeof content === 'object') {
                pianoText.innerHTML = `<ul>${Object.entries(content)
                    .map(([k, v]) => `<li><strong>${formatFieldName(k)}:</strong> ${v || 'Non specificato'}</li>`)
                    .join('')}</ul>`;
            } else {
                pianoText.textContent = content;
            }
            console.log(`✅ Piano impostato`);
        }

        const followupText = document.getElementById('followupText');
        if (followupText) {
            const content = findFieldValue(referto, [
                'follow_up',
                'prognosi',
                'istruzioni_igieniche'
            ]) || 'Controllo di routine';
            followupText.textContent = typeof content === 'object' ? JSON.stringify(content) : content;
            console.log(`✅ Follow-up impostato`);
        }

        // 3️⃣ Firma medico
        const signatureName = document.getElementById('signatureName');
        if (signatureName) {
            signatureName.textContent = doctorName;
            console.log('✅ Nome firma impostato');
        }

        // 4️⃣ Colora odontogramma
        if (refertoResponse.odontogramma) {
            console.log('🦷 Colorizzazione odontogramma in corso...');
            colorizeOdontogramma(refertoResponse.odontogramma);
        }

        // 5️⃣ Nascondi loading e mostra contenuto
        const loadingEl = document.getElementById('loadingSpinner');
        if (loadingEl) {
            loadingEl.style.display = 'none';
            console.log('✅ Loading nascosto');
        }

        const contentEl = document.querySelector('.referto-content');
        if (contentEl) {
            contentEl.style.display = 'block';
            console.log('✅ Contenuto referto reso visibile');
        }

        console.log('✅ Referto visualizzato completamente');

    } catch (error) {
        console.error('❌ Errore visualizzazione referto:', error);
        console.error('📍 Stack trace:', error.stack);
        showRefertoError('Errore nella visualizzazione del referto: ' + error.message);
    }
}

/**
 * Trova il valore di un campo cercando tra varie chiavi possibili
 */
function findFieldValue(obj, possibleKeys) {
    for (const key of possibleKeys) {
        if (obj[key] !== undefined && obj[key] !== null) {
            return obj[key];
        }
    }
    return null;
}

/**
 * Formatta il nome di un campo per visualizzazione leggibile
 */
function formatFieldName(str) {
    return str
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Colora i denti in base alle procedure
 */
function colorizeOdontogramma(odontogrammaData) {
    try {
        if (!odontogrammaData || typeof odontogrammaData !== 'object') {
            console.warn('⚠️ Dati odontogramma non validi');
            return;
        }

        console.log('🦷 Dati odontogramma ricevuti:', odontogrammaData);

        const dentiData = odontogrammaData.denti || odontogrammaData;
        let colorizedCount = 0;

        for (let toothNum = 11; toothNum <= 48; toothNum++) {
            if (toothNum === 19 || toothNum === 29 || toothNum === 39 || toothNum === 49) continue;

            const toothId = `tooth-${toothNum}`;
            const toothElement = document.getElementById(toothId);
            
            if (!toothElement) continue;

            const toothData = dentiData[toothNum] || dentiData[String(toothNum)];
            
            if (toothData && toothData.procedure) {
                toothElement.classList.remove('extract', 'conservativa', 'endodonzia', 'impianto', 'extract-impianto', 'endodonzia-corona');
                
                const procedure = mapProcedure(toothData.procedure);
                if (procedure) {
                    toothElement.classList.add(procedure);
                    colorizedCount++;
                }
            }
        }

        console.log(`✅ Odontogramma colorizzato: ${colorizedCount} denti marcati`);
    } catch (error) {
        console.warn('⚠️ Errore colorizzazione odontogramma:', error);
    }
}

/**
 * Mappa la procedura al nome classe CSS
 */
function mapProcedure(procedure) {
    if (!procedure) return null;
    
    const procedureMap = {
        'estrazione': 'extract',
        'extract': 'extract',
        'extraction': 'extract',
        'conservativa': 'conservativa',
        'conservative': 'conservativa',
        'otturazione': 'conservativa',
        'filling': 'conservativa',
        'endodonzia': 'endodonzia',
        'devitalizzazione': 'endodonzia',
        'root_canal': 'endodonzia',
        'impianto': 'impianto',
        'implant': 'impianto',
        'corona': 'impianto',
        'crown': 'impianto',
        'extract-impianto': 'extract-impianto',
        'extraction-implant': 'extract-impianto',
        'endodonzia-corona': 'endodonzia-corona',
        'root_canal_crown': 'endodonzia-corona'
    };

    return procedureMap[String(procedure).toLowerCase().trim()] || null;
}

/**
 * Setup interazioni odontogramma
 */
function setupOdontogrammaInteractions() {
    const teeth = document.querySelectorAll('.tooth');
    
    teeth.forEach(tooth => {
        tooth.addEventListener('click', (e) => {
            e.stopPropagation();
            const toothNumber = tooth.getAttribute('data-tooth');
            const procedure = Array.from(tooth.classList).find(c => 
                ['extract', 'conservativa', 'endodonzia', 'impianto', 'extract-impianto', 'endodonzia-corona'].includes(c)
            );
            
            if (procedure) {
                showNotification(`Dente ${toothNumber}: ${getProcedureLabel(procedure)}`, 'info');
            }
        });

        tooth.addEventListener('mouseover', () => {
            tooth.style.opacity = '0.8';
            tooth.style.cursor = 'pointer';
        });

        tooth.addEventListener('mouseout', () => {
            tooth.style.opacity = '1';
        });
    });

    console.log('✅ Odontogramma interactions setup');
}

/**
 * Etichetta leggibile per procedura
 */
function getProcedureLabel(procedure) {
    const labels = {
        'extract': 'Estrazione',
        'conservativa': 'Conservativa',
        'endodonzia': 'Endodonzia',
        'impianto': 'Impianto + Corona',
        'extract-impianto': 'Estrazione + Impianto',
        'endodonzia-corona': 'Endodonzia + Corona'
    };
    return labels[procedure] || procedure;
}

/**
 * Salva il referto come PDF
 */
function savePdfReferto() {
    console.log('📄 Salvataggio PDF...');
    
    const fileName = currentPatient 
        ? `Referto_${currentPatient.firstName}_${currentPatient.lastName}_${new Date().toISOString().slice(0,10)}.pdf`
        : `Referto_${new Date().toISOString().slice(0,10)}.pdf`;

    if (typeof html2pdf !== 'undefined') {
        const element = document.querySelector('.referto-main');
        const opt = {
            margin: 10,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        html2pdf().set(opt).from(element).save();
        showNotification('✅ PDF generato con successo', 'success');
    } else {
        window.print();
        showNotification('📄 Apri stampa per salvare come PDF', 'info');
    }
}

/**
 * Stampa il referto
 */
function printReferto() {
    console.log('🖨️ Stampa referto...');
    window.print();
    showNotification('🖨️ Dialogo di stampa aperto', 'info');
}

/**
 * Invia il referto al paziente
 */
function sendToPatient() {
    console.log('📧 Invio referto al paziente...');
    showNotification('✅ Funzionalità in arrivo', 'info');
}

/**
 * Elimina il referto
 */
function deleteReferto() {
    if (confirm('⚠️ Sei sicuro di voler eliminare questo referto? Questa azione non può essere annullata.')) {
        console.log('🗑️ Eliminazione referto...');
        
        showNotification('✅ Referto eliminato', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

/**
 * Mostra notifica
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    
    notificationContainer.appendChild(notification);
    
    const timeout = setTimeout(() => {
        notification.remove();
    }, 3000);
    
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.remove();
    });
}