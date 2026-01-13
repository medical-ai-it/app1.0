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
 * Mostra schermata di caricamento con spinner
 */
function showRefertoLoading() {
    const mainContent = document.querySelector('.referto-main');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="referto-loading" id="loadingSpinner">
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
                console.log('📊 Risposta API (riassunto):', {
                    recordingId: response.recordingId,
                    processingStatus: response.processingStatus,
                    hasReferto: !!response.referto,
                    hasTranscript: !!response.transcript
                });
                
                const processingStatus = response.processingStatus || 'unknown';
                const referto = response.referto;
                
                // ✅ SUCCESS: referto completamente disponibile
                if (referto && (processingStatus === 'completed' || processingStatus === 'success')) {
                    console.log('✅ Referto caricato dal backend');
                    console.log('🔍 Struttura referto ricevuta:', {
                        keys: Object.keys(referto),
                        hasAnamnesi: !!referto.anamnesi,
                        hasDiagnosi: !!referto.diagnosi
                    });
                    
                    currentPatient = {
                        id: patientId,
                        firstName: response.patientFirstName || 'Paziente',
                        lastName: response.patientLastName || '',
                        doctorName: response.doctorName || 'Dr. Professionista'
                    };

                    refertoData = response;

                    console.log('🎯 Prima di displayRefertoComplete - verifico elementi DOM...');
                    const loadingEl = document.getElementById('loadingSpinner');
                    if (loadingEl) {
                        console.log('✅ Elemento loading trovato');
                    } else {
                        console.warn('⚠️ Elemento loading non trovato');
                    }
                    
                    const contentEl = document.querySelector('.referto-content');
                    if (contentEl) {
                        console.log('✅ Elemento referto-content trovato');
                    } else {
                        console.warn('⚠️ Elemento referto-content non trovato');
                    }

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
        console.log('📦 refertoResponse ricevuto:', refertoResponse);
        
        // Estrai referto - gestisci sia singolo che doppio annidamento
        let referto = {};
        if (refertoResponse.referto) {
            if (refertoResponse.referto.referto) {
                referto = refertoResponse.referto.referto;
                console.log('📌 Referto estratto da doppio annidamento (referto.referto.referto)');
            } else {
                referto = refertoResponse.referto;
                console.log('📌 Referto estratto da singolo annidamento (referto.referto)');
            }
        }
        
        console.log('📋 Contenuto referto finale:', referto);
        console.log('🔑 Chiavi del referto:', Object.keys(referto));
        
        const doctorName = refertoResponse.doctorName || 'Dr. Professionista';
        const patientFirstName = currentPatient?.firstName || 'Paziente';
        const patientLastName = currentPatient?.lastName || '';
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
            console.log(`✅ Data referto impostata: ${dateStr}`);
        } else {
            console.warn('⚠️ Elemento refertoDate non trovato');
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
            console.log(`✅ Data visita impostata: ${dateStr}`);
        } else {
            console.warn('⚠️ Elemento visitDate non trovato');
        }

        const medicoNameEl = document.getElementById('medicoName');
        if (medicoNameEl) {
            medicoNameEl.textContent = doctorName;
            console.log(`✅ Nome medico impostato: ${doctorName}`);
        } else {
            console.warn('⚠️ Elemento medicoName non trovato');
        }

        const patientNameEl = document.getElementById('patientName');
        if (patientNameEl) {
            patientNameEl.textContent = patientName || 'Paziente';
            console.log(`✅ Nome paziente impostato: ${patientName}`);
        } else {
            console.warn('⚠️ Elemento patientName non trovato');
        }

        // 2️⃣ Popola sezioni referto
        const anamneseText = document.getElementById('anamneseText');
        if (anamneseText) {
            const content = referto.anamnesi || 'Non specificato';
            anamneseText.textContent = content;
            console.log(`✅ Anamnesi impostata: ${content.substring(0, 50)}...`);
        } else {
            console.warn('⚠️ Elemento anamneseText non trovato');
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
                console.log('✅ Esame obiettivo impostato (formato strutturato)');
            } else {
                esameText.textContent = referto.esame_obiettivo || 'Non specificato';
                console.log('✅ Esame obiettivo impostato (testo)');
            }
        } else {
            console.warn('⚠️ Elemento esameText non trovato');
        }

        const diagnosiText = document.getElementById('diagnosiText');
        if (diagnosiText) {
            const content = referto.diagnosi || 'Non specificato';
            diagnosiText.textContent = content;
            console.log(`✅ Diagnosi impostata: ${content.substring(0, 50)}...`);
        } else {
            console.warn('⚠️ Elemento diagnosiText non trovato');
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
                console.log('✅ Piano terapeutico impostato (formato strutturato)');
            } else {
                pianoText.textContent = referto.piano_terapeutico || 'Non specificato';
                console.log('✅ Piano terapeutico impostato (testo)');
            }
        } else {
            console.warn('⚠️ Elemento pianoText non trovato');
        }

        const followupText = document.getElementById('followupText');
        if (followupText) {
            const content = referto.follow_up || 'Controllo di routine';
            followupText.textContent = content;
            console.log(`✅ Follow-up impostato: ${content}`);
        } else {
            console.warn('⚠️ Elemento followupText non trovato');
        }

        // 3️⃣ Firma medico
        const signatureName = document.getElementById('signatureName');
        if (signatureName) {
            signatureName.textContent = doctorName;
            console.log('✅ Nome firma impostato');
        } else {
            console.warn('⚠️ Elemento signatureName non trovato');
        }

        // 4️⃣ Colora odontogramma
        if (refertoResponse.odontogramma) {
            console.log('🦷 Colorizzazione odontogramma in corso...');
            colorizeOdontogramma(refertoResponse.odontogramma);
        } else {
            console.warn('⚠️ Dati odontogramma non disponibili');
        }

        // 5️⃣ Nascondi loading e mostra contenuto
        const loadingEl = document.getElementById('loadingSpinner');
        if (loadingEl) {
            loadingEl.style.display = 'none';
            console.log('✅ Loading nascosto');
        } else {
            console.warn('⚠️ Elemento loading non trovato per nascondere');
        }

        const contentEl = document.querySelector('.referto-content');
        if (contentEl) {
            contentEl.style.display = 'block';
            console.log('✅ Contenuto referto reso visibile');
        } else {
            console.warn('⚠️ Elemento referto-content non trovato');
        }

        console.log('✅ Referto visualizzato completamente');

    } catch (error) {
        console.error('❌ Errore visualizzazione referto:', error);
        console.error('📍 Stack trace:', error.stack);
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

        console.log('🦷 Dati odontogramma ricevuti:', odontogrammaData);
        console.log('🔑 Chiavi odontogramma:', Object.keys(odontogrammaData));

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
                    console.log(`🦷 Dente ${toothNum}: ${procedure}`);
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