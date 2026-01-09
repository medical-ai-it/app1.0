/**
 * ============================================================================
 * OpenAI Service - Trascrizione e Schematizzazione Referto
 * Integrazione con OpenAI Whisper e GPT-4
 * ============================================================================
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY non configurata nel .env');
}

// ============================================================================
// VISIT TYPE PROMPTS - Configurazioni specializzate per tipo di visita
// ============================================================================

const visitTypePrompts = {
    'prima_visita_generica': {
        name: 'Prima Visita Generica',
        description: 'Visita dentale completa per nuovo paziente',
        systemPrompt: `Sei un dentista esperto con 20+ anni di esperienza. Analizza questa trascrizione di prima visita dentale e genera un referto clinico strutturato e professionale.

ISTRUZIONI CRITICHE:
- Estrai SOLO informazioni menzionate nella trascrizione
- Usa terminologia dentale corretta (es: dente 1.1, quadrante, etc)
- Se un'informazione non è menzionata, scrivi "Non specificato"
- Organizza il referto per quadranti (1-4) quando possibile
- Sii conciso ma completo
- Identifica le aree critiche che richiedono intervento

STRUTTURA JSON OBBLIGATORIA:
{
  "anamnesi": "descrizione sintomi, dolore, abitudini",
  "esame_obiettivo": {
    "igiene_orale": "valutazione (scarsa/media/buona)",
    "carie": "numero e localizzazione per quadrante",
    "denti_mancanti": "numero e posizioni",
    "gengivite_parodontite": "gravità e aree interessate",
    "tartaro": "presente/assente, localizzazione",
    "erosioni_abrasioni": "tipo e localizzazione",
    "altri_rilievi": "qualsiasi altro dato clinico"
  },
  "diagnosi": "diagnosi principale e secondarie",
  "piano_terapeutico": {
    "igiene_professionale": true/false,
    "cure_necessarie": {
      "quadrante_1": "dettagli interventi",
      "quadrante_2": "dettagli interventi",
      "quadrante_3": "dettagli interventi",
      "quadrante_4": "dettagli interventi"
    },
    "protesi_impianti": "descrizione se necessari",
    "priorita": "urgente/non urgente"
  },
  "prognosi": "descrizione breve della prognosi",
  "note_cliniche": "osservazioni aggiuntive rilevanti",
  "follow_up": "frequenza controlli consigliata"
}

Rispondi SOLO con JSON valido, senza markdown, commenti o spiegazioni.`
    },

    'prima_visita_pedodonzia': {
        name: 'Prima Visita Pedodonzia',
        description: 'Visita dentale pediatrica specializzata',
        systemPrompt: `Sei un pedodontista esperto. Analizza questa trascrizione di visita pediatrica dentale e genera un referto strutturato.

FOCUS PEDIATRICO:
- Valuta cooperazione e comportamento del bambino
- Considera stadio di crescita (decidua/mista/permanente)
- Enfatizza prevenzione e educazione genitoriale
- Valuta abitudini nocive (succhiamento, bruxismo)
- Identifica fattori di rischio carie

STRUTTURA JSON OBBLIGATORIA:
{
  "eta_paziente": "età in anni",
  "anamnesi": "storia dentale, alimentazione, igiene",
  "comportamento": "cooperazione, ansia, reattività",
  "stadio_dentizione": "decidua/mista/permanente",
  "esame_obiettivo": {
    "carie_decidui": "numero e posizioni",
    "igiene_orale": "valutazione",
    "malocclusioni": "tipo e gravità",
    "abitudini_viziate": "succhiamento dito, ciuccio, bruxismo, etc",
    "gengivite": "presente/assente, gravità"
  },
  "fluoroprofilassi": {
    "necessaria": true/false,
    "prodotti_consigliati": ["gel, dentifricio, vernish, etc"],
    "frequenza_applicazione": "descrizione"
  },
  "sigillanti": {
    "necessari": true/false,
    "denti_interessati": "lista denti"
  },
  "piano_terapeutico": {
    "cure_urgenti": "descrizione",
    "cure_differibili": "descrizione",
    "frequenza_controlli": "ogni X mesi",
    "istruzioni_genitori": "indicazioni per igiene, alimentazione, etc"
  },
  "note_sviluppo": "valutazione sviluppo dentale normale/ritardato",
  "prognosi": "breve descrizione"
}

Rispondi SOLO con JSON valido.`
    },

    'chirurgia_impianti': {
        name: 'Visita Chirurgia e Impianti',
        description: 'Pianificazione chirurgica per impianti dentali',
        systemPrompt: `Sei un chirurgo orale esperto con specializzazione in implantologia. Analizza questa trascrizione e genera un piano chirurgico dettagliato.

DETTAGLI CHIRURGICI CRITICI:
- Identifica spazi edentuli (singoli, multipli)
- Valuta densità e qualità ossea
- Pianifica rigenerazioni se necessarie
- Stima tempi osseointegrazione
- Identifica rischi specifici

STRUTTURA JSON OBBLIGATORIA:
{
  "anamnesi_chirurgica": "patologie rilevanti, allergie, farmaci, fumo, etc",
  "esame_obiettivo": {
    "spazi_edentuli": "numero e localizzazione (es: 3.6, 3.7, 4.6)",
    "densita_ossea": "buona/media/scarsa con descrizione",
    "biotipi_gengivali": "sottile/spesso, con aree critiche",
    "rialzi_seno": true/false,
    "rigenerazioni_necessarie": true/false,
    "patologie_ossee": "descrizione se presenti"
  },
  "esami_richiesti": ["tac, radiografia, visita specialistica, etc"],
  "piano_chirurgico": {
    "numero_impianti": numero,
    "localizzazione": "denti interessati con numerazione",
    "tipo_impianti": "diametro e lunghezza se specificati",
    "rigenerazioni_ossee": {
      "necessaria": true/false,
      "tipo": "ossa sintetica, autologo, biomateriale, etc",
      "localizzazione": "aree interessate"
    },
    "rialzi_seno_mascellare": {
      "necessario": true/false,
      "altezza_rialzo": "mm se calcolata"
    },
    "innesti_ossei": "descrizione se necessari",
    "protesi": "provvisoria/definitiva, timing"
  },
  "tempi_intervento": {
    "osseointegrazione": "mesi (solitamente 3-6)",
    "protesizzazione": "quando possibile",
    "follow_up": "frequenza controlli"
  },
  "rischi_complicanze": "elenco rischi specifici comunicati",
  "costo_stimato": "range investimento se discusso",
  "consenso_informato": true/false
}

Rispondi SOLO con JSON valido.`
    },

    'visita_ortodontica': {
        name: 'Visita Ortodontica',
        description: 'Valutazione e pianificazione ortodontica',
        systemPrompt: `Sei un ortodontista specializzato. Analizza questa trascrizione di visita ortodontica e genera una diagnosi e piano di trattamento completo.

ANALISI ORTODONTICA:
- Valuta relazioni dentali e scheletriche
- Classifica malocclusione secondo Angle
- Identifica asimmetrie facciali
- Pianifica estrazioni se necessarie
- Stima durata trattamento

STRUTTURA JSON OBBLIGATORIA:
{
  "motivo_visita": "queixa principale del paziente",
  "anamnesi": "trattamenti precedenti, traumi, abitudini viziate",
  "esame_extraorale": {
    "profilo_facciale": "diritto/convesso/concavo con descrizione",
    "proporzioni": "descrizione faccia e mandibola",
    "asimmetrie": "descrizione se presenti",
    "sorriso": "linea mediana, larghezza, esposizione",
    "respirazione": "nasale/mista"
  },
  "esame_intraoraleale": {
    "relazione_molari": "classe I/II/III di Angle",
    "relazione_canini": "classe I/II/III",
    "overjet": "mm se misurato",
    "overbite": "mm se misurato",
    "linee_mediane": "coincidenti/devia sinistra/destra",
    "affollamento": "lieve/moderato/severo",
    "spacing": "presente/assente, dove",
    "mordita_incrociata": "presente/assente, quali denti",
    "laterodeviazioni": "descrizione se presenti",
    "gengivite": "presente/assente"
  },
  "analisi_radiografica": "relazioni scheletriche, angoli, descrizione",
  "diagnosi_ortodontica": "riassunto malocclusione",
  "piano_trattamento": {
    "apparecchiatura_consigliata": "fisso/mobile/espansore/functional, etc",
    "estrazioni_necessarie": {
      "necessarie": true/false,
      "quali_denti": "es: 1.4, 2.4, 3.4, 4.4"
    },
    "fasi_trattamento": ["fase 1: descrizione", "fase 2: descrizione", etc],
    "durata_stimata": "mesi",
    "frequenza_controlli": "ogni X settimane"
  },
  "prognosi": "risultati attesi e facilità trattamento",
  "costo_estimato": "range se discusso",
  "compromessi": "descrizione se necessari per raggiungere obiettivi"
}

Rispondi SOLO con JSON valido.`
    },

    'visita_parodontale': {
        name: 'Visita Parodontale',
        description: 'Valutazione parodontale e piano di trattamento',
        systemPrompt: `Sei un parodontologo esperto. Analizza questa trascrizione di visita parodontale e genera una valutazione completa con indici.

INDICI PARODONTALI CRITICI:
- PI (Plaque Index): 0-3 (0=niente, 1=scarso, 2=moderato, 3=abbondante)
- BI (Bleeding Index): 0-3 (0=niente, 1=punto isolato, 2=linea emorragica, 3=emorragia spontanea)
- PPD (Pocket Probing Depth): valori in mm per area
- CAL (Clinical Attachment Loss): se misurato

STRUTTURA JSON OBBLIGATORIA:
{
  "anamnesi_parodontale": "fumo, diabete, stress, genetica, igiene, sintomi",
  "indici_parodontali": {
    "pi_index": "valore 0-3 e descrizione",
    "bi_index": "valore 0-3 e descrizione",
    "ppd_sextante_1": "mm, aree profonde",
    "ppd_sextante_2": "mm, aree profonde",
    "ppd_sextante_3": "mm, aree profonde",
    "ppd_sextante_4": "mm, aree profonde",
    "ppd_sextante_5": "mm, aree profonde",
    "ppd_sextante_6": "mm, aree profonde",
    "recessioni_gengivali": "localizzazione e profondità mm",
    "sanguinamento_provenza": "presente/assente, localizzazione"
  },
  "diagnosi_parodontale": {
    "tipo_malattia": "gengivite/parodontite lieve/moderata/severa",
    "classificazione_who": "salute/gengivite/parodontite lieve/moderata/grave",
    "aree_critiche": "localizzazione aree più colpite",
    "localizzazione_siti_attivi": "sedi di malattia attiva"
  },
  "analisi_radiografica": "descrizione riassorbimento osseo, difetti",
  "fattori_di_rischio": ["fumo", "diabete", "igiene", "genetica", etc],
  "piano_trattamento": {
    "fasi": [
      {
        "fase": "eziologica",
        "interventi": "detartrasi, root planing, istruzioni igieniche"
      },
      {
        "fase": "chirurgica",
        "necessaria": true/false,
        "tipo": "descrizione se necessaria"
      },
      {
        "fase": "mantenimento",
        "frequenza": "mesi tra controlli",
        "interventi": "detartrasi di mantenimento, controlli"
      }
    ]
  },
  "istruzioni_igieniche": "dettagliate per il paziente (tecnica spazzolamento, filo, etc)",
  "prognosi": "con/senza trattamento, outlook longtermine",
  "follow_up": "frequenza controlli e richiami"
}

Rispondi SOLO con JSON valido.`
    }
};

// ============================================================================
// TRANSCRIPTION - Trascrizione audio con Whisper
// ============================================================================

/**
 * Trascrivi audio con OpenAI Whisper
 * @param {Buffer|string} audioData - Buffer audio o path al file
 * @returns {Promise<string>} - Testo trascritto in italiano
 */
async function transcribeAudio(audioData) {
    try {
        console.log('🎤 Avvio trascrizione audio con Whisper...');

        // Se audioData è un file path, leggi il file
        let audioBuffer = audioData;
        if (typeof audioData === 'string' && fs.existsSync(audioData)) {
            console.log(`📁 Lettura file audio: ${audioData}`);
            audioBuffer = fs.readFileSync(audioData);
        }

        // Converti Buffer a Blob-like object per axios
        if (!Buffer.isBuffer(audioBuffer) && !(audioBuffer instanceof ArrayBuffer)) {
            throw new Error('audioData deve essere un Buffer o path a file');
        }

        // Crea form-data per upload multipart
        const form = new FormData();
        form.append('file', audioBuffer, { filename: 'audio.webm' });
        form.append('model', 'whisper-1');
        form.append('language', 'it');
        form.append('response_format', 'json');
        form.append('temperature', '0');

        console.log('📤 Invio audio a OpenAI Whisper API...');

        const response = await axios.post(
            `${OPENAI_BASE_URL}/audio/transcriptions`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                timeout: 300000, // 5 minuti per audio lunghi
                maxContentLength: 50 * 1024 * 1024, // 50MB max
                maxBodyLength: 50 * 1024 * 1024
            }
        );

        const transcript = response.data.text || '';
        console.log(`✅ Trascrizione completata: ${transcript.length} caratteri`);

        return transcript;

    } catch (error) {
        console.error('❌ Errore trascrizione Whisper:');
        console.error('   Messaggio:', error.message);
        if (error.response?.data) {
            console.error('   Dettagli:', error.response.data);
        }
        throw new Error(`Trascrizione fallita: ${error.message}`);
    }
}

// ============================================================================
// REFERTO GENERATION - Generazione referto con GPT-4
// ============================================================================

/**
 * Genera referto strutturato tramite GPT-4 Turbo
 * @param {string} transcript - Testo trascritto
 * @param {string} visitType - Tipo di visita (chiave dalla tabella visitTypePrompts)
 * @param {string} doctorName - Nome del medico che ha effettuato la visita
 * @returns {Promise<object>} - Referto strutturato in JSON con dati medico
 */
async function generateReferto(transcript, visitType, doctorName) {
    try {
        console.log(`📋 Generazione referto per tipo: ${visitType}`);
        console.log(`👨‍⚕️ Medico: ${doctorName || 'Non specificato'}`);

        const promptConfig = visitTypePrompts[visitType];
        if (!promptConfig) {
            const supportedTypes = Object.keys(visitTypePrompts).join(', ');
            throw new Error(`Tipo di visita '${visitType}' non supportato. Supportati: ${supportedTypes}`);
        }

        // Assicura che la trascrizione non sia vuota
        if (!transcript || transcript.trim().length === 0) {
            console.warn('⚠️ Attenzione: trascrizione vuota o non valida');
        }

        // Prepara il prompt con informazioni del medico
        const doctorInfo = doctorName ? `\n\nQuesta visita è stata effettuata da: ${doctorName}\nInterpreta il referto come se fosse scritto dal medico stesso in prima persona.` : '';

        const userPrompt = `TRASCRIZIONE DELLA VISITA:
"${transcript || 'Nessuna trascrizione disponibile'}"${doctorInfo}

Analizza la trascrizione sopra e genera un referto strutturato in JSON seguendo ESATTAMENTE la struttura indicata nel system prompt.`;

        console.log('📤 Invio richiesta a GPT-4 Turbo...');

        const response = await axios.post(
            `${OPENAI_BASE_URL}/chat/completions`,
            {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: promptConfig.systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.2, // Bassa creatività per output deterministico
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 secondi
            }
        );

        const refertoString = response.data.choices[0].message.content;
        const referto = typeof refertoString === 'string' ? JSON.parse(refertoString) : refertoString;

        console.log('✅ Referto generato con successo');

        return {
            success: true,
            visitType: visitType,
            visitTypeName: promptConfig.name,
            doctor_name: doctorName || null,
            referto: referto,
            transcript: transcript,
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Errore generazione referto:');
        console.error('   Messaggio:', error.message);
        if (error.response?.data) {
            console.error('   Dettagli API:', error.response.data);
        }
        throw new Error(`Generazione referto fallita: ${error.message}`);
    }
}

// ============================================================================
// ODONTOGRAMMA ANALYSIS - Analisi dati odontogramma
// ============================================================================

/**
 * Analizza il referto per estrarre informazioni sulla odontogramma
 * @param {object} referto - Referto generato da generateReferto()
 * @param {string} visitType - Tipo di visita
 * @returns {Promise<object>} - Dati odontogramma strutturati
 */
async function analyzeOdontogrammaData(referto, visitType) {
    try {
        console.log('🦷 Analisi dati odontogramma...');

        const analysisPrompt = `Basandoti su questo referto dentale:
${JSON.stringify(referto, null, 2)}

Estrai e struttura i dati per ogni dente nel seguente JSON:
{
  "denti": {
    "1": { "numero": "1.1", "status": "sano|carie|mancante|estratto", "procedure": "none|conservativa|endodonzia|estrazione|impianto|sigillante", "note": "descrizione breve" },
    "2": { "numero": "1.2", "status": "...", ... },
    ...fino a 32 denti...
  },
  "summary": {
    "denti_sani": numero,
    "denti_cariati": numero,
    "denti_mancanti": numero,
    "procedure_urgenti": ["lista procedure urgenti"],
    "procedure_differibili": ["lista procedure differibili"]
  }
}

Se il referto non specifica un dente, assumi status "sano". Rispondi SOLO con JSON valido.`;

        const response = await axios.post(
            `${OPENAI_BASE_URL}/chat/completions`,
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Sei un assistente dentale che estrae e struttura dati dall\'odontogramma clinico. Fornisci risposte in JSON valido.'
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                temperature: 0.1, // Minima creatività
                max_tokens: 3000,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000 // 45 secondi
            }
        );

        const odontogrammaString = response.data.choices[0].message.content;
        const odontogrammaData = typeof odontogrammaString === 'string' ? JSON.parse(odontogrammaString) : odontogrammaString;

        console.log('✅ Dati odontogramma estratti e strutturati');

        return odontogrammaData;

    } catch (error) {
        console.warn('⚠️ Errore analisi odontogramma, ritornando struttura vuota:');
        console.warn('   Messaggio:', error.message);

        // Ritorna struttura vuota in caso di errore (il processing non si blocca)
        return {
            denti: {},
            summary: {
                denti_sani: 0,
                denti_cariati: 0,
                denti_mancanti: 0,
                procedure_urgenti: [],
                procedure_differibili: []
            },
            error: error.message
        };
    }
}

// ============================================================================
// COMPLETE PROCESSING PIPELINE - Pipeline completa
// ============================================================================

/**
 * Pipeline completa: Trascrizione -> Referto -> Odontogramma
 * Orchestrazione dell'intero flusso di elaborazione AI
 * 
 * @param {Buffer|string} audioData - Audio file (Buffer) o path al file
 * @param {string} visitType - Tipo di visita (chiave da visitTypePrompts)
 * @param {string} doctorName - Nome del medico che effettua la visita
 * @returns {Promise<object>} - Risultati completi processing con dati medico
 * 
 * @example
 * const result = await processRecordingComplete(audioBuffer, 'prima_visita_generica', 'Dr. Mario Rossi');
 * // Ritorna: { success: true, transcript: "...", referto: {...}, odontogramma: {...}, doctor_name: "Dr. Mario Rossi" }
 */
async function processRecordingComplete(audioData, visitType, doctorName) {
    try {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 AVVIO PROCESSING RECORDING COMPLETO');
        console.log('='.repeat(50));
        console.log(`📋 Tipo visita: ${visitType}`);
        console.log(`👨‍⚕️ Medico: ${doctorName || 'Non specificato'}`);
        console.log(`📊 Dimensione audio: ${Buffer.isBuffer(audioData) ? audioData.length : 'file'} bytes`);

        // ===== STEP 1: TRASCRIZIONE =====
        console.log('\n[STEP 1/3] TRASCRIZIONE AUDIO');
        console.log('-'.repeat(50));
        const transcript = await transcribeAudio(audioData);

        if (!transcript || transcript.trim().length === 0) {
            throw new Error('Trascrizione vuota - impossibile procedere');
        }

        console.log(`✅ Trascritto: ${transcript.length} caratteri`);

        // ===== STEP 2: GENERAZIONE REFERTO =====
        console.log('\n[STEP 2/3] GENERAZIONE REFERTO CLINICO');
        console.log('-'.repeat(50));
        const refertoResult = await generateReferto(transcript, visitType, doctorName);

        if (!refertoResult.success) {
            throw new Error('Fallimento generazione referto');
        }

        console.log('✅ Referto generato');

        // ===== STEP 3: ANALISI ODONTOGRAMMA =====
        console.log('\n[STEP 3/3] ANALISI ODONTOGRAMMA');
        console.log('-'.repeat(50));
        const odontogrammaData = await analyzeOdontogrammaData(refertoResult.referto, visitType);

        console.log('✅ Odontogramma analizzato');

        // ===== RISULTATI FINALI =====
        console.log('\n' + '='.repeat(50));
        console.log('✅ PROCESSING COMPLETATO CON SUCCESSO');
        console.log('='.repeat(50) + '\n');

        return {
            success: true,
            transcript: transcript,
            referto: refertoResult,
            odontogramma: odontogrammaData,
            doctor_name: doctorName || null,
            processedAt: new Date().toISOString(),
            stats: {
                transcriptLength: transcript.length,
                visitType: visitType,
                doctor: doctorName || 'Non specificato',
                processingDuration: 'auto-calculated' // Verrà calcolato dal backend
            }
        };

    } catch (error) {
        console.error('\n' + '='.repeat(50));
        console.error('❌ ERRORE PROCESSING');
        console.error('='.repeat(50));
        console.error('Messaggio:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(50) + '\n');

        return {
            success: false,
            error: error.message,
            doctor_name: doctorName || null,
            processedAt: new Date().toISOString()
        };
    }
}

// ============================================================================
// UTILITY FUNCTIONS - Funzioni di utilità
// ============================================================================

/**
 * Ottiene informazioni su un tipo di visita
 * @param {string} visitType - Tipo di visita
 * @returns {object} - Configurazione del tipo di visita
 */
function getVisitTypeInfo(visitType) {
    return visitTypePrompts[visitType] || null;
}

/**
 * Lista tutti i tipi di visita supportati
 * @returns {array} - Array di tipi di visita supportati
 */
function getSupportedVisitTypes() {
    return Object.keys(visitTypePrompts);
}

/**
 * Valida se un tipo di visita è supportato
 * @param {string} visitType - Tipo di visita da validare
 * @returns {boolean}
 */
function isSupportedVisitType(visitType) {
    return visitType in visitTypePrompts;
}

// ============================================================================
// EXPORTS - Esportazione moduli
// ============================================================================

module.exports = {
    // Funzioni principali
    transcribeAudio,
    generateReferto,
    analyzeOdontogrammaData,
    processRecordingComplete,

    // Utility
    getVisitTypeInfo,
    getSupportedVisitTypes,
    isSupportedVisitType,

    // Configurazioni
    visitTypePrompts
};