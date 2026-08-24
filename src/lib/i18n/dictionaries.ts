import type { Locale } from "@/lib/i18n/config";

/**
 * Dizionario dell'interfaccia. L'inglese e' la sorgente di verita': la sua forma
 * definisce il tipo `Dictionary`, quindi ogni altra lingua deve coprire le stesse
 * chiavi o il build fallisce. I segnaposto `{nome}` si risolvono con `format()`.
 */
const en = {
  common: {
    appName: "ChatPDF",
    tagline: "Assisted PDF reading",
  },
  nav: {
    language: "Language",
    signOut: "Sign out",
  },
  home: {
    intro:
      "Upload a PDF and ask questions about its content. Every answer cites the page it comes from, and that page opens with a click.",
    documentsHeading: "Uploaded documents",
    documentsEmpty: "No documents uploaded yet.",
  },
  login: {
    intro: "Sign in to upload your PDFs and find them again when you come back.",
    signIn: "Sign in",
    signUp: "Create account",
    email: "Email",
    password: "Password",
    submitting: "Please wait...",
    confirmEmail:
      "We sent you a confirmation email: open it to activate your account.",
    failed: "Authentication failed. Try again.",
  },
  dropzone: {
    idle: "Drag a PDF here, or click to select one",
    hint: "PDF only, up to {size} MB",
    dragActive: "Drop the PDF here",
    uploading: "Uploading",
    uploadingFile: "Uploading {name}...",
    registering: "Registering the document...",
    sessionExpired: "Session expired",
    createFailed: "Could not create the document",
    uploadFailed: "Upload failed. Try again.",
    oneFileOnly: "Upload one PDF at a time.",
    tooLarge: "The file is larger than {size} MB. Upload a lighter PDF.",
    invalidType: "Only PDF files are allowed.",
    invalidFile: "Invalid file. Upload a PDF of at most {size} MB.",
  },
  status: {
    pending: "Queued",
    processing: "Indexing",
    ready: "Ready",
    error: "Failed",
  },
  document: {
    paneDocument: "Document",
    paneChat: "Chat",
    indexing: "Indexing in progress",
    chunkProgress: "{processed}/{total} chunks",
    retry: "Retry",
    processingFailed: "PDF processing failed. Try again.",
    missingFile:
      "The file is no longer available in Storage: upload the PDF again.",
    missingFileViewer:
      "The file is no longer available in Storage. Upload the PDF again to view it.",
  },
  chat: {
    heading: "Conversation",
    clear: "Clear",
    apiKey: "API key",
    emptyReady:
      "Ask a question about the document. Every answer cites the page it comes from: click it to open that page.",
    emptyWaiting: "The chat opens as soon as the document has been indexed.",
    suggestions: [
      "Summarise the document in five points",
      "What is the conclusion?",
      "List the dates and deadlines mentioned",
    ],
    searching: "Searching the document",
    failed: "The answer stopped before it arrived.",
    retry: "Retry",
    placeholderReady: "Ask a question about the document",
    placeholderWaiting: "Waiting for indexing",
    stop: "Stop",
    send: "Send",
    inputHint: "Enter to send, Shift+Enter for a new line",
  },
  apiKey: {
    label: "Personal API key",
    active: "Active",
    placeholderNew: "Paste your key",
    placeholderReplace: "Replace the saved key",
    save: "Save",
    remove: "Remove",
    help: "Used to generate answers instead of the default key. It stays in this browser only and is sent to the server with every question. Document search always uses the server key.",
  },
  viewer: {
    opening: "Opening the document",
    loadFailed:
      "The PDF cannot be opened. Reload the page or upload the file again.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    pageIndicator: "Page {current} of {total}",
  },
  metadata: {
    title: "ChatPDF",
    description: "Upload a PDF and ask questions about its content.",
  },
  // Messaggi prodotti dalle API Route e mostrati cosi' come sono nella UI.
  api: {
    invalidPayload: "Invalid payload",
    invalidStoragePath: "Invalid storage path",
    noQuestion: "No user question in the messages",
    documentNotFound: "Document not found",
    documentNotReady: "The document is not ready yet",
    generationFailed: "Could not generate the answer",
    createDocumentFailed: "Could not create the document",
    readDocumentFailed: "Could not read the document",
    updateDocumentFailed: "Could not update the document",
    pdfWithoutText:
      "This PDF has no selectable text: it looks like a scan. An OCR version is needed to chat about it.",
    rateLimited: "Too many requests: try again in {wait}.",
    second: "{count} second",
    seconds: "{count} seconds",
    minute: "{count} minute",
    minutes: "{count} minutes",
  },
};

export type Dictionary = typeof en;

const it: Dictionary = {
  common: {
    appName: "ChatPDF",
    tagline: "Lettura assistita di PDF",
  },
  nav: {
    language: "Lingua",
    signOut: "Esci",
  },
  home: {
    intro:
      "Carica un PDF e fai domande sul suo contenuto. Ogni risposta cita la pagina da cui viene, e la pagina si apre con un clic.",
    documentsHeading: "Documenti caricati",
    documentsEmpty: "Nessun documento caricato per ora.",
  },
  login: {
    intro: "Accedi per caricare i tuoi PDF e ritrovarli quando torni.",
    signIn: "Accedi",
    signUp: "Crea account",
    email: "Email",
    password: "Password",
    submitting: "Attendi...",
    confirmEmail:
      "Ti abbiamo inviato un'email di conferma: aprila per attivare l'account.",
    failed: "Autenticazione non riuscita. Riprova.",
  },
  dropzone: {
    idle: "Trascina un PDF qui, o clicca per selezionarlo",
    hint: "Solo PDF, massimo {size} MB",
    dragActive: "Rilascia il PDF qui",
    uploading: "Caricamento in corso",
    uploadingFile: "Caricamento di {name} in corso...",
    registering: "Registrazione del documento...",
    sessionExpired: "Sessione scaduta",
    createFailed: "Creazione del documento fallita",
    uploadFailed: "Caricamento non riuscito. Riprova.",
    oneFileOnly: "Carica un solo PDF alla volta.",
    tooLarge: "Il file supera {size} MB. Carica un PDF piu' leggero.",
    invalidType: "Sono ammessi solo file PDF.",
    invalidFile: "File non valido. Carica un PDF di massimo {size} MB.",
  },
  status: {
    pending: "In coda",
    processing: "Indicizzazione",
    ready: "Pronto",
    error: "Non riuscita",
  },
  document: {
    paneDocument: "Documento",
    paneChat: "Chat",
    indexing: "Indicizzazione in corso",
    chunkProgress: "{processed}/{total} blocchi",
    retry: "Riprova",
    processingFailed: "Elaborazione del PDF non riuscita. Riprova.",
    missingFile:
      "Il file non e' piu' raggiungibile su Storage: carica di nuovo il PDF.",
    missingFileViewer:
      "Il file non e' piu' raggiungibile su Storage. Carica di nuovo il PDF per rivederlo.",
  },
  chat: {
    heading: "Conversazione",
    clear: "Svuota",
    apiKey: "Chiave API",
    emptyReady:
      "Fai una domanda sul documento. Ogni risposta cita la pagina da cui viene: cliccala per aprirla.",
    emptyWaiting: "La chat si apre appena il documento e' stato indicizzato.",
    suggestions: [
      "Riassumi il documento in cinque punti",
      "Qual e' la conclusione?",
      "Elenca date e scadenze citate",
    ],
    searching: "Ricerca nel documento in corso",
    failed: "La risposta si e' interrotta prima di arrivare.",
    retry: "Riprova",
    placeholderReady: "Fai una domanda sul documento",
    placeholderWaiting: "In attesa dell'indicizzazione",
    stop: "Ferma",
    send: "Invia",
    inputHint: "Invio per inviare, Maiusc+Invio per andare a capo",
  },
  apiKey: {
    label: "Chiave API personale",
    active: "Attiva",
    placeholderNew: "Incolla la tua chiave",
    placeholderReplace: "Sostituisci la chiave salvata",
    save: "Salva",
    remove: "Rimuovi",
    help: "Serve per generare le risposte al posto della chiave di default. Resta salvata solo in questo browser e viene inviata al server a ogni domanda. La ricerca nel documento usa sempre la chiave del server.",
  },
  viewer: {
    opening: "Apertura del documento",
    loadFailed:
      "Il PDF non si apre. Ricarica la pagina o carica di nuovo il file.",
    zoomIn: "Aumenta lo zoom",
    zoomOut: "Riduci lo zoom",
    pageIndicator: "Pagina {current} di {total}",
  },
  metadata: {
    title: "ChatPDF",
    description: "Carica un PDF e fai domande sul suo contenuto.",
  },
  api: {
    invalidPayload: "Payload non valido",
    invalidStoragePath: "Percorso di Storage non valido",
    noQuestion: "Nessuna domanda dell'utente nei messaggi",
    documentNotFound: "Documento non trovato",
    documentNotReady: "Il documento non e' ancora pronto",
    generationFailed: "Generazione della risposta fallita",
    createDocumentFailed: "Impossibile creare il documento",
    readDocumentFailed: "Impossibile leggere il documento",
    updateDocumentFailed: "Impossibile aggiornare il documento",
    pdfWithoutText:
      "Questo PDF non contiene testo selezionabile: sembra una scansione. Serve una versione con OCR per poterci chattare sopra.",
    rateLimited: "Troppe richieste: riprova tra {wait}.",
    second: "{count} secondo",
    seconds: "{count} secondi",
    minute: "{count} minuto",
    minutes: "{count} minuti",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
