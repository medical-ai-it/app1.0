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
let processingStarted = false; // Flag per evitare trigger multipli

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Pagina Referto caricata');

    // Check if user is logged in
    if (!isUserLoggedIn()) {
        console.warn('⚠️ Utente non loggato - Reindirizzamento a login');
        window.location.href = '../login/index.html';
        return;
    }

    // Initialize referto page
    await initializeReferto();
});

/**
 * Inizializza la pagina referto
 */
async function initializeReferto() {
    try {
        // Mostra la sezione referto
        const refertoSection = document.getElementById('refertoSection');
        if (refertoSection) {
            refertoSection.style.display = 'flex';
        }

        // Mostra loading screen
        showRefertoLoading();

        // Load dynamic components
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

        // Estrai parametri URL
        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get('patientId');
        const recordingId = urlParams.get('recordingId');

        console.log(`📋 Parametri URL - patientId: ${patientId}, recordingId: ${recordingId}`);

        if (!patientId || !recordingId) {
            showRefertoError('Parametri non validi. Torna alla dashboard.');
            return;
        }

        currentRecordingId = recordingId;
        processingStarted = false; // Reset flag

        // Carica referto dal backend con polling
        await loadRefertoFromBackend(recordingId, patientId);

        console.log('✅ Referto inizializzato');

    } catch (error) {
        console.error('❌ Errore inizializzazione referto:', error);
        showRefertoError('Errore nel caricamento del referto: ' + error.message);
    }
}

/**
 * Mostra schermata di caricamento con spinner
 */
function showRefertoLoading() {
    const mainContent = document.querySelector('.referto-main');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="referto-loading">
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
        </div>
    `;
}

/**
 * Mostra messaggio di errore
 */
function showRefertoError(message) {
    const mainContent = document.querySelector('.referto-main');
    if (!mainContent) return;

    mainContent.innerHTML = `
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
}

/**
 * Attiva l'elaborazione del referto tramite API
 * Chiama POST /api/recordings/:id/process per avviare Whisper + GPT-4
 * ✅ AGGIORNATA: Usa window.API_BASE_URL dal client-api.js
 */
async function triggerRefertoProcessing(recordingId) {
    try {
        console.log(`🚀 Attivazione elaborazione referto (recordingId: ${recordingId})...`);
        
        // Usa API_BASE_URL dal client-api.js (dinamicamente scelto tra localhost e Render)
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
 * 
 * LOGICA:
 * - Primo tentativo: se status === 'pending', chiama triggerRefertoProcessing()
 * - Tentativi successivi: attendi che status diventi 'completed'
 * - Max 24 tentativi (2 minuti) prima di timeout
 */
async function loadRefertoFromBackend(recordingId, patientId) {
    let attempts = 0;
    const maxAttempts = 24; // 2 minuti: 24 × 5 secondi
    let processingTriggered = false; // Flag locale per tenere traccia del trigger
    
    return new Promise((resolve, reject) => {
        const pollReferto = async () => {
            try {
                console.log(`📋 Polling referto (tentativo ${attempts + 1}/${maxAttempts})...`);
                
                const response = await getReferto(recordingId);
                console.log('📊 Risposta API:', {
                    recordingId: response.recordingId,
                    processingStatus: response.processingStatus || response.processing_status,
                    hasReferto: !!response.referto,
                    hasTranscript: !!response.transcript
                });
                
                // Estrai lo stato di elaborazione
                const processingStatus = response.processingStatus || response.processing_status || 'unknown';
                const referto = response.referto;
                
                // ✅ SUCCESS: referto completamente disponibile
                if (referto && (processingStatus === 'completed' || processingStatus === 'success')) {
                    console.log('✅ Referto caricato dal backend');
                    
                    // Salva dati paziente per uso successivo
                    currentPatient = {
                        id: patientId,
                        firstName: response.patient?.first_name || response.patientFirstName || 'Paziente',
                        lastName: response.patient?.last_name || response.patientLastName || '',
                        doctorName: response.doctor_name || response.doctorName || 'Dr. Professionista'
                    };

                    // Salva i dati del referto
                    refertoData = response;

                    // Aggiorna display
                    displayRefertoComplete(response);
                    
                    // Setup interazioni
                    setupOdontogrammaInteractions();
                    
                    resolve(response);
                    
                } else if (processingStatus === 'pending' || processingStatus === 'processing' || !referto) {
                    // ⏳ Still processing - no referto yet
                    
                    // 🚀 Al PRIMO tentativo se status è "pending", attiva l'elaborazione
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
                        setTimeout(pollReferto, 5000); // Retry dopo 5 secondi
                    } else {
                        showRefertoError('Elaborazione in corso da troppo tempo. Prova a ricaricare la pagina tra poco.');
                        reject(new Error('Processing timeout'));
                    }
                } else {
                    // ❌ Unexpected status
                    console.warn('⚠️ Stato referto non riconosciuto:', processingStatus);
                    showRefertoError(`Stato inaspettato: ${processingStatus}. Contatta il supporto.`);
                    reject(new Error(`Invalid referto status: ${processingStatus}`));
                }
                
            } catch (error) {
                console.warn(`⚠️ Errore polling (${attempts + 1}/${maxAttempts}):`, error.message);
                
                // Continua polling anche se c'è errore (potrebbe essere temporaneo)
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(pollReferto, 5000);
                } else {
                    showRefertoError('Impossibile caricare il referto. Prova a ricaricare la pagina.');
                    reject(error);
                }
            }
        };
        
        // Inizia il polling
        pollReferto();
    });
}

/**
 * Visualizza il referto completato
 */
function displayRefertoComplete(refertoResponse) {
    try {
        // Estrai dati dalla risposta - la struttura è refertoResponse.referto.referto
        const referto = refertoResponse.referto?.referto || refertoResponse.referto || {};
        const doctorName = refertoResponse.doctor_name || refertoResponse.doctorName || currentPatient?.doctorName || 'Dr. Professionista';
        const patientFirstName = refertoResponse.patient?.first_name || refertoResponse.patientFirstName || currentPatient?.firstName || 'Paziente';
        const patientLastName = refertoResponse.patient?.last_name || refertoResponse.patientLastName || currentPatient?.lastName || '';
        const patientName = (patientFirstName + ' ' + patientLastName).trim();
        
        const today = new Date();

        // 1️⃣ Popola header info
        const refertoDateEl = document.getElementById('refertoDate');
        if (refertoDateEl) {
            refertoDateEl.textContent = today.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const visitDateEl = document.getElementById('visitDate');
        if (visitDateEl) {
            visitDateEl.textContent = today.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const medicoNameEl = document.getElementById('medicoName');
        if (medicoNameEl) {
            medicoNameEl.textContent = doctorName;
            console.log(`👨‍⚕️ Nome medico impostato: ${doctorName}`);
        }

        const patientNameEl = document.getElementById('patientName');
        if (patientNameEl) {
            patientNameEl.textContent = patientName || 'Paziente';
            console.log(`👤 Nome paziente impostato: ${patientName}`);
        }

        // 2️⃣ Popola sezioni referto
        const anamneseText = document.getElementById('anamneseText');
        if (anamneseText) {
            anamneseText.textContent = referto.anamnesi || 'Non specificato';
        }

        const esameText = document.getElementById('esameText');
        if (esameText) {
            if (referto.esame_obiettivo && typeof referto.esame_obiettivo === 'object') {
                const esameObj = referto.esame_obiettivo;
                esameText.innerHTML = `
                    <ul>
                        <li><strong>Igiene orale:</strong> ${esameObj.igiene_orale || 'Non specificato'}</li>
                        <li><strong>Carie:</strong> ${esameObj.carie || 'Non specificate'}</li>
                        <li><strong>Denti mancanti:</strong> ${esameObj.denti_mancanti || 'Nessuno'}</li>
                        <li><strong>Gengivite/Parodontite:</strong> ${esameObj.gengivite_parodontite || 'Non specificato'}</li>
                        <li><strong>Tartaro:</strong> ${esameObj.tartaro || 'Non rilevato'}</li>
                    </ul>
                `;
            } else {
                esameText.textContent = 'Non specificato';
            }
        }

        const diagnosiText = document.getElementById('diagnosiText');
        if (diagnosiText) {
            diagnosiText.textContent = referto.diagnosi || 'Non specificato';
        }

        const pianoText = document.getElementById('pianoText');
        if (pianoText) {
            if (referto.piano_terapeutico && typeof referto.piano_terapeutico === 'object') {
                const pianoObj = referto.piano_terapeutico;
                pianoText.innerHTML = `
                    <ul>
                        <li><strong>Igiene professionale:</strong> ${pianoObj.igiene_professionale ? 'Consigliata' : 'Non necessaria'}</li>
                        <li><strong>Cure necessarie:</strong> ${pianoObj.cure_necessarie && Object.keys(pianoObj.cure_necessarie).length > 0 ? 'Vedi dettagli quadranti' : 'Nessuna'}</li>
                        <li><strong>Protesi/Impianti:</strong> ${pianoObj.protesi_impianti || 'Non necessari'}</li>
                        <li><strong>Priorità:</strong> ${pianoObj.priorita || 'Non urgente'}</li>
                    </ul>
                `;
            } else {
                pianoText.textContent = 'Non specificato';
            }
        }

        const followupText = document.getElementById('followupText');
        if (followupText) {
            followupText.textContent = referto.follow_up || 'Controllo di routine';
        }

        // 3️⃣ Firma medico
        const signatureName = document.getElementById('signatureName');
        if (signatureName) {
            signatureName.textContent = doctorName;
        }

        // 4️⃣ Colora odontogramma se dati disponibili
        if (refertoResponse.odontogramma) {
            console.log('🦷 Colorizzazione odontogramma...');
            colorizeOdontogramma(refertoResponse.odontogramma);
        }

        // Nascondi loading
        const loadingEl = document.querySelector('.referto-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }

        console.log('✅ Referto visualizzato completamente');

    } catch (error) {
        console.error('❌ Errore visualizzazione referto:', error);
        showRefertoError('Errore nella visualizzazione del referto: ' + error.message);
    }
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

        // Itera sui denti se in formato { denti: { ...} } oppure { ...} diretto
        const dentiData = odontogrammaData.denti || odontogrammaData;
        let colorizedCount = 0;

        for (let toothNum = 11; toothNum <= 48; toothNum++) {
            // Skip quadrante boundaries (no tooth 19, 29, 39, 49)
            if (toothNum === 19 || toothNum === 29 || toothNum === 39 || toothNum === 49) continue;

            const toothId = `tooth-${toothNum}`;
            const toothElement = document.getElementById(toothId);
            
            if (!toothElement) continue;

            const toothData = dentiData[toothNum] || dentiData[String(toothNum)];
            
            if (toothData && toothData.procedure) {
                // Rimuovi vecchie classi
                toothElement.classList.remove('extract', 'conservativa', 'endodonzia', 'impianto', 'extract-impianto', 'endodonzia-corona');
                
                // Aggiungi classe procedure
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

    // Usa html2pdf se disponibile, altrimenti usa print
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
        // Fallback: print
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
    // TODO: Implementare invio email backend
}

/**
 * Elimina il referto
 */
function deleteReferto() {
    if (confirm('⚠️ Sei sicuro di voler eliminare questo referto? Questa azione non può essere annullata.')) {
        console.log('🗑️ Eliminazione referto...');
        
        // TODO: Implementare DELETE /api/recordings/:id
        // await deleteRefertoAPI(currentRecordingId);
        
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