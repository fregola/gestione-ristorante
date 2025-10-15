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
let prodottiCorrente = [];
let categorieCorrente = [];
let categoriaGenitoreCorrente = null;
let ultimoAggiornamento = Date.now();

// Funzione per controllare aggiornamenti periodicamente
function controllaAggiornamenti() {
    fetch('/api/menu/last-update')
        .then(response => response.json())
        .then(data => {
            if (data.timestamp > ultimoAggiornamento) {
                console.log('Rilevato aggiornamento - ricarico pagina');
                ultimoAggiornamento = data.timestamp;
                window.location.reload();
            }
        })
        .catch(error => {
            console.log('Errore nel controllo aggiornamenti:', error);
        });
}

// Avvia il controllo periodico ogni 2 secondi
setInterval(controllaAggiornamenti, 2000);

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
                        <button class="btn btn-outline-primary w-100" onclick="visualizzaProdottiCategoria(${categoria.id}, '${categoria.nome}')">
                            <i class="fas fa-eye me-2"></i>Visualizza Prodotti
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funzione per caricare le categorie
function caricaCategorie() {
    const lang = window.languageSelector ? window.languageSelector.getCurrentLanguage() : 'it';
    return fetch(`/api/categorie-menu?lang=${lang}`)
        .then(response => response.json())
        .then(data => {
            categorie = data;
            console.log('Categorie caricate:', categorie);
        })
        .catch(error => {
            console.error('Errore nel caricamento delle categorie:', error);
            showToast('Errore nel caricamento delle categorie');
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
    
    if (!container) {
        console.error('Container categories-boxes-container non trovato');
        return;
    }
    
    if (categorie.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nessuna categoria genitore disponibile</h4>
                    <p class="text-muted">Le categorie genitore con prodotti verranno mostrate qui.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Genera l'HTML per tutte le categorie genitore
    const categorieHtml = categorie.map(categoria => createCategoryBox(categoria)).join('');
    container.innerHTML = categorieHtml;
    
    console.log(`Visualizzate ${categorie.length} categorie genitore con prodotti`);
}

// Funzione per inizializzare il menu con categorie genitore
async function inizializzaMenu() {
    try {
        // Carica le categorie genitore
        await caricaCategorie();
        
        // Mostra solo le categorie genitore
        mostraCategorie();
        
        console.log('Menu inizializzato con successo - solo categorie genitore popolate');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione del menu:', error);
        showToast('Errore nel caricamento del menu', 'error');
    }
}

// Event listeners per Socket.IO
if (socket) {
    socket.on('prodotto_aggiunto', function(prodotto) {
        console.log('Nuovo prodotto aggiunto:', prodotto);
        // Se il prodotto è disponibile, ricarica la visualizzazione
        if (prodotto.disponibile) {
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            showToast(`Nuovo prodotto aggiunto: ${prodotto.nome}`);
        }
    });

    socket.on('prodotto_aggiornato', function(prodotto) {
        console.log('=== MENU: Ricevuto evento prodotto_aggiornato ===');
        console.log('Prodotto:', prodotto);
        console.log('Disponibile:', prodotto.disponibile);
        
        // Trova e aggiorna il prodotto nella visualizzazione corrente
        const prodottoElement = document.querySelector(`[data-prodotto-id="${prodotto.id}"]`);
        console.log('Elemento trovato:', prodottoElement);
        
        if (prodotto.disponibile) {
            // Se il prodotto è ora disponibile e non è visibile, ricarica la pagina
            if (!prodottoElement) {
                console.log('Prodotto disponibile ma non visibile - ricarico pagina');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                showToast(`${prodotto.nome} è ora disponibile!`);
            }
        } else {
            // Se il prodotto non è più disponibile e è visibile, ricarica la pagina
            if (prodottoElement) {
                console.log('Prodotto non disponibile e visibile - ricarico pagina');
                showToast(`${prodotto.nome} non è più disponibile`);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        }
    });

    socket.on('prodotto_eliminato', function(data) {
        console.log('Prodotto eliminato:', data);
        
        // Rimuovi il prodotto dalla visualizzazione se presente
        const prodottoElement = document.querySelector(`[data-prodotto-id="${data.id}"]`);
        if (prodottoElement) {
            prodottoElement.style.transition = 'opacity 0.5s ease-out';
            prodottoElement.style.opacity = '0';
            setTimeout(() => {
                prodottoElement.remove();
                showToast(`Prodotto eliminato`);
            }, 500);
        }
    });
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

// Funzione per visualizzare i prodotti di una categoria specifica
function visualizzaProdottiCategoria(categoriaId, nomeCategoria) {
    console.log(`Caricamento prodotti per categoria: ${nomeCategoria} (ID: ${categoriaId})`);
    
    // Mostra loading
    const container = document.getElementById('categories-boxes-container');
    container.innerHTML = `
        <div class="col-12">
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Caricamento...</span>
                </div>
                <p class="mt-3 text-muted">Caricamento prodotti di ${nomeCategoria}...</p>
            </div>
        </div>
    `;
    
    // Carica i prodotti della categoria
    const lang = window.languageSelector ? window.languageSelector.getCurrentLanguage() : 'it';
    fetch(`/api/prodotti/categoria/${categoriaId}?lang=${lang}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            prodottiCorrente = data.prodotti;
            categorieCorrente = data.categorie_figlie;
            categoriaGenitoreCorrente = data.categoria;
            
            console.log(`Caricati ${data.totale_prodotti} prodotti per la categoria ${nomeCategoria}`);
            console.log('Categorie figlie trovate:', categorieCorrente);
            
            mostraProdottiConNavigazione();
        })
        .catch(error => {
            console.error('Errore nel caricamento dei prodotti:', error);
            showToast('Errore nel caricamento dei prodotti', 'error');
            
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h4 class="text-muted">Errore nel caricamento</h4>
                        <p class="text-muted">Impossibile caricare i prodotti della categoria.</p>
                        <button class="btn btn-primary" onclick="mostraCategorie()">
                            <i class="fas fa-arrow-left me-2"></i>Torna alle categorie
                        </button>
                    </div>
                </div>
            `;
        });
}