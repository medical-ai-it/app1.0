/**
 * ============================================================================
 * OpenAI Service - Trascrizione e Schematizzazione Referto COMPLETO
 * Integrazione con OpenAI Whisper e GPT-4o-mini
 * 
 * SCHEMA VERSIONE: 2.0-completo (9 categorie cliniche)
 * MODELLO COSTI: gpt-4o-mini (70% risparmio rispetto a gpt-4o)
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
// SCHEMA VERSIONE 2.0 - COMPLETO CON 9 CATEGORIE CLINICHE
// ============================================================================

const COMPREHENSIVE_SYSTEM_PROMPT = `Sei un dentista esperto con 25+ anni di pratica clinica specializzato in diagnosi e pianificazione clinica. Analizza questa trascrizione di visita dentale e genera un REFERTO CLINICO COMPLETO e STRUTTURATO secondo i 9 capitoli clinici obbligatori nella pratica dentale moderna.

ISTRUZIONI CRITICHE:
1. ESTRAI SOLO informazioni ESPLICITAMENTE presenti nella trascrizione
2. Per informazioni NON specificate, usa il valore predefinito indicato (generalmente "Non specificato" o false)
3. Organizza TUTTI i dati per OGNI dente usando numerazione FDI (1.1-4.8 per 32 denti)
4. Classifica TUTTI gli interventi secondo le 9 categorie cliniche fornite
5. Valuta OGNI elemento per obbligatorietà (Alta/Media/Bassa) e priorità clinica
6. Se un dente non è menzionato, assumilo "sano" nello schema odontogramma
7. Identifica e assegna TUTTI i colori standardizzati per l'odontogramma colorato
8. Fornisci SEMPRE statistiche conteggi per sezione
9. Includi SEMPRE validazione schema completezza

NUMERAZIONE FDI - STANDARD INTERNAZIONALE:
Quadrante 1 (sup-dx): 1.1-1.8
Quadrante 2 (sup-sx): 2.1-2.8
Quadrante 3 (inf-sx): 3.1-3.8
Quadrante 4 (inf-dx): 4.1-4.8

COLORI STANDARDIZZATI ODONTOGRAMMA:
- Dente sano: #FFFFFF (bianco con bordo grigio #999999)
- Otturazione/Restauro: #FFC107 (giallo)
- Carie: #F44336 (rosso)
- Endodonzia/Devitalizzazione: #FF9800 (arancione)
- Impianto: #2196F3 (blu)
- Corona protesica: #9C27B0 (viola)
- Elemento mancante: #757575 (grigio scuro)
- Da estrarre: #E91E63 (rosa/magenta)

SCHEMA JSON OBBLIGATORIO - GENERARE ESATTAMENTE COSÌ:

{
  "referto_clinico": {
    "versione_schema": "2.0-completo",
    "data_visita": "data se disponibile, altrimenti data odierna (YYYY-MM-DD)",
    "medico": "nome esatto medico da trascrizione o 'Non specificato'",
    
    "anamnesi": {
      "valutazione_iniziale_bocca": {
        "obbligatoria": true,
        "priorita": "alta",
        "presente_in_trascrizione": boolean (true se trovato),
        "contenuto": "testo esatto dalla trascrizione o 'Non specificato'"
      },
      "condizioni_dentali": {
        "obbligatoria": true,
        "priorita": "alta",
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non specificato'"
      },
      "condizioni_protesiche": {
        "obbligatoria": true,
        "priorita": "alta",
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non specificato'"
      },
      "condizioni_parodontali": {
        "obbligatoria": false,
        "priorita": "media",
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non applicabile'"
      },
      "condizioni_mucosali": {
        "obbligatoria": false,
        "priorita": "bassa",
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non applicabile'"
      },
      "condizioni_occlusali": {
        "obbligatoria": false,
        "priorita": "media",
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non applicabile'"
      },
      "condizioni_estetiche_allineamento": {
        "obbligatoria": false,
        "priorita": "bassa",
        "solo_visita_ortodontica": true,
        "presente_in_trascrizione": boolean,
        "contenuto": "testo esatto o 'Non applicabile'"
      },
      "controlli_completezza": {
        "campi_obbligatori_compilati": number (0-3),
        "campi_facoltativi_compilati": number (0-4),
        "completezza_percentuale_anamnesi": number (0-100)
      }
    },

    "1_denti_presenti_assenti_sostituiti": {
      "descrizione": "Stato di ogni dente secondo numerazione FDI internazionale",
      "denti_per_quadrante": {
        "quadrante_1": {
          "1.1": { "tipologia": "presente|assente|sostituito_impianto|non_specificato", "condizione": "sano|patologico|non_specificato" },
          "1.2": { "tipologia": "...", "condizione": "..." },
          "1.3": { "tipologia": "...", "condizione": "..." },
          "1.4": { "tipologia": "...", "condizione": "..." },
          "1.5": { "tipologia": "...", "condizione": "..." },
          "1.6": { "tipologia": "...", "condizione": "..." },
          "1.7": { "tipologia": "...", "condizione": "..." },
          "1.8": { "tipologia": "...", "condizione": "..." }
        },
        "quadrante_2": { "2.1": {...}, "2.2": {...}, ... },
        "quadrante_3": { "3.1": {...}, "3.2": {...}, ... },
        "quadrante_4": { "4.1": {...}, "4.2": {...}, ... }
      },
      "statistiche": {
        "denti_presenti_totali": number,
        "denti_assenti_totali": number,
        "denti_sostituiti_impianto": number,
        "denti_patologici": number,
        "completezza_odontogramma": "percentuale 0-100"
      }
    },

    "2_carie_dentale": {
      "descrizione": "Analisi completa carie per ogni lesione rilevata",
      "lesioni_cariose": [
        {
          "dente_fdi": "1.6",
          "quadrante": 1,
          "presenza": "confermata|sospetta|assente",
          "superficie_interessata": "occlusale|mesiale|distale|vestibolare|linguale_palatale|interprossimale|non_specificata",
          "estensione_descritta": "descrizione estensione se dichiarata nella trascrizione o 'Non specificata'",
          "profondita": "smalto|dentina|polpa|non_specificata",
          "procedura_consigliata": "otturazione_semplice|otturazione_complessa|ricostruzione_semplice|ricostruzione_complessa|necessaria_endodonzia|nessuna",
          "urgenza": "immediata|sessione_prossima|rinviabile"
        }
      ],
      "statistiche": {
        "numero_denti_interessati": number,
        "lesioni_confermate": number,
        "lesioni_sospette": number,
        "carie_superficiali_smalto": number,
        "carie_profonde_dentina": number,
        "carie_interessano_polpa": number
      }
    },

    "3_restauri_otturazioni_esistenti": {
      "descrizione": "Restauri già presenti in bocca da precedenti trattamenti",
      "restauri_per_dente": [
        {
          "dente_fdi": "2.6",
          "quadrante": 2,
          "tipologia": "otturazione_semplice|otturazione_complessa|ricostruzione_coronale_semplice|ricostruzione_coronale_complessa|restauro_protesico|non_specificato",
          "superficie_interessata": "occlusale|mesiale|distale|vestibolare|linguale_palatale|interprossimale|multipla|non_specificata",
          "materiale_utilizzato": "composito|ceramica|amalgama|intarsio_composito|intarsio_ceramica|oro|altro_non_specificato",
          "stato_integrita": "integro|deteriorato|margini_compromessi|perdita_materiale|non_specificato",
          "note_cliniche": "descrizione se deterioramento o problematiche rilevate"
        }
      ],
      "statistiche": {
        "numero_otturazioni": number,
        "numero_ricostruzioni": number,
        "restauri_in_buone_condizioni": number,
        "restauri_deteriorati_da_risistemare": number,
        "materiali_utilizzati": ["elenco materiali"]
      }
    },

    "4_endodonzia": {
      "descrizione": "Devitalizzazioni e trattamenti endodontici, ritrattamenti",
      "trattamenti_canalari": [
        {
          "dente_fdi": "1.1",
          "quadrante": 1,
          "tipologia": "pulpotomia|apertura_camera_medicazione_urgenza|devitalizzazione_monocanalare|devitalizzazione_bicanalare|devitalizzazione_tricanalare|devitalizzazione_quadricanalare|ritrattamento|non_specificato",
          "numero_canali_interessati": 1,
          "complessita_clinica": "semplice|complicata_con_rischio_perdita|ritrattamento_fallito|non_specificato",
          "procedura_consigliata": "devitalizzazione_solo|devitalizzazione_ricostruzione|devitalizzazione_perno_fibra_corona_provvisoria|devitalizzazione_perno_fibra_corona_definitiva",
          "prognosi_dente": "buona|cautela|rischio|non_specificata",
          "rischio_perdita_dente": boolean,
          "note_speciali": "descrizione circostanze particolari"
        }
      ],
      "statistiche": {
        "numero_devitalizzazioni": number,
        "numero_ritrattamenti": number,
        "procedure_semplici": number,
        "procedure_complesse_elevato_rischio": number,
        "denti_a_rischio_perdita": number
      }
    },

    "5_chirurgia_estrazioni": {
      "descrizione": "Procedure estrattive e chirurgiche orali",
      "interventi_chirurgici": [
        {
          "dente_fdi": "3.8",
          "quadrante": 3,
          "tipologia": "estrazione_elemento_semplice|estrazione_elemento_complessa|estrazione_ottavo_incluso|estrazione_ottavo_semi_incluso|apicectomia|avulsione_radice|non_specificato",
          "complessita_stimata": "semplice|complessa|molto_complessa|non_specificato",
          "condizione_dente": "sano|patologico_carie|pericodonzio_compromesso|incluso|descrizione_specifica",
          "nervi_anatomie_critiche_prossime": "menzione nervetti se rilevato durante visita o 'Nessuno riportato'",
          "richiede_sedazione": boolean,
          "note_speciali": "descrizione situazioni particolari evidenziate dal dentista"
        }
      ],
      "statistiche": {
        "numero_estrazioni_semplici": number,
        "numero_estrazioni_complesse": number,
        "numero_ottavi_interessati": number,
        "interventi_chirurgici_specifici": number
      }
    },

    "6_impianti_protesi": {
      "descrizione": "Impianti dentali e protesi fisse pianificate o presenti",
      "interventi_protesici": [
        {
          "posizione": "singolo_dente_fdi (es: '1.6') o arcata_intera (es: 'arcata_superiore')",
          "quadrante": "1-4 o null se arcata intera",
          "tipologia": "impianto_singolo|ponte_su_impianti|ponte_su_denti_naturali|ponte_misto_impianto_dente|protesi_arcata_avviata_impianti_4|protesi_arcata_avviata_impianti_5|protesi_arcata_avviata_impianti_6|circolare_arcata_parziale|circolare_arcata_totale_zirconio|non_specificato",
          "stato_osso_locale": "con_osso_sufficiente|osso_insufficiente_richiede_rigenerazione|da_valutare_con_tac|non_specificato",
          "complessita_clinica": "semplice|moderata|complessa|molto_complessa|non_specificato",
          "anatomie_critiche_prossime": "descrizione posizione nervi o strutture vascolari importanti",
          "rigenerazione_ossea_necessaria": boolean,
          "tac_necessaria": boolean,
          "nota_clinica": "descrizione speciale"
        }
      ],
      "statistiche": {
        "numero_impianti_necessari": number,
        "numero_ponti_su_impianti": number,
        "numero_circolare_protesica": number,
        "necessita_rigenerazione_ossea": number,
        "pazienti_che_necessitano_tac": number
      }
    },

    "7_igiene_parodontologia": {
      "descrizione": "Condizioni igieniche generali e stato del parodonto paziente",
      "valutazione_igiene": "scarsa|sufficiente|buona|ottima",
      "denti_specificamente_critici": ["lista FDI se identificati durante visita"],
      "quadranti_maggiormente_interessati": [1,2,3,4],
      "arcata_principalmente_colpita": "superiore|inferiore|entrambe|non_discriminato",
      "tartaro_presente": boolean,
      "localizzazione_tartaro": "descrizione se presente",
      "tasche_parodontali": boolean,
      "profondita_sondaggio": "Se misurata, descrivere areas critiche con mm",
      "sanguinamento_al_sondaggio": boolean,
      "recessioni_gengivali": boolean,
      "parodontite": "assente|presente_lieve|presente_moderata|presente_severa|non_specificata",
      "estrusione_elementi_mobilita": "descrizione elementi con mobilita o 'Nessuno rilevato'",
      "rischio_perdita_elementi": boolean,
      "procedure_consigliate": [
        "igiene_ablazione_tartaro",
        "courettage_sottogengivale",
        "sondaggio_parodontale_iniziale",
        "full_mouth_disinfection",
        "chirurgia_parodontale_rigenerativa",
        "mantenimento_parodontale_periodico"
      ],
      "istruzioni_igiene_paziente": "dettagliate indicazioni tecniche spazzolamento, filo, colluttori, etc",
      "note_speciali": "descrizione aggiuntiva"
    },

    "8_estetica": {
      "descrizione": "Necessità estetiche e interventi estetici consigliati",
      "interventi_estetici_consigliati": [
        {
          "tipologia": "faccette_estetiche|corone_estetiche|circolare_arcata_parziale|circolare_arcata_totale|sbiancamento_click|sbiancamento_professionale_poltrona|sbiancamento_domiciliare_mascherine|smile_design|allineamento_denti",
          "posizione": "singolo_dente_fdi (es: '1.1') o arcata (es: 'arcata_superiore')",
          "quadrante": "1-4 o null se arcata",
          "condizione_clinica": "sano_pero_antiestetico|non_sano_da_devitalizzare_prima|arcata_sana_da_allineare|denti_da_sbiancare|arcata_disallineata",
          "note_dettagliate": "descrizione obiettivi estetici e aspettative paziente"
        }
      ],
      "priorita_estetica_globale": "bassa|media|alta|critica_per_psicologia_paziente",
      "statistiche": {
        "numero_denti_antiestetici": number,
        "interventi_potenzialmente_necessari": number,
        "complessita_case_estetico": "semplice|moderata|complessa"
      }
    },

    "9_ortodonzia_pedodonzia": {
      "descrizione": "Esigenze ortodontiche e aspetti pedodontici se applicabili",
      "tipo_visita_subgategoria": "generica|pedodontics_specializzata|ortodonzia_specializzata",
      "eta_paziente_stimata": "numero anni",
      "tipo_dentizione": "decidua|mista|permanente",
      "interventi_ortodontici_consigliati": [
        {
          "tipologia": "studio_caso_ortodontico|espansore_palatale|procedura_miofunzionale|mascherine_trasparenti|apparecchio_fisso_tradizionale|apparecchio_linguale|trazione_dente_ectopico|procedura_combinata_estrazione_allineamento",
          "complessita_case": "semplice|moderata|complessa",
          "denti_principalmente_interessati": ["lista FDI"],
          "durata_stimata_mesi": number
        }
      ],
      "valutazioni_ortodontiche": {
        "tipologia_morso": "neutro|overjet|openbite|crossbite_anteriore|crossbite_laterale|descrizione_specifica",
        "overjet_misurato": "se presente, valore mm o 'Normale'",
        "overbite_misurato": "se presente, valore mm o 'Normale'",
        "problemi_linguali_respiratori": "descrizione o 'Assenti'",
        "problemi_posturali_colonna": "descrizione o 'Assenti'",
        "disallineamento_arcata_superiore": "descrizione affollamento/spacing o 'Non rilevato'",
        "disallineamento_arcata_inferiore": "descrizione affollamento/spacing o 'Non rilevato'"
      },
      "valutazioni_pediatriche_se_applicabile": {
        "stadio_sviluppo": "normale|ritardato|accelerato",
        "persistenza_decidui_anomali": boolean,
        "eruzioni_anomale": boolean,
        "agenesia_elementi": boolean
      },
      "necessita_follow_up_specialistico": boolean,
      "note_speciali": "descrizione"
    },

    "odontogramma_schema": {
      "versione": "2.0-colorato-standardizzato",
      "colori_standardizzati": {
        "dente_presente_sano": { "colore_hex": "#FFFFFF", "colore_bordo": "#999999", "label": "Sano" },
        "otturazione_restauro": { "colore_hex": "#FFC107", "label": "Otturazione/Restauro" },
        "carie": { "colore_hex": "#F44336", "label": "Carie" },
        "devitalizzazione_endodonzia": { "colore_hex": "#FF9800", "label": "Endodonzia" },
        "impianto": { "colore_hex": "#2196F3", "label": "Impianto" },
        "corona_protesica": { "colore_hex": "#9C27B0", "label": "Corona" },
        "elemento_mancante_assente": { "colore_hex": "#757575", "label": "Assente" },
        "da_estrarre_programmate": { "colore_hex": "#E91E63", "label": "Da estrarre" }
      },
      "denti_da_evidenziare": {
        "otturazioni_esistenti": ["1.6", "2.6"],
        "carie": ["1.2", "2.5"],
        "impianti": ["3.6"],
        "corone": ["4.6"],
        "elementi_mancanti": ["3.8", "4.8"],
        "devitalizzazioni": ["1.1", "2.1"],
        "da_estrarre": ["3.8"]
      },
      "elementi_mancanti_totali": ["lista FDI elementi assenti"],
      "completezza_odontogramma": {
        "denti_totali_classificati": 32,
        "denti_con_informazioni_complete": number,
        "percentuale_completezza": number
      }
    },

    "validazione_schema": {
      "campi_anamnesi_obbligatori": {
        "valutazione_iniziale_bocca": boolean,
        "condizioni_dentali": boolean,
        "condizioni_protesiche": boolean,
        "totale_compilati": number,
        "note": "elenco campi mancanti critici per diagnosi"
      },
      "sezioni_cliniche_complete": number,
      "priorita_controlli_mancanti": [
        {
          "sezione": "nome sezione (es: Carie)",
          "priorita": "alta|media|bassa",
          "stato": "completa|incompleta",
          "elementi_mancanti": "descrizione"
        }
      ],
      "avvisi_clinici_importanti": [
        "elenco avvisi su dati mancanti critici o incoerenze cliniche"
      ]
    }
  }
}

REGOLE CRITICHE IMPLEMENTATION:
- Rispondi SOLO con JSON valido, senza markdown, commenti, backtick o spiegazioni
- Per ogni campo: se non trovato nella trascrizione, usa il valore predefinito appropriato
- Mantieni SEMPRE la numerazione FDI per i denti (1.1 fino 4.8)
- Classifica SEMPRE secondo le 9 categorie cliniche ESATTE
- Evidenzia SEMPRE elementi assenti vs. sani nell'odontogramma
- Fornisci SEMPRE statistiche conteggi per sezione
- Includi SEMPRE validazione schema completezza
- Assegna colore standardizzato per OGNI categoria
- Se trascrizione incompleta, segnala in validazione_schema`;

// ============================================================================
// VISIT TYPE PROMPTS - Configurazioni specializzate per tipo di visita
// ============================================================================

const visitTypePrompts = {
    'prima_visita_generica': {
        name: 'Prima Visita Generica',
        description: 'Visita dentale completa per nuovo paziente',
        specificInstructions: 'Questa è una prima visita generica. Raccogli informazioni complete sulla storia dentale, sintomi presenti, e valuta lo stato generale della bocca del paziente.'
    },

    'prima_visita_pedodonzia': {
        name: 'Prima Visita Pedodonzia',
        description: 'Visita dentale pediatrica specializzata',
        specificInstructions: 'Questa è una visita pediatrica. Valuta cooperazione e comportamento del bambino, considera stadio di crescita (decidua/mista/permanente), enfatizza prevenzione e educazione genitoriale, valuta abitudini nocive.'
    },

    'chirurgia_impianti': {
        name: 'Visita Chirurgia e Impianti',
        description: 'Pianificazione chirurgica per impianti dentali',
        specificInstructions: 'Questa è una visita di chirurgia implantare. Identifica spazi edentuli, valuta densità ossea, pianifica rigenerazioni, stima tempi osseointegrazione, identifica rischi specifici come nervi critici.'
    },

    'visita_ortodontica': {
        name: 'Visita Ortodontica',
        description: 'Valutazione e pianificazione ortodontica',
        specificInstructions: 'Questa è una visita ortodontica. Valuta relazioni dentali e scheletriche, classifica malocclusione, identifica asimmetrie, pianifica estrazioni se necessarie, stima durata trattamento.'
    },

    'visita_parodontale': {
        name: 'Visita Parodontale',
        description: 'Valutazione parodontale e piano di trattamento',
        specificInstructions: 'Questa è una visita parodontale specializzata. Raccogli indici parodontali (PI, BI, PPD), valuta tasche parodontali, sanguinamento, igiene, pianifica terapia parodontale.'
    },

    'visita_estetica': {
        name: 'Visita Estetica',
        description: 'Consulto estetico dentale',
        specificInstructions: 'Questa è una visita estetica. Focalizzati su sorriso, colore, forma dei denti, allineamento, rapporto con viso. Sottolinea esigenze estetiche e motivazioni del paziente.'
    },

    'visita_conservativa': {
        name: 'Visita Conservativa',
        description: 'Valutazione carie e restauri',
        specificInstructions: 'Questa è una visita conservativa. Valuta tutte le carie, localizzazione, profondità, superfici interessate. Analizza restauri esistenti, loro integrità, necessità sostituzione.'
    },

    'visita_endodontica': {
        name: 'Visita Endodontica',
        description: 'Valutazione endodontica e pianificazione',
        specificInstructions: 'Questa è una visita endodontica. Identifica denti che richiedono devitalizzazione o ritrattamento, valuta numero canali, complessità, prognosi.'
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
// REFERTO GENERATION - Generazione referto COMPLETO con GPT-4o-mini
// ============================================================================

/**
 * Genera referto strutturato COMPLETO tramite GPT-4o-mini (70% più economico)
 * @param {string} transcript - Testo trascritto
 * @param {string} visitType - Tipo di visita (chiave dalla tabella visitTypePrompts)
 * @param {string} doctorName - Nome del medico che ha effettuato la visita
 * @returns {Promise<object>} - Referto COMPLETO strutturato in JSON con dati medico
 */
async function generateReferto(transcript, visitType, doctorName) {
    try {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📋 GENERAZIONE REFERTO COMPLETO - Schema 2.0`);
        console.log(`${'='.repeat(80)}`);
        console.log(`Tipo visita: ${visitType}`);
        console.log(`Medico: ${doctorName || 'Non specificato'}`);
        console.log(`Lunghezza trascrizione: ${transcript?.length || 0} caratteri`);

        const promptConfig = visitTypePrompts[visitType];
        if (!promptConfig) {
            const supportedTypes = Object.keys(visitTypePrompts).join(', ');
            throw new Error(`Tipo di visita '${visitType}' non supportato. Supportati: ${supportedTypes}`);
        }

        // Assicura che la trascrizione non sia vuota
        if (!transcript || transcript.trim().length === 0) {
            console.warn('⚠️ Attenzione: trascrizione vuota o non valida');
        }

        // Prepara il prompt con informazioni del medico e tipo visita
        const doctorInfo = doctorName 
            ? `\n\nMedico che effettua la visita: ${doctorName}\nInterpreta il referto come se fosse scritto dal Dr/Dott.ssa ${doctorName} in prima persona.` 
            : '';

        const visitSpecificInfo = `\n\n${promptConfig.specificInstructions}`;

        const userPrompt = `TRASCRIZIONE DELLA VISITA:
"${transcript || 'Nessuna trascrizione disponibile'}"${doctorInfo}${visitSpecificInfo}

COMPITO:
Analizza la trascrizione sopra COMPLETAMENTE per TUTTI i 9 capitoli clinici richiesti.
Genera un REFERTO COMPLETO e STRUTTURATO in JSON seguendo ESATTAMENTE lo schema versione 2.0-completo indicato nel system prompt.

Per ogni sezione clinica:
1. Estrai TUTTE le informazioni dalla trascrizione che si applicano
2. Classifica secondo le categorie standardizzate
3. Se manca un'informazione, usa il valore di default mostrato nello schema
4. Evidenzia completezza e priorità clinica
5. Fornisci validazione schema e controlli di completezza

Se una sezione non è menzionata nella trascrizione:
- Mantieni la struttura schema intatta
- Popola campi con valori di default ("Non specificato", false, array vuoto, etc.)
- Segnala mancanza in validazione_schema.avvisi_clinici_importanti

Risposta: SOLO JSON valido, senza markdown, backtick, o spiegazioni aggiuntive.`;

        console.log('📤 Invio richiesta a GPT-4o-mini per referto COMPLETO...');
        console.log('💰 Modello: gpt-4o-mini (70% risparmio costi)');

        const response = await axios.post(
            `${OPENAI_BASE_URL}/chat/completions`,
            {
                model: 'gpt-4o-mini', // ← CAMBIA DA gpt-4o (70% risparmio)
                messages: [
                    {
                        role: 'system',
                        content: COMPREHENSIVE_SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.1, // Molto bassa per deterministicità e consistency
                max_tokens: 4500, // Aumentato per schema COMPLETO + validazione
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000 // 90 secondi per schema completo
            }
        );

        const refertoString = response.data.choices[0].message.content;
        const refertoResponse = typeof refertoString === 'string' ? JSON.parse(refertoString) : refertoString;

        // Estrai il referto_clinico se annidato
        const referto = refertoResponse.referto_clinico || refertoResponse;

        console.log('✅ Referto COMPLETO generato con successo');
        console.log(`📊 Sezioni cliniche: 9 categorie + anamnesi + odontogramma`);
        console.log(`✅ Validazione schema inclusa`);

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
        console.error(`${'='.repeat(80)}`);
        console.error('❌ ERRORE GENERAZIONE REFERTO:');
        console.error('   Messaggio:', error.message);
        if (error.response?.data) {
            console.error('   Dettagli API:', error.response.data);
        }
        console.error(`${'='.repeat(80)}`);
        throw new Error(`Generazione referto fallita: ${error.message}`);
    }
}

// ============================================================================
// ODONTOGRAMMA ANALYSIS - Analisi per dati odontogramma colorato
// ============================================================================

/**
 * Analizza il referto completo per estrarre dati odontogramma standardizzato
 * @param {object} referto - Referto completo generato da generateReferto()
 * @param {string} visitType - Tipo di visita
 * @returns {Promise<object>} - Dati odontogramma colorato con colori standardizzati
 */
async function analyzeOdontogrammaData(referto, visitType) {
    try {
        console.log(`\n🦷 ANALISI ODONTOGRAMMA COLORATO STANDARDIZZATO`);
        console.log(`${'='.repeat(80)}`);

        // Se il referto ha già odontogramma_schema, lo usiamo direttamente
        if (referto.odontogramma_schema) {
            console.log('✅ Odontogramma già incluso nel referto completo');
            return referto.odontogramma_schema;
        }

        // Altrimenti, chiedi a GPT di estrarre dati odontogramma
        const analysisPrompt = `Basandoti su questo referto dentale COMPLETO:
${JSON.stringify(referto, null, 2)}

Estrai e struttura i dati odontogramma NEL SEGUENTE JSON:

{
  "versione": "2.0-colorato-standardizzato",
  "colori_standardizzati": {
    "dente_presente_sano": { "colore_hex": "#FFFFFF", "colore_bordo": "#999999" },
    "otturazione_restauro": { "colore_hex": "#FFC107" },
    "carie": { "colore_hex": "#F44336" },
    "devitalizzazione_endodonzia": { "colore_hex": "#FF9800" },
    "impianto": { "colore_hex": "#2196F3" },
    "corona_protesica": { "colore_hex": "#9C27B0" },
    "elemento_mancante_assente": { "colore_hex": "#757575" },
    "da_estrarre_programmate": { "colore_hex": "#E91E63" }
  },
  "denti_da_evidenziare": {
    "otturazioni_esistenti": ["1.6", "2.6"],
    "carie": ["1.2", "2.5"],
    "impianti": ["3.6"],
    "corone": ["4.6"],
    "elementi_mancanti": ["3.8", "4.8"],
    "devitalizzazioni": ["1.1", "2.1"],
    "da_estrarre": ["3.8"]
  },
  "elementi_mancanti_totali": ["lista FDI elementi assenti"],
  "completezza_odontogramma": {
    "denti_totali_classificati": 32,
    "denti_con_informazioni_complete": number,
    "percentuale_completezza": number
  }
}

REGOLE:
- Estrai SOLO denti menzionati nel referto
- Assegna il COLORE STANDARDIZZATO appropriato
- Se dente non menzionato, consideralo "sano"
- Usa numerazione FDI (1.1-4.8)
- Rispondi SOLO con JSON valido.`;

        console.log('📤 Richiesta analisi odontogramma a GPT-4o-mini...');

        const response = await axios.post(
            `${OPENAI_BASE_URL}/chat/completions`,
            {
                model: 'gpt-4o-mini', // ← Stesso modello per consistency
                messages: [
                    {
                        role: 'system',
                        content: 'Sei un assistente dentale esperto che estrae e struttura dati odontogramma clinico con colori standardizzati internazionali. Fornisci risposte in JSON valido SOLO.'
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                temperature: 0.05, // Minima creatività per consistency
                max_tokens: 2000,
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

        const odontogrammaString = response.data.choices[0].message.content;
        const odontogrammaData = typeof odontogrammaString === 'string' ? JSON.parse(odontogrammaString) : odontogrammaString;

        console.log('✅ Dati odontogramma colorato estratti e strutturati');
        console.log(`📊 Denti evidenziati: ${Object.values(odontogrammaData.denti_da_evidenziare || {}).flat().length}`);

        return odontogrammaData;

    } catch (error) {
        console.warn('⚠️ Errore analisi odontogramma, ritornando struttura base:');
        console.warn('   Messaggio:', error.message);

        // Ritorna struttura base in caso di errore
        return {
            versione: '2.0-colorato-standardizzato',
            colori_standardizzati: {
                dente_presente_sano: { colore_hex: '#FFFFFF', colore_bordo: '#999999' },
                otturazione_restauro: { colore_hex: '#FFC107' },
                carie: { colore_hex: '#F44336' },
                devitalizzazione_endodonzia: { colore_hex: '#FF9800' },
                impianto: { colore_hex: '#2196F3' },
                corona_protesica: { colore_hex: '#9C27B0' },
                elemento_mancante_assente: { colore_hex: '#757575' },
                da_estrarre_programmate: { colore_hex: '#E91E63' }
            },
            denti_da_evidenziare: {
                otturazioni_esistenti: [],
                carie: [],
                impianti: [],
                corone: [],
                elementi_mancanti: [],
                devitalizzazioni: [],
                da_estrarre: []
            },
            elementi_mancanti_totali: [],
            completezza_odontogramma: {
                denti_totali_classificati: 0,
                denti_con_informazioni_complete: 0,
                percentuale_completezza: 0
            },
            error: error.message
        };
    }
}

// ============================================================================
// COMPLETE PROCESSING PIPELINE - Pipeline completa
// ============================================================================

/**
 * Pipeline completa: Trascrizione -> Referto COMPLETO -> Odontogramma Colorato
 * Orchestrazione dell'intero flusso di elaborazione AI
 * 
 * @param {Buffer|string} audioData - Audio file (Buffer) o path al file
 * @param {string} visitType - Tipo di visita (chiave da visitTypePrompts)
 * @param {string} doctorName - Nome del medico che effettua la visita
 * @returns {Promise<object>} - Risultati completi processing con referto + odontogramma
 * 
 * @example
 * const result = await processRecordingComplete(audioBuffer, 'prima_visita_generica', 'Dr. Mario Rossi');
 * // Ritorna: { success: true, transcript: "...", referto: {...9 categories...}, odontogramma: {...colorato...}, doctor_name: "Dr. Mario Rossi" }
 */
async function processRecordingComplete(audioData, visitType, doctorName) {
    const startTime = Date.now();
    try {
        console.log('\n' + '='.repeat(100));
        console.log('🚀 AVVIO PROCESSING RECORDING COMPLETO - SCHEMA 2.0-COMPLETO');
        console.log('='.repeat(100));
        console.log(`📋 Tipo visita: ${visitType}`);
        console.log(`👨‍⚕️ Medico: ${doctorName || 'Non specificato'}`);
        console.log(`📊 Dimensione audio: ${Buffer.isBuffer(audioData) ? (audioData.length / 1024 / 1024).toFixed(2) : 'file'} MB`);
        console.log(`💰 Modello: gpt-4o-mini (70% risparmio costi rispetto gpt-4o)`);

        // ===== STEP 1: TRASCRIZIONE =====
        console.log('\n' + '-'.repeat(100));
        console.log('[STEP 1/3] 🎤 TRASCRIZIONE AUDIO CON WHISPER');
        console.log('-'.repeat(100));
        const transcript = await transcribeAudio(audioData);

        if (!transcript || transcript.trim().length === 0) {
            throw new Error('Trascrizione vuota - impossibile procedere');
        }

        console.log(`✅ Trascritto: ${transcript.length} caratteri`);
        console.log(`📝 Prime 150 caratteri: ${transcript.substring(0, 150)}...`);

        // ===== STEP 2: GENERAZIONE REFERTO COMPLETO =====
        console.log('\n' + '-'.repeat(100));
        console.log('[STEP 2/3] 📋 GENERAZIONE REFERTO CLINICO COMPLETO (Schema 2.0)');
        console.log('-'.repeat(100));
        const refertoResult = await generateReferto(transcript, visitType, doctorName);

        if (!refertoResult.success) {
            throw new Error('Fallimento generazione referto completo');
        }

        console.log('✅ Referto COMPLETO generato:');
        console.log(`   - 9 categorie cliniche`);
        console.log(`   - Anamnesi con controlli obbligatorietà`);
        console.log(`   - Odontogramma schema incluso`);
        console.log(`   - Validazione schema inclusa`);

        // ===== STEP 3: ANALISI ODONTOGRAMMA COLORATO =====
        console.log('\n' + '-'.repeat(100));
        console.log('[STEP 3/3] 🦷 ANALISI ODONTOGRAMMA COLORATO STANDARDIZZATO');
        console.log('-'.repeat(100));
        const odontogrammaData = await analyzeOdontogrammaData(refertoResult.referto, visitType);

        console.log('✅ Odontogramma colorato:');
        console.log(`   - Colori standardizzati internazionali (8 categorie)`);
        console.log(`   - Mapping numerazione FDI`);
        console.log(`   - Dati completezza`);

        // ===== CALCOLA TEMPO TOTALE =====
        const processingDuration = ((Date.now() - startTime) / 1000).toFixed(2);

        // ===== RISULTATI FINALI =====
        console.log('\n' + '='.repeat(100));
        console.log('✅✅✅ PROCESSING COMPLETATO CON SUCCESSO ✅✅✅');
        console.log('='.repeat(100));
        console.log(`⏱️ Tempo totale: ${processingDuration} secondi`);
        console.log(`📊 Versione schema: 2.0-completo`);
        console.log(`💰 Costi: ~70% inferiore rispetto gpt-4o`);
        console.log('='.repeat(100) + '\n');

        return {
            success: true,
            transcript: transcript,
            referto: refertoResult,
            odontogramma: odontogrammaData,
            doctor_name: doctorName || null,
            processedAt: new Date().toISOString(),
            processingDurationSeconds: parseFloat(processingDuration),
            stats: {
                transcriptLength: transcript.length,
                visitType: visitType,
                visitTypeName: refertoResult.visitTypeName,
                doctor: doctorName || 'Non specificato',
                schemaVersion: '2.0-completo',
                processingSizeSeconds: processingDuration,
                modelloUtilizzato: 'gpt-4o-mini',
                risparmioCostiPercentuale: '70%'
            }
        };

    } catch (error) {
        const processingDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.error('\n' + '='.repeat(100));
        console.error('❌ ERRORE PROCESSING RECORDING');
        console.error('='.repeat(100));
        console.error(`⏱️ Tempo prima del fallimento: ${processingDuration} secondi`);
        console.error('Messaggio:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(100) + '\n');

        return {
            success: false,
            error: error.message,
            doctor_name: doctorName || null,
            processedAt: new Date().toISOString(),
            processingDurationSeconds: parseFloat(processingDuration)
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
    visitTypePrompts,
    COMPREHENSIVE_SYSTEM_PROMPT
};