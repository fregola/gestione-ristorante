let categorie = [];
let allergeni = [];
let ingredienti = [];

// Carica tutti i dati all'avvio
document.addEventListener('DOMContentLoaded', function() {
    caricaCategorie();
    caricaAllergeni();
    caricaIngredienti();
});

// === CATEGORIE ===
function caricaCategorie() {
    fetch('/api/categorie')
        .then(response => response.json())
        .then(data => {
            categorie = data.categorie;
            mostraCategorie();
            aggiornaSelectCategorie();
        })
        .catch(error => console.error('Errore nel caricamento categorie:', error));
}

function mostraCategorie() {
    const container = document.getElementById('categorie-list');
    container.innerHTML = '';
    
    // Raggruppa categorie per genitore
    const categorieGruppi = {};
    categorie.forEach(cat => {
        const parentId = cat.parent_id || 'root';
        if (!categorieGruppi[parentId]) {
            categorieGruppi[parentId] = [];
        }
        categorieGruppi[parentId].push(cat);
    });
    
    // Mostra categorie principali
    if (categorieGruppi['root']) {
        categorieGruppi['root'].forEach(categoria => {
            container.appendChild(creaCategoriaCard(categoria, false));
            
            // Mostra categorie figlie
            if (categorieGruppi[categoria.id]) {
                categorieGruppi[categoria.id].forEach(figlio => {
                    container.appendChild(creaCategoriaCard(figlio, true));
                });
            }
        });
    }
}

function creaCategoriaCard(categoria, isFiglio) {
    const card = document.createElement('div');
    card.className = `item-card ${isFiglio ? 'hierarchy-indicator' : ''}`;
    
    card.innerHTML = `
        <div class="item-header">
            <div>
                <strong>${isFiglio ? '└─ ' : ''}${categoria.nome}</strong>
                ${categoria.parent_nome ? `<small class="text-muted ms-2">(${categoria.parent_nome})</small>` : ''}
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="modificaCategoria(${categoria.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminaCategoria(${categoria.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        ${categoria.descrizione ? `<div class="item-body"><small class="text-muted">${categoria.descrizione}</small></div>` : ''}
    `;
    
    return card;
}

function aggiungiCategoria() {
    document.getElementById('categoriaModalTitle').textContent = 'Aggiungi Categoria';
    document.getElementById('categoriaForm').reset();
    document.getElementById('categoriaId').value = '';
    new bootstrap.Modal(document.getElementById('categoriaModal')).show();
}

function modificaCategoria(id) {
    const categoria = categorie.find(c => c.id === id);
    if (!categoria) return;
    
    document.getElementById('categoriaModalTitle').textContent = 'Modifica Categoria';
    document.getElementById('categoriaId').value = categoria.id;
    document.getElementById('categoriaNome').value = categoria.nome;
    document.getElementById('categoriaParent').value = categoria.parent_id || '';
    document.getElementById('categoriaDescrizione').value = categoria.descrizione || '';
    document.getElementById('categoriaOrdine').value = categoria.ordine || 0;
    
    new bootstrap.Modal(document.getElementById('categoriaModal')).show();
}

function salvaCategoria() {
    const id = document.getElementById('categoriaId').value;
    const data = {
        nome: document.getElementById('categoriaNome').value,
        parent_id: document.getElementById('categoriaParent').value || null,
        descrizione: document.getElementById('categoriaDescrizione').value,
        ordine: parseInt(document.getElementById('categoriaOrdine').value) || 0
    };
    
    const url = id ? `/api/categorie/${id}` : '/api/categorie';
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('categoriaModal')).hide();
            caricaCategorie();
        }
    })
    .catch(error => console.error('Errore nel salvataggio categoria:', error));
}

function eliminaCategoria(id) {
    if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
        fetch(`/api/categorie/${id}`, {method: 'DELETE'})
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    caricaCategorie();
                }
            })
            .catch(error => console.error('Errore nell\'eliminazione categoria:', error));
    }
}

function aggiornaSelectCategorie() {
    const select = document.getElementById('categoriaParent');
    select.innerHTML = '<option value="">Nessuna (Categoria principale)</option>';
    
    categorie.filter(c => !c.parent_id).forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        select.appendChild(option);
    });
}

// === ALLERGENI ===
function caricaAllergeni() {
    fetch('/api/allergeni')
        .then(response => response.json())
        .then(data => {
            allergeni = data.allergeni;
            mostraAllergeni();
        })
        .catch(error => console.error('Errore nel caricamento allergeni:', error));
}

function mostraAllergeni() {
    const container = document.getElementById('allergeni-list');
    container.innerHTML = '';
    
    allergeni.forEach(allergene => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        card.innerHTML = `
            <div class="item-header">
                <div>
                    <strong>${allergene.nome}</strong>
                    ${allergene.icona ? `<span class="ms-2">${allergene.icona}</span>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="event.stopPropagation(); modificaAllergene(${allergene.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); eliminaAllergene(${allergene.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${allergene.descrizione ? `<div class="item-body"><small class="text-muted">${allergene.descrizione}</small></div>` : ''}
        `;
        
        container.appendChild(card);
    });
}

function aggiungiAllergene() {
    document.getElementById('allergeneModalTitle').textContent = 'Aggiungi Allergene';
    document.getElementById('allergeneForm').reset();
    document.getElementById('allergeneId').value = '';
    new bootstrap.Modal(document.getElementById('allergeneModal')).show();
}

function modificaAllergene(id) {
    const allergene = allergeni.find(a => a.id === id);
    if (!allergene) return;
    
    document.getElementById('allergeneModalTitle').textContent = 'Modifica Allergene';
    document.getElementById('allergeneId').value = allergene.id;
    document.getElementById('allergeneNome').value = allergene.nome;
    document.getElementById('allergeneDescrizione').value = allergene.descrizione || '';
    document.getElementById('allergeneIcona').value = allergene.icona || '';
    
    new bootstrap.Modal(document.getElementById('allergeneModal')).show();
}

function salvaAllergene() {
    const id = document.getElementById('allergeneId').value;
    const data = {
        nome: document.getElementById('allergeneNome').value,
        descrizione: document.getElementById('allergeneDescrizione').value,
        icona: document.getElementById('allergeneIcona').value
    };
    
    const url = id ? `/api/allergeni/${id}` : '/api/allergeni';
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('allergeneModal')).hide();
            caricaAllergeni();
        }
    })
    .catch(error => console.error('Errore nel salvataggio allergene:', error));
}

function eliminaAllergene(id) {
    const allergene = allergeni.find(a => a.id === id);
    if (!allergene) return;
    
    confirmDelete(allergene.nome, 'l\'allergene').then(confirmed => {
        if (confirmed) {
            fetch(`/api/allergeni/${id}`, {method: 'DELETE'})
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => Promise.reject(err));
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.success) {
                        caricaAllergeni();
                    } else {
                        modalConfirm.show({
                            title: 'Errore Eliminazione',
                            message: 'Errore nell\'eliminazione dell\'allergene',
                            subtext: result.error || 'Non è possibile completare l\'operazione richiesta.',
                            confirmText: 'OK',
                            confirmClass: 'btn-primary',
                            icon: 'fas fa-exclamation-triangle text-warning',
                            showCancel: false
                        });
                    }
                })
                .catch(error => {
                    console.error('Errore nell\'eliminazione allergene:', error);
                    modalConfirm.show({
                        title: 'Errore di Connessione',
                        message: 'Errore nell\'eliminazione dell\'allergene',
                        subtext: 'Verifica la connessione e riprova.',
                        confirmText: 'OK',
                        confirmClass: 'btn-primary',
                        icon: 'fas fa-exclamation-triangle text-danger',
                        showCancel: false
                    });
                });
        }
    });
}

// === INGREDIENTI ===
function caricaIngredienti() {
    fetch('/api/ingredienti')
        .then(response => response.json())
        .then(data => {
            ingredienti = data.ingredienti;
            mostraIngredienti();
        })
        .catch(error => console.error('Errore nel caricamento ingredienti:', error));
}

function mostraIngredienti() {
    const container = document.getElementById('ingredienti-list');
    container.innerHTML = '';
    
    // Raggruppa per categoria
    const categorieIngredienti = {};
    ingredienti.forEach(ing => {
        const cat = 'Ingredienti';
        if (!categorieIngredienti[cat]) {
            categorieIngredienti[cat] = [];
        }
        categorieIngredienti[cat].push(ing);
    });
    
    Object.keys(categorieIngredienti).sort().forEach(categoria => {
        if (categoria !== 'Altro') {
            const header = document.createElement('h6');
            header.className = 'text-muted mt-3 mb-2';
            header.textContent = categoria;
            container.appendChild(header);
        }
        
        categorieIngredienti[categoria].forEach(ingrediente => {
            const card = document.createElement('div');
            card.className = 'item-card';
            
            card.innerHTML = `
                <div class="item-header">
                    <div>
                        <strong>${ingrediente.nome}</strong>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="event.stopPropagation(); modificaIngrediente(${ingrediente.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); eliminaIngrediente(${ingrediente.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${ingrediente.descrizione ? `<div class="item-body"><small class="text-muted">${ingrediente.descrizione}</small></div>` : ''}
            `;
            
            container.appendChild(card);
        });
    });
}

function aggiungiIngrediente() {
    document.getElementById('ingredienteModalTitle').textContent = 'Aggiungi Ingrediente';
    document.getElementById('ingredienteForm').reset();
    document.getElementById('ingredienteId').value = '';
    new bootstrap.Modal(document.getElementById('ingredienteModal')).show();
}

function modificaIngrediente(id) {
    const ingrediente = ingredienti.find(i => i.id === id);
    if (!ingrediente) return;
    
    document.getElementById('ingredienteModalTitle').textContent = 'Modifica Ingrediente';
    document.getElementById('ingredienteId').value = ingrediente.id;
    document.getElementById('ingredienteNome').value = ingrediente.nome;
    document.getElementById('ingredienteDescrizione').value = ingrediente.descrizione || '';
    
    new bootstrap.Modal(document.getElementById('ingredienteModal')).show();
}

function salvaIngrediente() {
    const id = document.getElementById('ingredienteId').value;
    const data = {
        nome: document.getElementById('ingredienteNome').value,
        descrizione: document.getElementById('ingredienteDescrizione').value
    };
    
    const url = id ? `/api/ingredienti/${id}` : '/api/ingredienti';
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('ingredienteModal')).hide();
            caricaIngredienti();
        }
    })
    .catch(error => console.error('Errore nel salvataggio ingrediente:', error));
}

function eliminaIngrediente(id) {
    const ingrediente = ingredienti.find(i => i.id === id);
    if (!ingrediente) return;
    
    confirmDelete(ingrediente.nome, 'l\'ingrediente').then(confirmed => {
        if (confirmed) {
            fetch(`/api/ingredienti/${id}`, {method: 'DELETE'})
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => Promise.reject(err));
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.success) {
                        caricaIngredienti();
                    } else {
                        modalConfirm.show({
                            title: 'Errore Eliminazione',
                            message: 'Errore nell\'eliminazione dell\'ingrediente',
                            subtext: result.error || 'Non è possibile completare l\'operazione richiesta.',
                            confirmText: 'OK',
                            confirmClass: 'btn-primary',
                            icon: 'fas fa-exclamation-triangle text-warning',
                            showCancel: false
                        });
                    }
                })
                .catch(error => {
                    console.error('Errore nell\'eliminazione ingrediente:', error);
                    modalConfirm.show({
                        title: 'Errore di Connessione',
                        message: 'Errore nell\'eliminazione dell\'ingrediente',
                        subtext: 'Verifica la connessione e riprova.',
                        confirmText: 'OK',
                        confirmClass: 'btn-primary',
                        icon: 'fas fa-exclamation-triangle text-danger',
                        showCancel: false
                    });
                });
        }
    });
}