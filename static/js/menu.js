// Menu - JavaScript per visualizzazione a box delle categorie
// Connessione Socket.IO per aggiornamenti in tempo reale (se disponibile)
let socket = null;

// Inizializza Socket.IO se disponibile
if (typeof io !== 'undefined') {
    socket = io();
} else {
    console.warn('Socket.IO non disponibile - funzionalità real-time disabilitate');
}

let categorie = [];
let categorieGenitore = [];
let prodottiCorrente = [];
let categorieCorrente = [];
let categoriaGenitoreCorrente = null;
let ultimoAggiornamento = Date.now();

// Cache per i dati delle categorie e prodotti
let cacheCategorie = null;
let cacheProdotti = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 secondi

// Sistema di gestione errori e feedback
const ErrorManager = {
    // Tipi di errore
    ERROR_TYPES: {
        NETWORK: 'network',
        TIMEOUT: 'timeout',
        SERVER: 'server',
        PARSING: 'parsing',
        UNKNOWN: 'unknown'
    },

    // Determina il tipo di errore
    getErrorType(error) {
        if (!navigator.onLine) return this.ERROR_TYPES.NETWORK;
        if (error.name === 'AbortError') return this.ERROR_TYPES.TIMEOUT;
        if (error.message.includes('HTTP error')) return this.ERROR_TYPES.SERVER;
        if (error.message.includes('JSON')) return this.ERROR_TYPES.PARSING;
        return this.ERROR_TYPES.UNKNOWN;
    },

    // Ottieni messaggio di errore user-friendly
    getErrorMessage(error) {
        const type = this.getErrorType(error);
        const messages = {
            [this.ERROR_TYPES.NETWORK]: 'Connessione internet non disponibile. Verifica la tua connessione.',
            [this.ERROR_TYPES.TIMEOUT]: 'Richiesta scaduta. Il server sta impiegando troppo tempo a rispondere.',
            [this.ERROR_TYPES.SERVER]: 'Errore del server. Riprova tra qualche minuto.',
            [this.ERROR_TYPES.PARSING]: 'Errore nei dati ricevuti. Contatta il supporto tecnico.',
            [this.ERROR_TYPES.UNKNOWN]: 'Si è verificato un errore imprevisto. Riprova.'
        };
        return messages[type] || messages[this.ERROR_TYPES.UNKNOWN];
    },

    // Mostra errore con opzioni di retry
    showError(container, error, retryCallback = null, backCallback = null) {
        const errorMessage = this.getErrorMessage(error);
        const errorType = this.getErrorType(error);
        
        let retryButton = '';
        if (retryCallback) {
            retryButton = `
                <button class="btn btn-primary me-2" onclick="(${retryCallback.toString()})()">
                    <i class="fas fa-redo me-2"></i>Riprova
                </button>
            `;
        }

        let backButton = '';
        if (backCallback) {
            backButton = `
                <button class="btn btn-outline-secondary" onclick="(${backCallback.toString()})()">
                    <i class="fas fa-arrow-left me-2"></i>Torna indietro
                </button>
            `;
        }

        const iconClass = errorType === this.ERROR_TYPES.NETWORK ? 'fa-wifi' : 'fa-exclamation-triangle';
        const iconColor = errorType === this.ERROR_TYPES.NETWORK ? 'text-danger' : 'text-warning';

        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas ${iconClass} fa-3x ${iconColor} mb-3"></i>
                    <h4 class="text-muted">Errore nel caricamento</h4>
                    <p class="text-muted mb-4">${errorMessage}</p>
                    <div class="d-flex justify-content-center gap-2">
                        ${retryButton}
                        ${backButton}
                    </div>
                    <small class="text-muted mt-3 d-block">
                        Dettagli tecnici: ${error.message}
                    </small>
                </div>
            </div>
        `;
    }
};

// Sistema di loading migliorato
const LoadingManager = {
    show(container, message = 'Caricamento in corso...', showProgress = false) {
        let progressBar = '';
        if (showProgress) {
            progressBar = `
                <div class="progress mt-3" style="width: 200px; margin: 0 auto;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 100%"></div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-4">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                    <p class="text-muted mb-0">${message}</p>
                    ${progressBar}
                </div>
            </div>
        `;
    },

    showInline(element, size = 'sm') {
        const spinnerSize = size === 'lg' ? 'spinner-border' : 'spinner-border spinner-border-sm';
        element.innerHTML = `
            <div class="${spinnerSize} text-primary me-2" role="status">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            Caricamento...
        `;
        element.disabled = true;
    },

    hide(element) {
        if (element.tagName === 'BUTTON') {
            element.disabled = false;
        }
    }
};

// Funzione fetch migliorata con timeout e retry
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            credentials: 'include',
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Funzione per controllare aggiornamenti periodicamente (solo se Socket.IO non è disponibile)
function controllaAggiornamenti() {
    // Solo se non abbiamo Socket.IO attivo
    if (!socket) {
        fetch('/api/menu/last-update')
            .then(response => response.json())
            .then(data => {
                if (data.timestamp > ultimoAggiornamento) {
                    console.log('Rilevato aggiornamento - aggiorno cache e ricarico dati');
                    ultimoAggiornamento = data.timestamp;
                    // Invalida cache e ricarica solo i dati necessari
                    invalidaCacheEAggiorna();
                }
            })
            .catch(error => {
                console.log('Errore nel controllo aggiornamenti:', error);
            });
    }
}

// Funzione per invalidare cache e aggiornare solo i dati necessari
function invalidaCacheEAggiorna() {
    cacheCategorie = null;
    cacheProdotti.clear();
    cacheTimestamp = 0;
    
    // Ricarica solo le categorie se siamo nella vista principale
    if (document.querySelector('.categories-grid')) {
        caricaCategorie().then(() => {
            mostraCategorie();
        });
    }
    
    // Se stiamo visualizzando prodotti di una categoria, ricarica quelli
    const categoriaAttiva = document.querySelector('.category-products');
    if (categoriaAttiva) {
        const categoriaId = categoriaAttiva.dataset.categoriaId;
        if (categoriaId) {
            visualizzaProdottiCategoria(parseInt(categoriaId), categoriaAttiva.dataset.nomeCategoria);
        }
    }
}

// Avvia il controllo periodico ogni 30 secondi (solo se Socket.IO non è disponibile)
// Ridotto ulteriormente perché ora non ricarica tutta la pagina
if (!socket) {
    setInterval(controllaAggiornamenti, 30000);
}

// Funzione per mostrare notifica
function showToast(message) {
    document.getElementById('toast-message').textContent = message;
    const toast = new bootstrap.Toast(document.getElementById('liveToast'));
    toast.show();
}

// Funzione per creare card prodotto all'interno di una categoria
function createProductCard(prodotto) {
    // Costruisci il contenuto della card
    let cardContent = `
        <div class="col-md-6 mb-3" data-prodotto-id="${prodotto.id}">
            <div class="card h-100 shadow-sm prodotto-card">
    `;
    
    // Aggiungi foto se presente
    if (prodotto.foto) {
        cardContent += `
                <div class="card-img-top-container">
                    <img src="/static/${prodotto.foto}" class="card-img-top" alt="${prodotto.nome}" loading="lazy" style="height: 200px; object-fit: cover; width: 100%;">
                </div>
        `;
    }
    
    cardContent += `
                <div class="card-body">
                    <h4 class="card-title fw-bold mb-3">${prodotto.nome}</h4>
    `;
    
    // Aggiungi descrizione
    if (prodotto.descrizione) {
        cardContent += `<p class="card-text small text-muted mb-3">${prodotto.descrizione}</p>`;
    }
    
    // Aggiungi ingredienti se presenti
    if (prodotto.ingredienti && prodotto.ingredienti.length > 0) {
        cardContent += `
            <div class="mb-2">
                <small class="text-muted"><strong>Ingredienti:</strong> ${prodotto.ingredienti.join(', ')}</small>
            </div>
        `;
    }
    
    // Aggiungi allergeni se presenti
    if (prodotto.allergeni && prodotto.allergeni.length > 0) {
        cardContent += `
            <div class="mb-2">
                <small class="text-muted"><strong>Allergeni:</strong></small>
                <div class="d-flex flex-wrap gap-1 mt-1">
        `;
        
        prodotto.allergeni.forEach(allergene => {
            const icona = allergene.icona || '⚠️';
            cardContent += `
                    <span class="text-muted" style="font-size: 0.8em;">
                        ${icona} ${allergene.nome}
                    </span>
            `;
        });
        
        cardContent += `
                </div>
            </div>
        `;
    }
    
    cardContent += `
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="text-success mb-0">€${parseFloat(prodotto.prezzo).toFixed(2)}</h5>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return cardContent;
}

// Funzione per creare un box categoria genitore
function createCategoryBox(categoria) {
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card shadow h-100 categoria-card categoria-genitore" data-categoria-id="${categoria.id}">
                <div class="card-header bg-primary text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-folder me-2"></i>${categoria.nome}
                        </h5>
                        <span class="badge bg-light text-primary">
                            ${categoria.prodotti_count || 0} prodott${(categoria.prodotti_count || 0) === 1 ? 'o' : 'i'}
                        </span>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    ${categoria.descrizione ? 
                        `<p class="card-text text-muted flex-grow-1">${categoria.descrizione}</p>` : 
                        `<p class="card-text text-muted flex-grow-1">Categoria principale del menu</p>`
                    }
                    <div class="mt-auto">
                        <button class="btn btn-outline-primary w-100" onclick="visualizzaProdottiCategoria(${categoria.id}, ${JSON.stringify(categoria.nome)})">
                            <i class="fas fa-eye me-2"></i>Visualizza Prodotti
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funzione per caricare le categorie con cache
// Variabile per il debouncing delle richieste
let caricamentoCategorieInCorso = false;

function caricaCategorie() {
    // Evita richieste multiple simultanee
    if (caricamentoCategorieInCorso) {
        return Promise.resolve();
    }
    
    // Controlla se abbiamo dati in cache validi
    const now = Date.now();
    if (cacheCategorie && (now - cacheTimestamp) < CACHE_DURATION) {
        categorie = cacheCategorie;
        categorieGenitore = categorie; // Assegna anche a categorieGenitore
        console.log('Categorie caricate dalla cache:', categorie);
        return Promise.resolve();
    }
    
    caricamentoCategorieInCorso = true;
    const lang = window.languageSelector ? window.languageSelector.getCurrentLanguage() : 'it';
    
    return fetchWithTimeout(`/api/categorie-menu?lang=${lang}`)
        .then(response => response.json())
        .then(data => {
            categorie = data;
            categorieGenitore = categorie; // Assegna anche a categorieGenitore
            // Aggiorna cache
            cacheCategorie = data;
            cacheTimestamp = now;
            console.log('Categorie caricate dal server:', categorie);
        })
        .catch(error => {
            console.error('Errore nel caricamento delle categorie:', error);
            
            // Mostra errore user-friendly
            const container = document.getElementById('categories-boxes-container');
            if (container) {
                ErrorManager.showError(
                    container, 
                    error, 
                    () => {
                        // Retry callback
                        cacheCategorie = null;
                        cacheTimestamp = 0;
                        caricaCategorie().then(() => mostraCategorie());
                    }
                );
            }
            
            // Mostra anche toast per errori meno critici
            if (ErrorManager.getErrorType(error) !== ErrorManager.ERROR_TYPES.NETWORK) {
                showToast('Errore nel caricamento delle categorie');
            }
            
            throw error; // Re-throw per permettere al chiamante di gestire l'errore
        })
        .finally(() => {
            caricamentoCategorieInCorso = false;
        });
}

// Funzione per caricare i prodotti
function caricaProdotti() {
    return fetch('/api/prodotti')
        .then(response => response.json())
        .then(data => {
            prodotti = data;
            console.log('Prodotti caricati:', prodotti);
        })
        .catch(error => {
            console.error('Errore nel caricamento dei prodotti:', error);
            showToast('Errore nel caricamento dei prodotti');
        });
}

// Funzione per raggruppare prodotti per categoria
function raggruppaProdottiPerCategoria() {
    const prodottiPerCategoria = {};
    
    // Inizializza tutte le categorie
    categorie.forEach(categoria => {
        prodottiPerCategoria[categoria.id] = {
            categoria: categoria,
            prodotti: []
        };
    });
    
    // Raggruppa i prodotti per categoria
    prodotti.forEach(prodotto => {
        if (prodottiPerCategoria[prodotto.categoria_id]) {
            prodottiPerCategoria[prodotto.categoria_id].prodotti.push(prodotto);
        }
    });
    
    return prodottiPerCategoria;
}

// Funzione per mostrare solo le categorie genitore
function mostraCategorie() {
    const container = document.getElementById('categories-boxes-container');
    const noCategoriasMessage = document.getElementById('no-categories-message');
    
    // Mostra loading durante la preparazione della vista
    LoadingManager.show(container, 'Preparazione categorie...', false);
    
    // Rimuovi attributi specifici della vista prodotti
    container.removeAttribute('data-categoria-id');
    container.removeAttribute('data-nome-categoria');
    container.classList.remove('category-products');
    
    // Filtra le categorie per mostrare solo quelle con prodotti
    const categorieFiltrate = categorieGenitore.filter(categoria => categoria.prodotti_count > 0);
    console.log(`Categorie totali: ${categorieGenitore.length}, Categorie con prodotti: ${categorieFiltrate.length}`);
    
    // Verifica se abbiamo categorie da mostrare
    if (!categorieFiltrate || categorieFiltrate.length === 0) {
        // Nascondi il container delle categorie e mostra il messaggio "nessuna categoria"
        container.style.display = 'none';
        if (noCategoriasMessage) {
            noCategoriasMessage.style.display = 'block';
        }
        return;
    }
    
    // Se abbiamo categorie, nascondi il messaggio "nessuna categoria" e mostra il container
    if (noCategoriasMessage) {
        noCategoriasMessage.style.display = 'none';
    }
    container.style.display = 'block';
    
    // Genera l'HTML per le categorie filtrate
    let html = '<div class="row">';
    
    categorieFiltrate.forEach(categoria => {
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card category-card h-100 shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-primary mb-3">
                            <i class="fas fa-utensils me-2"></i>
                            ${categoria.nome}
                        </h5>
                        <p class="card-text text-muted flex-grow-1">
                            ${categoria.descrizione || 'Scopri i nostri deliziosi piatti'}
                        </p>
                        <button class="btn btn-primary mt-auto" 
                                onclick="visualizzaProdottiCategoria(${categoria.id}, '${categoria.nome.replace(/'/g, "\\'")}')">
                            <i class="fas fa-eye me-2"></i>
                            Visualizza prodotti (${categoria.prodotti_count})
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Aggiorna il contenuto con un piccolo delay per mostrare il loading
    setTimeout(() => {
        container.innerHTML = html;
        console.log(`Visualizzate ${categorieFiltrate.length} categorie con prodotti`);
    }, 200);
}

// Funzione per inizializzare il menu con categorie genitore
async function inizializzaMenu() {
    const container = document.getElementById('categories-boxes-container');
    
    try {
        // Mostra loading durante l'inizializzazione
        LoadingManager.show(container, 'Inizializzazione del menu...', true);
        
        // Carica le categorie genitore
        await caricaCategorie();
        
        // Mostra solo le categorie genitore
        mostraCategorie();
        
        console.log('Menu inizializzato con successo - solo categorie genitore popolate');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione del menu:', error);
        
        // Mostra errore con possibilità di retry
        ErrorManager.showError(
            container,
            error,
            () => {
                // Retry callback
                inizializzaMenu();
            }
        );
        
        // Mostra toast per errori non di rete
        if (ErrorManager.getErrorType(error) !== ErrorManager.ERROR_TYPES.NETWORK) {
            showToast('Errore nel caricamento del menu', 'error');
        }
    }
}

// Event listeners per Socket.IO
if (socket) {
    socket.on('prodotto_aggiunto', function(prodotto) {
        console.log('Nuovo prodotto aggiunto:', prodotto);
        // Se il prodotto è disponibile, aggiorna solo i dati necessari
        if (prodotto.disponibile) {
            // Invalida cache e aggiorna la vista corrente
            invalidaCacheEAggiorna();
            showToast(`Nuovo prodotto aggiunto: ${prodotto.nome}`);
        }
    });

    socket.on('prodotto_aggiornato', function(prodotto) {
        console.log('=== MENU: Ricevuto evento prodotto_aggiornato ===');
        console.log('Prodotto:', prodotto);
        console.log('Disponibile:', prodotto.disponibile);
        
        // Invalida cache per la categoria del prodotto
        if (cacheProdotti.has(prodotto.categoria_id)) {
            cacheProdotti.delete(prodotto.categoria_id);
        }
        
        // Trova e aggiorna il prodotto nella visualizzazione corrente
        const prodottoElement = document.querySelector(`[data-prodotto-id="${prodotto.id}"]`);
        console.log('Elemento trovato:', prodottoElement);
        
        if (prodotto.disponibile) {
            // Se il prodotto è ora disponibile e non è visibile - aggiorno vista
            if (!prodottoElement) {
                console.log('Prodotto disponibile ma non visibile - aggiorno vista');
                invalidaCacheEAggiorna();
                showToast(`${prodotto.nome} è ora disponibile!`);
            } else {
                // Aggiorna i dati del prodotto esistente
                aggiornaElementoProdotto(prodottoElement, prodotto);
                showToast(`${prodotto.nome} aggiornato!`);
            }
        } else {
            // Se il prodotto non è più disponibile e è visibile, rimuovilo o aggiornalo
            if (prodottoElement) {
                console.log('Prodotto non più disponibile - aggiorno vista');
                invalidaCacheEAggiorna();
                showToast(`${prodotto.nome} non è più disponibile`);
            }
        }
    });

    socket.on('prodotto_eliminato', function(data) {
        console.log('Prodotto eliminato:', data);
        // Rimuovi dalla cache e aggiorna la vista
        cacheProdotti.forEach((prodotti, categoriaId) => {
            const index = prodotti.findIndex(p => p.id === data.id);
            if (index !== -1) {
                prodotti.splice(index, 1);
            }
        });
        
        // Rimuovi l'elemento dalla vista se presente
        const prodottoElement = document.querySelector(`[data-prodotto-id="${data.id}"]`);
        if (prodottoElement) {
            prodottoElement.remove();
        }
        
        showToast('Prodotto eliminato');
    });
}

// Funzione per aggiornare un elemento prodotto esistente nella vista
function aggiornaElementoProdotto(elemento, prodotto) {
    // Aggiorna il nome del prodotto
    const nomeElement = elemento.querySelector('.card-title');
    if (nomeElement) {
        nomeElement.textContent = prodotto.nome;
    }
    
    // Aggiorna la descrizione
    const descrizioneElement = elemento.querySelector('.card-text');
    if (descrizioneElement) {
        descrizioneElement.textContent = prodotto.descrizione;
    }
    
    // Aggiorna il prezzo
    const prezzoElement = elemento.querySelector('.price');
    if (prezzoElement) {
        prezzoElement.textContent = `€${prodotto.prezzo.toFixed(2)}`;
    }
    
    // Aggiorna l'immagine se presente
    if (prodotto.foto) {
        const imgElement = elemento.querySelector('.card-img-top');
        if (imgElement) {
            imgElement.src = `/static/uploads/${prodotto.foto}`;
        }
    }
    
    // Aggiorna gli attributi data
    elemento.setAttribute('data-prodotto-id', prodotto.id);
    elemento.setAttribute('data-categoria-id', prodotto.categoria_id);
}

function mostraProdottiConNavigazione() {
    const container = document.getElementById('categories-boxes-container');
    
    if (!prodottiCorrente || prodottiCorrente.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nessun prodotto disponibile</h4>
                    <p class="text-muted">Non ci sono prodotti disponibili in questa categoria.</p>
                    <button class="btn btn-primary" onclick="mostraCategorie()">
                        <i class="fas fa-arrow-left me-2"></i>Torna alle categorie
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Header con navigazione
    let headerHtml = `
        <div class="col-12 mb-4">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <button class="btn btn-outline-primary me-3" onclick="mostraCategorie()">
                        <i class="fas fa-arrow-left me-2"></i>Torna alle categorie
                    </button>
                    <h4 class="d-inline-block mb-0">
                        <i class="fas fa-utensils me-2"></i>${categoriaGenitoreCorrente ? categoriaGenitoreCorrente.nome : 'Categoria'}
                        <span class="badge bg-primary ms-2">${prodottiCorrente.length} prodotti</span>
                    </h4>
                </div>
            </div>
        </div>
    `;
    
    // Tag di navigazione per categorie figlie (se presenti)
    if (categorieCorrente && categorieCorrente.length > 0) {
        headerHtml += `
            <div class="col-12 mb-4">
                <div class="d-flex flex-wrap gap-2">
                    <span class="badge bg-secondary me-2">Filtra per:</span>
                    <button class="btn btn-sm btn-outline-primary active" onclick="filtraProdotti('tutti')">
                        <i class="fas fa-list me-1"></i>Tutti
                    </button>
        `;
        
        categorieCorrente.forEach(categoria => {
            headerHtml += `
                <button class="btn btn-sm btn-outline-primary" onclick="filtraProdotti('${categoria}')">
                    <i class="fas fa-tag me-1"></i>${categoria}
                </button>
            `;
        });
        
        headerHtml += `
                </div>
            </div>
        `;
    }
    
    // Raggruppa prodotti per categoria
    const prodottiRaggruppati = {};
    prodottiCorrente.forEach(prodotto => {
        const nomeCategoria = prodotto.categoria_nome || 'Senza categoria';
        if (!prodottiRaggruppati[nomeCategoria]) {
            prodottiRaggruppati[nomeCategoria] = [];
        }
        prodottiRaggruppati[nomeCategoria].push(prodotto);
    });
    
    // Genera HTML per i prodotti raggruppati
    let prodottiHtml = '';
    Object.keys(prodottiRaggruppati).forEach(nomeCategoria => {
        const prodottiCategoria = prodottiRaggruppati[nomeCategoria];
        
        prodottiHtml += `
            <div class="col-12 mb-3 categoria-section" data-categoria="${nomeCategoria}">
                <h5 class="border-bottom pb-2 mb-3">
                    <i class="fas fa-folder-open me-2 text-primary"></i>${nomeCategoria}
                    <span class="badge bg-light text-dark ms-2">${prodottiCategoria.length}</span>
                </h5>
                <div class="row">
        `;
        
        prodottiCategoria.forEach(prodotto => {
            prodottiHtml += createProductCard(prodotto);
        });
        
        prodottiHtml += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = headerHtml + prodottiHtml;
    
    console.log(`Visualizzati ${prodottiCorrente.length} prodotti raggruppati per categoria`);
}

function filtraProdotti(filtro) {
    // Aggiorna i pulsanti attivi
    document.querySelectorAll('.btn-outline-primary').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (filtro === 'tutti') {
        // Mostra tutte le sezioni
        document.querySelectorAll('.categoria-section').forEach(section => {
            section.style.display = 'block';
        });
        // Attiva il pulsante "Tutti"
        event.target.classList.add('active');
    } else {
        // Nascondi tutte le sezioni
        document.querySelectorAll('.categoria-section').forEach(section => {
            section.style.display = 'none';
        });
        // Mostra solo la sezione selezionata
        const sezioneFiltrata = document.querySelector(`[data-categoria="${filtro}"]`);
        if (sezioneFiltrata) {
            sezioneFiltrata.style.display = 'block';
        }
        // Attiva il pulsante selezionato
        event.target.classList.add('active');
    }
}

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    inizializzaMenu();
});

// Funzione per visualizzare i prodotti di una categoria specifica con cache
function visualizzaProdottiCategoria(categoriaId, nomeCategoria) {
    console.log(`Caricamento prodotti per categoria: ${nomeCategoria} (ID: ${categoriaId})`);
    
    const lang = window.languageSelector ? window.languageSelector.getCurrentLanguage() : 'it';
    const cacheKey = `${categoriaId}_${lang}`;
    const now = Date.now();
    
    // Controlla se abbiamo dati in cache validi per questa categoria
    if (cacheProdotti.has(cacheKey)) {
        const cachedData = cacheProdotti.get(cacheKey);
        if ((now - cachedData.timestamp) < CACHE_DURATION) {
            console.log(`Prodotti caricati dalla cache per categoria: ${nomeCategoria}`);
            prodottiCorrente = cachedData.data.prodotti;
            categorieCorrente = cachedData.data.categorie_figlie;
            categoriaGenitoreCorrente = cachedData.data.categoria;
            mostraProdottiConNavigazione();
            return;
        } else {
            // Cache scaduta, rimuovi
            cacheProdotti.delete(cacheKey);
        }
    }
    
    // Mostra loading migliorato
    const container = document.getElementById('categories-boxes-container');
    LoadingManager.show(container, `Caricamento prodotti di ${nomeCategoria}...`, true);
    
    // Aggiungi attributi per identificare la vista corrente
    container.setAttribute('data-categoria-id', categoriaId);
    container.setAttribute('data-nome-categoria', nomeCategoria);
    container.classList.add('category-products');
    
    // Carica i prodotti della categoria dal server con timeout
    fetchWithTimeout(`/api/prodotti/categoria/${categoriaId}?lang=${lang}`)
        .then(response => response.json())
        .then(data => {
            prodottiCorrente = data.prodotti;
            categorieCorrente = data.categorie_figlie;
            categoriaGenitoreCorrente = data.categoria;
            
            // Salva in cache
            cacheProdotti.set(cacheKey, {
                data: data,
                timestamp: now
            });
            
            console.log(`Caricati ${data.totale_prodotti} prodotti per la categoria ${nomeCategoria}`);
            console.log('Categorie figlie trovate:', categorieCorrente);
            
            mostraProdottiConNavigazione();
        })
        .catch(error => {
            console.error('Errore nel caricamento dei prodotti:', error);
            
            // Mostra errore con opzioni di retry e back
            ErrorManager.showError(
                container,
                error,
                () => {
                    // Retry callback
                    cacheProdotti.delete(cacheKey);
                    visualizzaProdottiCategoria(categoriaId, nomeCategoria);
                },
                () => {
                    // Back callback
                    mostraCategorie();
                }
            );
            
            // Mostra toast solo per errori non di rete
            if (ErrorManager.getErrorType(error) !== ErrorManager.ERROR_TYPES.NETWORK) {
                showToast('Errore nel caricamento dei prodotti', 'error');
            }
        });
}