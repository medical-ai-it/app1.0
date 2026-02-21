/**
 * ============================================================================
 * Referto Page - Patient Report Management - SCHEMA 2.0-COMPLETO
 * ============================================================================
 * Pagina per visualizzare e gestire i referti generati dall'AI
 * 
 * SCHEMA: 2.0-completo (9 categorie cliniche + anamnesi + odontogramma colorato)
 * MODELLO: gpt-4o-mini (70% risparmio costi)
 * 
 * FLOW:
 * 1. Carica referto dal backend con polling ogni 5 secondi
 * 2. Se status è "pending" al primo tentativo, chiama triggerRefertoProcessing()
 * 3. Attendi che il backend elabori (Whisper + GPT-4o-mini)
 * 4. Continua polling finché status diventa "completed"
 * 5. Visualizza il referto completato con 9 categorie cliniche + odontogramma colorato
 */

let refertoData = null;
let currentPatient = null;
let currentRecordingId = null;
let processingStarted = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Pagina Referto caricata - Schema 2.0-completo');

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
                <p>Stiamo generando il referto completo con:</p>
                <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                    <li>✅ 9 categorie cliniche</li>
                    <li>✅ Anamnesi strutturata</li>
                    <li>✅ Odontogramma colorato</li>
                    <li>✅ Validazione schema</li>
                </ul>
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
    console.log('⚠️ Errore visualizzato:', message);
}

/**
 * Attiva l'elaborazione del referto tramite API
 */
async function triggerRefertoProcessing(recordingId) {
    try {
        console.log(`🚀 Attivazione elaborazione referto SCHEMA 2.0 (recordingId: ${recordingId})...`);
        
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
        console.log(`📊 Schema versione: 2.0-completo`);
        console.log(`💰 Modello: gpt-4o-mini (70% risparmio)`);
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
    const maxAttempts = 24; // 24 × 5 secondi = 2 minuti max
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
                    console.log('✅ Referto SCHEMA 2.0 caricato dal backend');
                    console.log('🔍 Struttura referto ricevuta:', {
                        keys: Object.keys(referto),
                        hasAnamnesi: !!referto.anamnesi,
                        hasSezioni: Object.keys(referto).filter(k => k.startsWith('1_') || k.startsWith('2_') || k.startsWith('3_') || k.startsWith('4_') || k.startsWith('5_') || k.startsWith('6_') || k.startsWith('7_') || k.startsWith('8_') || k.startsWith('9_')).length,
                        hasOdontogramma: !!referto.odontogramma_schema,
                        hasValidazione: !!referto.validazione_schema
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
 * ============================================================================
 * VISUALIZZAZIONE REFERTO SCHEMA 2.0-COMPLETO
 * ============================================================================
 */

/**
 * Visualizza il referto completato con tutte le 9 categorie cliniche
 */
function displayRefertoComplete(refertoResponse) {
    try {
        console.log('🔍 INIZIO VISUALIZZAZIONE REFERTO SCHEMA 2.0-COMPLETO');
        console.log('='.repeat(80));
        
        // ===== ESTRAI STRUTTURA REFERTO =====
        let referto = extractRefertoData(refertoResponse);
        
        // ===== DATI PAZIENTE E MEDICO =====
        const doctorName = refertoResponse.doctorName || currentPatient?.doctorName || 'Dr. Professionista';
        const patientFirstName = refertoResponse.patientFirstName || currentPatient?.firstName || 'Paziente';
        const patientLastName = refertoResponse.patientLastName || currentPatient?.lastName || '';
        const patientName = (patientFirstName + ' ' + patientLastName).trim();
        
        console.log(`👨‍⚕️ Medico: ${doctorName}`);
        console.log(`👤 Paziente: ${patientName}`);
        
        const today = new Date();

        // ===== 1. POPOLA HEADER INFO =====
        console.log('\n[1/5] 📅 Compilazione info header...');
        populateRefertoHeader(today, doctorName, patientName);

        // ===== 2. POPOLA ANAMNESI =====
        console.log('[2/5] 📋 Compilazione anamnesi con controlli obbligatorietà...');
        populateAnamnesi(referto.anamnesi || {});

        // ===== 3. POPOLA 9 CATEGORIE CLINICHE =====
        console.log('[3/5] 🏥 Compilazione 9 categorie cliniche...');
        populateClinicalCategories(referto);

        // ===== 4. POPOLA VALIDAZIONE SCHEMA =====
        console.log('[4/5] ✅ Compilazione validazione schema...');
        populateSchemaValidation(referto.validazione_schema || {});

        // ===== 5. COLORIZZA ODONTOGRAMMA =====
        console.log('[5/5] 🦷 Colorizzazione odontogramma standardizzato...');
        if (refertoResponse.odontogramma) {
            colorizeOdontogrammaNuovo(refertoResponse.odontogramma);
        } else if (referto.odontogramma_schema) {
            colorizeOdontogrammaNuovo(referto.odontogramma_schema);
        }

        // ===== FIRMA MEDICO =====
        const signatureName = document.getElementById('signatureName');
        if (signatureName) {
            signatureName.textContent = doctorName;
        }

        // ===== NASCONDI LOADING E MOSTRA CONTENUTO =====
        const loadingEl = document.getElementById('loadingSpinner');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }

        const contentEl = document.querySelector('.referto-content');
        if (contentEl) {
            contentEl.style.display = 'block';
        }

        console.log('='.repeat(80));
        console.log('✅✅✅ REFERTO SCHEMA 2.0-COMPLETO VISUALIZZATO ✅✅✅');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Errore visualizzazione referto:', error);
        console.error('📍 Stack trace:', error.stack);
        showRefertoError('Errore nella visualizzazione del referto: ' + error.message);
    }
}

/**
 * Estrae la struttura corretta del referto dai dati ricevuti
 */
function extractRefertoData(refertoResponse) {
    let referto = {};
    
    if (refertoResponse.referto) {
        if (refertoResponse.referto.referto_clinico) {
            referto = refertoResponse.referto.referto_clinico;
            console.log('📌 Referto estratto da referto.referto_clinico');
        } else if (refertoResponse.referto.referto) {
            referto = refertoResponse.referto.referto;
            console.log('📌 Referto estratto da referto.referto');
        } else {
            referto = refertoResponse.referto;
            console.log('📌 Referto estratto da referto (singolo livello)');
        }
    }
    
    console.log('🔑 Chiavi referto:', Object.keys(referto));
    return referto;
}

/**
 * Popola header del referto
 */
function populateRefertoHeader(today, doctorName, patientName) {
    const dateStr = today.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    setElementText('refertoDate', dateStr);
    setElementText('visitDate', dateStr);
    setElementText('medicoName', doctorName);
    setElementText('patientName', patientName);
    
    console.log('✅ Header info compilata');
}

/**
 * Popola sezione ANAMNESI con controlli obbligatorietà
 */
function populateAnamnesi(anamneseData) {
    try {
        // Valutazione Iniziale (OBBLIGATORIA)
        const valInitiale = anamneseData.valutazione_iniziale_bocca || {};
        if (valInitiale.presente_in_trascrizione || valInitiale.presente) {
            setElementHTML('valutazioneIniziale', 
                `<strong>✅ Valutazione Iniziale Bocca:</strong><br/>${valInitiale.contenuto || 'Non specificato'}`
            );
        } else {
            setElementHTML('valutazioneIniziale', 
                `<strong>⚠️ Valutazione Iniziale Bocca (OBBLIGATORIA):</strong><br/>Non trovata nella trascrizione`
            );
        }

        // Condizioni Dentali (OBBLIGATORIA)
        const conDentali = anamneseData.condizioni_dentali || {};
        if (conDentali.presente_in_trascrizione || conDentali.presente) {
            setElementHTML('conditioniDentali', 
                `<strong>✅ Condizioni Dentali:</strong><br/>${conDentali.contenuto || 'Non specificato'}`
            );
        } else {
            setElementHTML('conditioniDentali', 
                `<strong>⚠️ Condizioni Dentali (OBBLIGATORIA):</strong><br/>Non trovate nella trascrizione`
            );
        }

        // Condizioni Protesiche (OBBLIGATORIA)
        const conProtesi = anamneseData.condizioni_protesiche || {};
        if (conProtesi.presente_in_trascrizione || conProtesi.presente) {
            setElementHTML('conditioniProtesiche', 
                `<strong>✅ Condizioni Protesiche:</strong><br/>${conProtesi.contenuto || 'Non specificato'}`
            );
        } else {
            setElementHTML('conditioniProtesiche', 
                `<strong>⚠️ Condizioni Protesiche (OBBLIGATORIA):</strong><br/>Non trovate nella trascrizione`
            );
        }

        // Condizioni Parodontali (FACOLTATIVA - media priorità)
        const conParodon = anamneseData.condizioni_parodontali || {};
        if (conParodon.presente_in_trascrizione || conParodon.presente) {
            setElementHTML('conditioniParodontali', 
                `<strong>📋 Condizioni Parodontali:</strong><br/>${conParodon.contenuto || 'Non applicabile'}`
            );
        } else {
            setElementHTML('conditioniParodontali', 
                `<strong>📋 Condizioni Parodontali (facoltativa):</strong><br/>Non specificate`
            );
        }

        // Condizioni Mucosali (FACOLTATIVA - bassa priorità)
        const conMucose = anamneseData.condizioni_mucosali || {};
        if (conMucose.presente_in_trascrizione || conMucose.presente) {
            setElementHTML('conditioniMucosali', 
                `<strong>🔍 Condizioni Mucosali:</strong><br/>${conMucose.contenuto || 'Non applicabile'}`
            );
        }

        // Condizioni Occlusali (FACOLTATIVA - media priorità)
        const conOcclusali = anamneseData.condizioni_occlusali || {};
        if (conOcclusali.presente_in_trascrizione || conOcclusali.presente) {
            setElementHTML('conditioniOcclusali', 
                `<strong>👄 Condizioni Occlusali:</strong><br/>${conOcclusali.contenuto || 'Non applicabile'}`
            );
        }

        // Condizioni Estetiche e Allineamento (FACOLTATIVA - solo visita ortodontica)
        const conEstetica = anamneseData.condizioni_estetiche_allineamento || {};
        if (conEstetica.presente_in_trascrizione || conEstetica.presente) {
            setElementHTML('conditioniEstetiche', 
                `<strong>✨ Condizioni Estetiche e Allineamento:</strong><br/>${conEstetica.contenuto || 'Non applicabile'}`
            );
        }

        // Barra di completezza anamnesi
        const controlli = anamneseData.controlli_completezza || {};
        const obbligatoriCompilati = controlli.campi_obbligatori_compilati || 0;
        const completezzePercentuale = controlli.completezza_percentuale_anamnesi || 0;
        
        const completezzaBar = document.getElementById('anamneseCompletezzeBar');
        if (completezzaBar) {
            completezzaBar.innerHTML = `
                <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                        Completezza Anamnesi: ${obbligatoriCompilati}/3 campi obbligatori (${completezzePercentuale}%)
                    </div>
                    <div style="width: 100%; height: 8px; background: #ddd; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${completezzePercentuale}%; height: 100%; background: ${completezzePercentuale >= 100 ? '#4CAF50' : completezzePercentuale >= 66 ? '#FFC107' : '#F44336'}; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        }

        console.log('✅ Anamnesi compilata');
    } catch (error) {
        console.warn('⚠️ Errore compilazione anamnesi:', error);
    }
}

/**
 * Popola le 9 CATEGORIE CLINICHE
 */
function populateClinicalCategories(referto) {
    try {
        // 1. DENTI PRESENTI, ASSENTI, SOSTITUITI
        populateDentiStatus(referto['1_denti_presenti_assenti_sostituiti'] || {});

        // 2. CARIE DENTALE
        populateCarie(referto['2_carie_dentale'] || {});

        // 3. RESTAURI E OTTURAZIONI
        populateRestauriOtturazioni(referto['3_restauri_otturazioni_esistenti'] || {});

        // 4. ENDODONZIA
        populateEndodonzia(referto['4_endodonzia'] || {});

        // 5. CHIRURGIA ED ESTRAZIONI
        populateChirurgiaEstrazioni(referto['5_chirurgia_estrazioni'] || {});

        // 6. IMPIANTI E PROTESI
        populateImpianti(referto['6_impianti_protesi'] || {});

        // 7. IGIENE E PARODONTOLOGIA
        populateIgieneParodontologia(referto['7_igiene_parodontologia'] || {});

        // 8. ESTETICA
        populateEstetica(referto['8_estetica'] || {});

        // 9. ORTODONZIA E PEDODONZIA
        populateOrtodonta(referto['9_ortodonzia_pedodonzia'] || {});

        console.log('✅ Tutte le 9 categorie cliniche compilate');
    } catch (error) {
        console.warn('⚠️ Errore compilazione categorie cliniche:', error);
    }
}

/**
 * 1. DENTI PRESENTI, ASSENTI, SOSTITUITI
 */
function populateDentiStatus(data) {
    if (!data.statistiche) return;
    
    const html = `
        <div class="categoria-clinica">
            <h3>1️⃣ DENTI PRESENTI, ASSENTI E SOSTITUITI</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Denti Presenti</span>
                    <span class="stat-value">${data.statistiche.denti_presenti_totali || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Denti Assenti</span>
                    <span class="stat-value">${data.statistiche.denti_assenti_totali || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Sostituiti da Impianto</span>
                    <span class="stat-value">${data.statistiche.denti_sostituiti_impianto || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Denti Patologici</span>
                    <span class="stat-value">${data.statistiche.denti_patologici || 0}</span>
                </div>
            </div>
            <div class="completezza-bar">
                <span>Completezza Odontogramma: ${data.statistiche.completezza_odontogramma || 0}%</span>
                <div style="width: 100%; height: 8px; background: #ddd; border-radius: 4px; margin-top: 5px; overflow: hidden;">
                    <div style="width: ${data.statistiche.completezza_odontogramma || 0}%; height: 100%; background: #4CAF50;"></div>
                </div>
            </div>
        </div>
    `;
    setElementHTML('sezione1Denti', html);
}

/**
 * 2. CARIE DENTALE
 */
function populateCarie(data) {
    if (!data.statistiche) return;
    
    const lesioni = data.lesioni_cariose || [];
    let lesionieHTML = '';
    
    lesioni.forEach((lesione, idx) => {
        lesionieHTML += `
            <div class="lesione-item" style="margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #FFC107; border-radius: 4px;">
                <strong>Dente ${lesione.dente_fdi}</strong> (Q${lesione.quadrante})<br/>
                <small>
                    Presenza: <strong>${lesione.presenza}</strong> | 
                    Superficie: ${lesione.superficie_interessata} | 
                    Profondità: ${lesione.profondita}<br/>
                    Procedura: <strong>${lesione.procedura_consigliata}</strong> | 
                    Urgenza: ${lesione.urgenza}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>2️⃣ CARIE DENTALE</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Denti Interessati</span>
                    <span class="stat-value">${data.statistiche.numero_denti_interessati || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Carie Confermate</span>
                    <span class="stat-value">${data.statistiche.lesioni_confermate || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Carie Sospette</span>
                    <span class="stat-value">${data.statistiche.lesioni_sospette || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Profonde (Dentina)</span>
                    <span class="stat-value">${data.statistiche.carie_profonde_dentina || 0}</span>
                </div>
            </div>
            ${lesionieHTML ? `<div class="lesioni-list">${lesionieHTML}</div>` : '<p>Nessuna carie rilevata</p>'}
        </div>
    `;
    setElementHTML('sezione2Carie', html);
}

/**
 * 3. RESTAURI E OTTURAZIONI ESISTENTI
 */
function populateRestauriOtturazioni(data) {
    if (!data.statistiche) return;
    
    const restauri = data.restauri_per_dente || [];
    let restauriHTML = '';
    
    restauri.forEach(restauro => {
        restauriHTML += `
            <div class="restauro-item" style="margin: 10px 0; padding: 10px; background: #cce5ff; border-left: 4px solid #FFC107; border-radius: 4px;">
                <strong>Dente ${restauro.dente_fdi}</strong> (Q${restauro.quadrante})<br/>
                <small>
                    Tipologia: <strong>${restauro.tipologia}</strong> | 
                    Materiale: ${restauro.materiale_utilizzato} | 
                    Stato: <strong>${restauro.stato_integrita}</strong><br/>
                    ${restauro.note_cliniche ? `Note: ${restauro.note_cliniche}` : ''}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>3️⃣ RESTAURI E OTTURAZIONI ESISTENTI</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Otturazioni</span>
                    <span class="stat-value">${data.statistiche.numero_otturazioni || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Ricostruzioni</span>
                    <span class="stat-value">${data.statistiche.numero_ricostruzioni || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">In Buone Condizioni</span>
                    <span class="stat-value">${data.statistiche.restauri_in_buone_condizioni || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Da Risistemare</span>
                    <span class="stat-value">${data.statistiche.restauri_deteriorati_da_risistemare || 0}</span>
                </div>
            </div>
            ${restauriHTML ? `<div class="restauri-list">${restauriHTML}</div>` : '<p>Nessun restauro rilevato</p>'}
        </div>
    `;
    setElementHTML('sezione3Restauri', html);
}

/**
 * 4. ENDODONZIA
 */
function populateEndodonzia(data) {
    if (!data.statistiche) return;
    
    const trattamenti = data.trattamenti_canalari || [];
    let trattamentiHTML = '';
    
    trattamenti.forEach(tratt => {
        trattamentiHTML += `
            <div class="trattamento-item" style="margin: 10px 0; padding: 10px; background: #ffe6cc; border-left: 4px solid #FF9800; border-radius: 4px;">
                <strong>Dente ${tratt.dente_fdi}</strong> (Q${tratt.quadrante})<br/>
                <small>
                    Tipologia: <strong>${tratt.tipologia}</strong> | 
                    Canali: ${tratt.numero_canali_interessati} | 
                    Complessità: ${tratt.complessita_clinica}<br/>
                    Procedura: <strong>${tratt.procedura_consigliata}</strong> | 
                    Prognosi: ${tratt.prognosi_dente}
                    ${tratt.rischio_perdita_dente ? '<br/>⚠️ RISCHIO PERDITA DENTE' : ''}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>4️⃣ ENDODONZIA</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Devitalizzazioni</span>
                    <span class="stat-value">${data.statistiche.numero_devitalizzazioni || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Ritrattamenti</span>
                    <span class="stat-value">${data.statistiche.numero_ritrattamenti || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Procedure Semplici</span>
                    <span class="stat-value">${data.statistiche.procedure_semplici || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Procedure Complesse</span>
                    <span class="stat-value">${data.statistiche.procedure_complesse_elevato_rischio || 0}</span>
                </div>
            </div>
            ${trattamentiHTML ? `<div class="trattamenti-list">${trattamentiHTML}</div>` : '<p>Nessun trattamento endodontico rilevato</p>'}
        </div>
    `;
    setElementHTML('sezione4Endodonzia', html);
}

/**
 * 5. CHIRURGIA ED ESTRAZIONI
 */
function populateChirurgiaEstrazioni(data) {
    if (!data.statistiche) return;
    
    const interventi = data.interventi_chirurgici || [];
    let inteventiHTML = '';
    
    interventi.forEach(intv => {
        inteventiHTML += `
            <div class="intervento-item" style="margin: 10px 0; padding: 10px; background: #ffcccc; border-left: 4px solid #F44336; border-radius: 4px;">
                <strong>Dente ${intv.dente_fdi}</strong> (Q${intv.quadrante})<br/>
                <small>
                    Tipologia: <strong>${intv.tipologia}</strong> | 
                    Complessità: ${intv.complessita_stimata} | 
                    Condizione: ${intv.condizione_dente}<br/>
                    ${intv.nervi_anatomie_critiche_prossime ? `Anatomie critiche: ${intv.nervi_anatomie_critiche_prossime}<br/>` : ''}
                    Sedazione richiesta: ${intv.richiede_sedazione ? 'Sì' : 'No'}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>5️⃣ CHIRURGIA ED ESTRAZIONI</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Estrazioni Semplici</span>
                    <span class="stat-value">${data.statistiche.numero_estrazioni_semplici || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Estrazioni Complesse</span>
                    <span class="stat-value">${data.statistiche.numero_estrazioni_complesse || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Ottavi Interessati</span>
                    <span class="stat-value">${data.statistiche.numero_ottavi_interessati || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Interventi Chirurgici</span>
                    <span class="stat-value">${data.statistiche.interventi_chirurgici_specifici || 0}</span>
                </div>
            </div>
            ${inteventiHTML ? `<div class="interventi-list">${inteventiHTML}</div>` : '<p>Nessun intervento chirurgico rilevato</p>'}
        </div>
    `;
    setElementHTML('sezione5Chirurgia', html);
}

/**
 * 6. IMPIANTI E PROTESI
 */
function populateImpianti(data) {
    if (!data.statistiche) return;
    
    const interventi = data.interventi_protesici || [];
    let interventiHTML = '';
    
    interventi.forEach(intv => {
        interventiHTML += `
            <div class="intervento-protesi-item" style="margin: 10px 0; padding: 10px; background: #e6f2ff; border-left: 4px solid #2196F3; border-radius: 4px;">
                <strong>Posizione: ${intv.posizione}</strong> ${intv.quadrante ? `(Q${intv.quadrante})` : '(Arcata)'}<br/>
                <small>
                    Tipologia: <strong>${intv.tipologia}</strong><br/>
                    Stato osso: ${intv.stato_osso_locale} | 
                    Complessità: ${intv.complessita_clinica}<br/>
                    Rigenerazione: ${intv.rigenerazione_ossea_necessaria ? 'Necessaria' : 'No'} | 
                    TAC richiesta: ${intv.tac_necessaria ? 'Sì' : 'No'}
                    ${intv.anatomie_critiche_prossime ? `<br/>Anatomie critiche: ${intv.anatomie_critiche_prossime}` : ''}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>6️⃣ IMPIANTI E PROTESI FISSA</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Impianti Necessari</span>
                    <span class="stat-value">${data.statistiche.numero_impianti_necessari || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Ponti su Impianti</span>
                    <span class="stat-value">${data.statistiche.numero_ponti_su_impianti || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Con Rigenerazione</span>
                    <span class="stat-value">${data.statistiche.necessita_rigenerazione_ossea || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Richiedono TAC</span>
                    <span class="stat-value">${data.statistiche.pazienti_che_necessitano_tac || 0}</span>
                </div>
            </div>
            ${interventiHTML ? `<div class="interventi-list">${interventiHTML}</div>` : '<p>Nessun intervento implantoprotetico rilevato</p>'}
        </div>
    `;
    setElementHTML('sezione6Impianti', html);
}

/**
 * 7. IGIENE E PARODONTOLOGIA
 */
function populateIgieneParodontologia(data) {
    const html = `
        <div class="categoria-clinica">
            <h3>7️⃣ IGIENE E PARODONTOLOGIA</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Valutazione Igiene</span>
                    <span class="stat-value">${data.valutazione_igiene || 'N.A.'}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Tartaro Presente</span>
                    <span class="stat-value">${data.tartaro_presente ? 'Sì' : 'No'}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Tasche Parodontali</span>
                    <span class="stat-value">${data.tasche_parodontali ? 'Sì' : 'No'}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Parodontite</span>
                    <span class="stat-value">${data.parodontite || 'Assente'}</span>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
                <strong>Denti Critici:</strong> ${data.denti_specificamente_critici?.length > 0 ? data.denti_specificamente_critici.join(', ') : 'Nessuno'}<br/>
                <strong>Arcata Principalmente Colpita:</strong> ${data.arcata_principalmente_colpita || 'Non discriminato'}<br/>
                <strong>Procedure Consigliate:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    ${(data.procedure_consigliate || []).map(p => `<li>${p}</li>`).join('')}
                </ul>
                <strong>Note:</strong> ${data.note_speciali || 'Nessuna'}
            </div>
        </div>
    `;
    setElementHTML('sezione7Igiene', html);
}

/**
 * 8. ESTETICA
 */
function populateEstetica(data) {
    if (!data.statistiche) return;
    
    const interventi = data.interventi_estetici_consigliati || [];
    let interventiHTML = '';
    
    interventi.forEach(intv => {
        interventiHTML += `
            <div class="intervento-estetico-item" style="margin: 10px 0; padding: 10px; background: #ffe6f0; border-left: 4px solid #E91E63; border-radius: 4px;">
                <strong>${intv.tipologia}</strong><br/>
                <small>
                    Posizione: ${intv.posizione}<br/>
                    Condizione: ${intv.condizione_clinica}<br/>
                    Note: ${intv.note_dettagliate || 'Nessuna'}
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>8️⃣ ESTETICA</h3>
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Denti Antiestetici</span>
                    <span class="stat-value">${data.statistiche.numero_denti_antiestetici || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Interventi Potenziali</span>
                    <span class="stat-value">${data.statistiche.interventi_potenzialmente_necessari || 0}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Complessità Case</span>
                    <span class="stat-value">${data.statistiche.complessita_case_estetico || 'N.A.'}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Priorità Globale</span>
                    <span class="stat-value">${data.priorita_estetica_globale || 'Media'}</span>
                </div>
            </div>
            ${interventiHTML ? `<div class="interventi-list">${interventiHTML}</div>` : '<p>Nessun intervento estetico rilevato</p>'}
        </div>
    `;
    setElementHTML('sezione8Estetica', html);
}

/**
 * 9. ORTODONZIA E PEDODONZIA
 */
function populateOrtodonta(data) {
    const interventi = data.interventi_ortodontici_consigliati || [];
    let interventiHTML = '';
    
    interventi.forEach(intv => {
        interventiHTML += `
            <div class="intervento-orto-item" style="margin: 10px 0; padding: 10px; background: #e6ffe6; border-left: 4px solid #4CAF50; border-radius: 4px;">
                <strong>${intv.tipologia}</strong><br/>
                <small>
                    Complessità: ${intv.complessita_case}<br/>
                    Denti interessati: ${(intv.denti_principalmente_interessati || []).join(', ') || 'Vari'}<br/>
                    Durata stimata: ${intv.durata_stimata_mesi || 'N.A.'} mesi
                </small>
            </div>
        `;
    });

    const html = `
        <div class="categoria-clinica">
            <h3>9️⃣ ORTODONZIA E PEDODONZIA</h3>
            <div class="info-box" style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                <strong>Tipo Visita:</strong> ${data.tipo_visita_subgategoria || 'Generica'}<br/>
                <strong>Età Paziente:</strong> ${data.eta_paziente_stimata || 'N.A.'} anni<br/>
                <strong>Tipo Dentizione:</strong> ${data.tipo_dentizione || 'Permanente'}
            </div>

            <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-radius: 4px;">
                <strong>Valutazioni Ortodontiche:</strong>
                <ul style="margin: 5px 0; padding-left: 20px; font-size: 14px;">
                    <li>Morso: ${data.valutazioni_ortodontiche?.tipologia_morso || 'Non specificato'}</li>
                    <li>Overjet: ${data.valutazioni_ortodontiche?.overjet_misurato || 'Normale'}</li>
                    <li>Overbite: ${data.valutazioni_ortodontiche?.overbite_misurato || 'Normale'}</li>
                    <li>Problemi linguali/respiratori: ${data.valutazioni_ortodontiche?.problemi_linguali_respiratori || 'Assenti'}</li>
                    <li>Problemi posturali: ${data.valutazioni_ortodontiche?.problemi_posturali_colonna || 'Assenti'}</li>
                </ul>
            </div>

            ${interventiHTML ? `<div class="interventi-list">${interventiHTML}</div>` : '<p>Nessun intervento ortodontico specifico rilevato</p>'}
            
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                <strong>Follow-up Specialistico Necessario:</strong> ${data.necessita_follow_up_specialistico ? 'Sì ⚠️' : 'No'}
            </div>
        </div>
    `;
    setElementHTML('sezione9Ortodonta', html);
}

/**
 * Popola VALIDAZIONE SCHEMA
 */
function populateSchemaValidation(validazione) {
    try {
        const obbligatoriCompilati = Object.values(validazione.campi_anamnesi_obbligatori || {}).filter(v => v === true).length;
        const sezioniComplete = validazione.sezioni_cliniche_complete || 0;
        const avvisi = validazione.avvisi_clinici_importanti || [];

        const validazioneHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border: 2px solid #2196F3;">
                <h4>✅ VALIDAZIONE SCHEMA COMPLETEZZA</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div style="padding: 10px; background: ${obbligatoriCompilati === 3 ? '#c8e6c9' : '#fff9c4'}; border-radius: 4px;">
                        <strong>Campi Obbligatori:</strong> ${obbligatoriCompilati}/3
                    </div>
                    <div style="padding: 10px; background: ${sezioniComplete >= 7 ? '#c8e6c9' : '#fff9c4'}; border-radius: 4px;">
                        <strong>Sezioni Complete:</strong> ${sezioniComplete}/9
                    </div>
                </div>

                ${avvisi.length > 0 ? `
                    <div style="margin-top: 15px; padding: 10px; background: #ffebee; border-left: 4px solid #F44336; border-radius: 4px;">
                        <strong>⚠️ Avvisi Clinici Importanti:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            ${avvisi.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                ` : '<div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 4px;"><strong>✅ Nessun avviso critico</strong></div>'}
            </div>
        `;

        setElementHTML('validazioneSchemaContainer', validazioneHTML);
        console.log('✅ Validazione schema compilata');
    } catch (error) {
        console.warn('⚠️ Errore compilazione validazione:', error);
    }
}

/**
 * ============================================================================
 * ODONTOGRAMMA COLORATO STANDARDIZZATO
 * ============================================================================
 */

/**
 * Colora i denti in base ai dati clinici completi - SCHEMA 2.0 COLORATO
 */
function colorizeOdontogrammaNuovo(odontogrammaData) {
    try {
        if (!odontogrammaData || typeof odontogrammaData !== 'object') {
            console.warn('⚠️ Dati odontogramma non validi');
            return;
        }

        console.log('🦷 COLORIZZAZIONE ODONTOGRAMMA - SCHEMA 2.0 STANDARDIZZATO');
        console.log('Dati odontogramma ricevuti:', odontogrammaData);

        // Colori standardizzati internazionali (8 categorie)
        const COLORI_STANDARD = {
            otturazioni_esistenti: '#FFC107', // Giallo
            carie: '#F44336', // Rosso
            devitalizzazioni: '#FF9800', // Arancione
            impianti: '#2196F3', // Blu
            corone: '#9C27B0', // Viola
            elementi_mancanti: '#757575', // Grigio
            da_estrarre: '#E91E63', // Rosa
            sano: '#FFFFFF' // Bianco
        };

        let colorizzatiTotali = 0;

        // Estrai denti_da_evidenziare
        const dentiDA = odontogrammaData.denti_da_evidenziare || {};

        // Itera su tutte le categorie
        for (const [categoria, colore] of Object.entries(COLORI_STANDARD)) {
            const dentiList = dentiDA[categoria] || [];

            if (!Array.isArray(dentiList)) {
                console.warn(`⚠️ Categoria ${categoria} non è un array`);
                continue;
            }

            dentiList.forEach(denteFDI => {
                // Converti FDI "1.6" a ID "tooth-16"
                const toothId = convertFDIToToothId(denteFDI);
                const toothElement = document.getElementById(toothId);

                if (toothElement) {
                    // Applica colore
                    toothElement.style.backgroundColor = colore;
                    toothElement.style.borderColor = '#333';
                    toothElement.style.opacity = '1';
                    toothElement.setAttribute('data-categoria', categoria);
                    toothElement.setAttribute('data-colore', colore);

                    // Aggiungi tooltip
                    toothElement.title = `${categoria.replace(/_/g, ' ').toUpperCase()} - ${denteFDI}`;

                    colorizzatiTotali++;
                    console.log(`✅ Dente ${denteFDI} (${toothId}): ${categoria} - ${colore}`);
                } else {
                    console.warn(`⚠️ Elemento non trovato: ${toothId}`);
                }
            });
        }

        console.log(`✅ Odontogramma colorizzato: ${colorizzatiTotali} denti evidenziati`);
        console.log(`📊 Elementi mancanti totali: ${odontogrammaData.elementi_mancanti_totali?.length || 0}`);
        console.log(`📊 Completezza: ${odontogrammaData.completezza_odontogramma?.percentuale_completezza || 0}%`);

        // Crea legenda colori
        createOdontogrammaLegenda(COLORI_STANDARD);

    } catch (error) {
        console.warn('⚠️ Errore colorizzazione odontogramma:', error);
    }
}

/**
 * Converti da numerazione FDI (1.6) a ID HTML tooth-16
 */
function convertFDIToToothId(fdiNotation) {
    if (typeof fdiNotation !== 'string') {
        return null;
    }
    
    const parts = fdiNotation.split('.');
    if (parts.length !== 2) {
        return null;
    }
    
    const quadrant = parts[0];
    const position = parts[1];
    
    return `tooth-${quadrant}${position}`;
}

/**
 * Crea legenda colori odontogramma
 */
function createOdontogrammaLegend(colori) {
    try {
        const legendaContainer = document.getElementById('odontogrammaLegenda');
        if (!legendaContainer) {
            console.log('ℹ️ Container legenda non trovato (opzionale)');
            return;
        }

        const legendaHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
                ${Object.entries(colori).map(([categoria, colore]) => `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                        <div style="width: 24px; height: 24px; background: ${colore}; border: 1px solid #333; border-radius: 4px;"></div>
                        <span style="font-size: 12px;">${categoria.replace(/_/g, ' ').replace(/^(.)/, s => s.toUpperCase())}</span>
                    </div>
                `).join('')}
            </div>
        `;

        legendaContainer.innerHTML = legendaHTML;
        console.log('✅ Legenda colori creata');
    } catch (error) {
        console.warn('⚠️ Errore creazione legenda:', error);
    }
}

/**
 * Setup interazioni odontogramma
 */
function setupOdontogrammaInteractions() {
    const teeth = document.querySelectorAll('.tooth');
    
    teeth.forEach(tooth => {
        tooth.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const toothNum = tooth.getAttribute('data-tooth');
            const categoria = tooth.getAttribute('data-categoria');
            const colore = tooth.getAttribute('data-colore');
            
            if (categoria) {
                showNotification(
                    `🦷 Dente ${toothNum}: ${categoria.replace(/_/g, ' ').toUpperCase()}`,
                    'info'
                );
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
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Imposta testo elemento HTML
 */
function setElementText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
    }
}

/**
 * Imposta HTML elemento
 */
function setElementHTML(elementId, html) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = html;
    }
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
    showNotification('✅ Funzionalità in arrivo nelle prossime versioni', 'info');
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
 * Mostra notifica toast
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
    }, 4000);
    
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.remove();
    });
}