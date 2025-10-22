// Gestione Prodotti - JavaScript separato
// Test di caricamento JavaScript
console.log('=== GESTIONE-PRODOTTI.JS CARICATO ===');

// Socket.IO
const socket = io();

// Variabili globali
let isEditing = false;
let categorie = [];
let allergeni = [];
let ingredienti = [];
let dataLoaded = false; // Flag per evitare ricaricamenti inutili

console.log('=== VARIABILI GLOBALI INIZIALIZZATE ===');

// Funzioni di utilità
function showToast(message, type = 'success') {
    const toastIcon = document.querySelector('#notification-toast .toast-header i');
    toastIcon.className = `fas fa-${type === 'success' ? 'check-circle text-success' : 'exclamation-circle text-danger'} me-2`;
    
    document.getElementById('toast-message').textContent = message;
    const toast = new bootstrap.Toast(document.getElementById('notification-toast'));
    toast.show();
}

// Carica categorie dal database (con cache)
function loadCategorie() {
    if (categorie.length > 0) {
        return Promise.resolve(); // Usa cache se già caricate
    }
    
    return fetch('/api/categorie')
        .then(response => response.json())
        .then(data => {
            // L'API restituisce {categorie: [...]}
            categorie = data.categorie || [];
            const categoriaSelect = document.getElementById('categoria');
            categoriaSelect.innerHTML = '<option value="">Seleziona categoria</option>';
            
            // Aggiungi tutte le categorie al select
            categorie.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                
                // Se la categoria ha un parent, mostra concatenata, altrimenti normale
                if (categoria.parent_nome) {
                    option.textContent = `${categoria.parent_nome} > ${categoria.nome}`;
                } else {
                    option.textContent = categoria.nome;
                }
                
                categoriaSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento delle categorie:', error);
            showToast('Errore nel caricamento delle categorie', 'error');
        });
}

// Carica allergeni dal database (con cache)
function loadAllergeni() {
    if (allergeni.length > 0) {
        return Promise.resolve(); // Usa cache se già caricati
    }
    
    return fetch('/api/allergeni')
        .then(response => response.json())
        .then(data => {
            allergeni = data.allergeni || [];
            const allergeniContainer = document.getElementById('allergeni-container');
            allergeniContainer.innerHTML = '';
            
            allergeni.forEach(allergene => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                
                const checkbox = document.createElement('input');
                checkbox.className = 'form-check-input';
                checkbox.type = 'checkbox';
                checkbox.id = `allergene-${allergene.id}`;
                checkbox.value = allergene.id;
                
                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `allergene-${allergene.id}`;
                label.textContent = allergene.nome;
                
                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                allergeniContainer.appendChild(checkboxDiv);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento degli allergeni:', error);
            showToast('Errore nel caricamento degli allergeni', 'error');
        });
}

// Carica ingredienti dal database (con cache)
function loadIngredienti() {
    if (ingredienti.length > 0) {
        return Promise.resolve(); // Usa cache se già caricati
    }
    
    return fetch('/api/ingredienti')
        .then(response => response.json())
        .then(data => {
            ingredienti = data.ingredienti || [];
            const ingredientiContainer = document.getElementById('ingredienti-container');
            ingredientiContainer.innerHTML = '';
            
            ingredienti.forEach(ingrediente => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';
                
                const checkbox = document.createElement('input');
                checkbox.className = 'form-check-input';
                checkbox.type = 'checkbox';
                checkbox.id = `ingrediente-${ingrediente.id}`;
                checkbox.value = ingrediente.id;
                
                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `ingrediente-${ingrediente.id}`;
                label.textContent = ingrediente.nome;
                
                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                ingredientiContainer.appendChild(checkboxDiv);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento degli ingredienti:', error);
            showToast('Errore nel caricamento degli ingredienti', 'error');
        });
}

// Carica tutti i dati una sola volta
async function loadAllData() {
    if (dataLoaded) {
        return Promise.resolve();
    }
    
    try {
        await Promise.all([
            loadCategorie(),
            loadAllergeni(),
            loadIngredienti()
        ]);
        dataLoaded = true;
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        throw error;
    }
}

// Gestione anteprima foto
function setupFotoPreview() {
    const fotoInput = document.getElementById('foto');
    const fotoPreview = document.getElementById('foto-preview');
    const fotoPreviewImg = document.getElementById('foto-preview-img');
    
    fotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotoPreviewImg.src = e.target.result;
                fotoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            fotoPreview.style.display = 'none';
        }
    });
}

function removeFotoPreview() {
    document.getElementById('foto').value = '';
    document.getElementById('foto-preview').style.display = 'none';
}

function resetForm() {
    document.getElementById('prodottoForm').reset();
    document.getElementById('prodottoId').value = '';
    
    // Deseleziona tutti i checkbox degli allergeni
    const allergeniCheckboxes = document.querySelectorAll('#allergeni-container input[type="checkbox"]');
    allergeniCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    // Deseleziona tutti i checkbox degli ingredienti
    const ingredientiCheckboxes = document.querySelectorAll('#ingredienti-container input[type="checkbox"]');
    ingredientiCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Aggiungi Prodotto';
    document.getElementById('foto-preview').style.display = 'none';
    isEditing = false;
}

// Funzioni CRUD
function saveProdotto() {
    const id = document.getElementById('prodottoId').value;
    const nome = document.getElementById('nome').value;
    const descrizione = document.getElementById('descrizione').value;
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const categoria_id = document.getElementById('categoria').value;
    const disponibile = document.getElementById('disponibile').checked;
    const fotoFile = document.getElementById('foto').files[0];
    
    console.log('=== DATI DA SALVARE ===');
    console.log('Disponibile checkbox checked:', disponibile);
    
    if (!nome || !prezzo || !categoria_id) {
        showToast('Nome, prezzo e categoria sono obbligatori!', 'error');
        return;
    }
    
    // Mostra loading sul pulsante
    const saveButton = document.querySelector('.modal-footer .btn-success');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
    saveButton.disabled = true;
    
    // Usa FormData per supportare l'upload di file
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('descrizione', descrizione);
    formData.append('prezzo', prezzo);
    formData.append('categoria_id', categoria_id);
    formData.append('disponibile', disponibile);
    
    // Aggiungi allergeni selezionati
    const allergeniSelezionati = Array.from(document.querySelectorAll('#allergeni-container input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    console.log('Allergeni selezionati per il salvataggio:', allergeniSelezionati);
    formData.append('allergeni', JSON.stringify(allergeniSelezionati));
    
    // Aggiungi ingredienti selezionati
    const ingredientiSelezionati = Array.from(document.querySelectorAll('#ingredienti-container input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    console.log('Ingredienti selezionati per il salvataggio:', ingredientiSelezionati);
    formData.append('ingredienti', JSON.stringify(ingredientiSelezionati));
    
    if (fotoFile) {
        formData.append('foto', fotoFile);
    }
    
    const url = isEditing ? `/api/menu/${id}` : '/api/menu';
    const method = isEditing ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('prodottoModal'));
            modal.hide();
            resetForm();
            showToast(isEditing ? 'Prodotto aggiornato!' : 'Prodotto aggiunto!');
            // Ricarica la pagina con delay ridotto
            setTimeout(() => {
                window.location.reload();
            }, 500); // Ridotto da 1000ms a 500ms
        }
    })
    .catch(error => {
        console.error('Errore:', error);
        showToast('Errore durante il salvataggio!', 'error');
    })
    .finally(() => {
        // Ripristina il pulsante
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    });
}

function editProdotto(id, nome, descrizione, prezzo, categoria_id, disponibile, foto, allergeni, ingredienti) {
    console.log('DEBUG editProdotto chiamata con:');
    console.log('- categoria_id:', categoria_id);
    console.log('- allergeni:', allergeni);
    console.log('- ingredienti:', ingredienti);
    
    document.getElementById('prodottoId').value = id;
    document.getElementById('nome').value = nome;
    document.getElementById('descrizione').value = descrizione;
    document.getElementById('prezzo').value = prezzo;
    document.getElementById('disponibile').checked = disponibile;
    
    // Gestione foto esistente
    const fotoPreview = document.getElementById('foto-preview');
    const fotoPreviewImg = document.getElementById('foto-preview-img');
    if (foto) {
        fotoPreviewImg.src = `/static/${foto}`;
        fotoPreview.style.display = 'block';
    } else {
        fotoPreview.style.display = 'none';
    }
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Prodotto';
    isEditing = true;
    
    // Carica prima i dati, poi imposta i valori selezionati
    Promise.all([
        loadCategorie(),
        loadAllergeni(), 
        loadIngredienti()
    ]).then(() => {
        console.log('DEBUG: Dati caricati, ora imposto i valori');
        
        // Imposta la categoria dopo che le opzioni sono caricate
        const categoriaSelect = document.getElementById('categoria');
        console.log('DEBUG: Categoria select trovato:', categoriaSelect);
        console.log('DEBUG: Opzioni disponibili:', Array.from(categoriaSelect.options).map(o => o.value));
        categoriaSelect.value = categoria_id;
        console.log('DEBUG: Categoria impostata a:', categoriaSelect.value);
        
        // Pre-seleziona allergeni esistenti
        if (allergeni) {
            console.log('DEBUG: Processando allergeni:', allergeni);
            const allergeniArray = allergeni.split(',').map(a => a.trim());
            console.log('DEBUG: Array allergeni:', allergeniArray);
            const allergeniCheckboxes = document.querySelectorAll('#allergeni-container input[type="checkbox"]');
            console.log('DEBUG: Checkbox allergeni trovate:', allergeniCheckboxes.length);
            allergeniCheckboxes.forEach(checkbox => {
                const labelText = checkbox.nextElementSibling.textContent.trim();
                const shouldCheck = allergeniArray.includes(labelText);
                console.log(`DEBUG: Checkbox "${labelText}" - dovrebbe essere checked: ${shouldCheck}`);
                checkbox.checked = shouldCheck;
            });
        }
        
        // Pre-seleziona ingredienti esistenti
        if (ingredienti) {
            console.log('DEBUG: Processando ingredienti:', ingredienti);
            const ingredientiArray = ingredienti.split(',').map(i => i.trim());
            console.log('DEBUG: Array ingredienti:', ingredientiArray);
            const ingredientiCheckboxes = document.querySelectorAll('#ingredienti-container input[type="checkbox"]');
            console.log('DEBUG: Checkbox ingredienti trovate:', ingredientiCheckboxes.length);
            ingredientiCheckboxes.forEach(checkbox => {
                const labelText = checkbox.nextElementSibling.textContent.trim();
                const shouldCheck = ingredientiArray.includes(labelText);
                console.log(`DEBUG: Checkbox "${labelText}" - dovrebbe essere checked: ${shouldCheck}`);
                checkbox.checked = shouldCheck;
            });
        }
    });
    
    const modal = new bootstrap.Modal(document.getElementById('prodottoModal'));
    modal.show();
}

async function editProdottoFromData(button) {
    console.log('=== INIZIO EDIT PRODOTTO ===');
    console.log('Button clicked:', button);
    
    try {
        // Ottieni i dati dal button
        const id = button.dataset.id;
        const nome = button.dataset.nome;
        const descrizione = button.dataset.descrizione;
        const prezzo = button.dataset.prezzo;
        const categoriaId = button.dataset.categoriaId;
        const foto = button.dataset.foto;
        const disponibile = button.dataset.disponibile === 'true';
        const allergeniIds = button.dataset.allergeniIds || '';
        const ingredientiIds = button.dataset.ingredientiIds || '';
        
        console.log('=== DATI ESTRATTI ===');
        console.log('ID:', id);
        console.log('Nome:', nome);
        console.log('Categoria ID:', categoriaId);
        console.log('Disponibile (raw):', button.dataset.disponibile);
        console.log('Disponibile converted to boolean:', disponibile);
        console.log('Allergeni IDs:', allergeniIds);
        console.log('Ingredienti IDs:', ingredientiIds);

        // Carica i dati solo se non sono già stati caricati
        await loadAllData();

        // Popola i campi del form
        document.getElementById('prodottoId').value = id;
        document.getElementById('nome').value = nome;
        document.getElementById('descrizione').value = descrizione;
        document.getElementById('prezzo').value = prezzo;
        
        // Imposta la categoria (senza delay)
        const categoriaSelect = document.getElementById('categoria');
        console.log('Impostando categoria ID:', categoriaId);
        categoriaSelect.value = categoriaId;
        console.log('Categoria selezionata:', categoriaSelect.value);
        
        console.log('Impostando disponibile:', disponibile);
        const disponibileCheckbox = document.getElementById('disponibile');
        disponibileCheckbox.checked = disponibile;
        console.log('Checkbox disponibile impostato a:', disponibileCheckbox.checked);
        
        // Gestisci la foto
        const fotoPreview = document.getElementById('foto-preview');
        const fotoPreviewImg = document.getElementById('foto-preview-img');
        if (foto) {
            fotoPreviewImg.src = `/static/${foto}`;
            fotoPreview.style.display = 'block';
        } else {
            fotoPreview.style.display = 'none';
        }
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Prodotto';
        isEditing = true;

        // Deseleziona tutti i checkbox prima di selezionare quelli corretti
        document.querySelectorAll('#allergeni-container input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#ingredienti-container input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Seleziona gli allergeni usando gli ID (senza delay)
        if (allergeniIds) {
            const allergeniIdArray = allergeniIds.split(',').map(id => id.trim());
            console.log('Allergeni IDs to select:', allergeniIdArray);
            
            allergeniIdArray.forEach(allergeneId => {
                const checkbox = document.querySelector(`#allergeni-container input[value="${allergeneId}"]`);
                console.log(`Looking for allergene ID ${allergeneId}, found checkbox:`, checkbox);
                if (checkbox) {
                    checkbox.checked = true;
                    console.log(`Selected allergene ID ${allergeneId}`);
                }
            });
        }

        // Seleziona gli ingredienti usando gli ID (senza delay)
        if (ingredientiIds) {
            const ingredientiIdArray = ingredientiIds.split(',').map(id => id.trim());
            console.log('Ingredienti IDs to select:', ingredientiIdArray);
            
            ingredientiIdArray.forEach(ingredienteId => {
                const checkbox = document.querySelector(`#ingredienti-container input[value="${ingredienteId}"]`);
                console.log(`Looking for ingrediente ID ${ingredienteId}, found checkbox:`, checkbox);
                if (checkbox) {
                    checkbox.checked = true;
                    console.log(`Selected ingrediente ID ${ingredienteId}`);
                }
            });
        }

        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('prodottoModal'));
        modal.show();

    } catch (error) {
        console.error('Errore durante il caricamento dei dati per la modifica:', error);
        showToast('Errore durante il caricamento dei dati per la modifica', 'error');
    }
}

// Funzione ottimizzata per il salvataggio
function saveProdotto() {
    const id = document.getElementById('prodottoId').value;
    const nome = document.getElementById('nome').value;
    const descrizione = document.getElementById('descrizione').value;
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const categoria_id = document.getElementById('categoria').value;
    const disponibile = document.getElementById('disponibile').checked;
    const fotoFile = document.getElementById('foto').files[0];
    
    console.log('=== DATI DA SALVARE ===');
    console.log('Disponibile checkbox checked:', disponibile);
    
    if (!nome || !prezzo || !categoria_id) {
        showToast('Nome, prezzo e categoria sono obbligatori!', 'error');
        return;
    }
    
    // Usa FormData per supportare l'upload di file
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('descrizione', descrizione);
    formData.append('prezzo', prezzo);
    formData.append('categoria_id', categoria_id);
    formData.append('disponibile', disponibile);
    
    // Aggiungi allergeni selezionati
    const allergeniSelezionati = Array.from(document.querySelectorAll('#allergeni-container input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    console.log('Allergeni selezionati per il salvataggio:', allergeniSelezionati);
    formData.append('allergeni', JSON.stringify(allergeniSelezionati));
    
    // Aggiungi ingredienti selezionati
    const ingredientiSelezionati = Array.from(document.querySelectorAll('#ingredienti-container input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    console.log('Ingredienti selezionati per il salvataggio:', ingredientiSelezionati);
    formData.append('ingredienti', JSON.stringify(ingredientiSelezionati));
    
    if (fotoFile) {
        formData.append('foto', fotoFile);
    }
    
    const url = isEditing ? `/api/menu/${id}` : '/api/menu';
    const method = isEditing ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('prodottoModal'));
            modal.hide();
            resetForm();
            showToast(isEditing ? 'Prodotto aggiornato!' : 'Prodotto aggiunto!');
            // Ricarica la pagina per mostrare i cambiamenti
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Errore:', error);
        showToast('Errore durante il salvataggio!', 'error');
    });
}

function deleteProdotto(id, nome) {
    modalConfirm.show({
        title: 'Conferma Eliminazione Prodotto',
        message: `Sei sicuro di voler eliminare "${nome}"?`,
        subtext: 'Questa azione non può essere annullata.',
        confirmText: 'Elimina',
        confirmClass: 'btn-danger',
        icon: 'fas fa-trash text-danger'
    }).then(confirmed => {
        if (confirmed) {
            fetch(`/api/menu/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast('Prodotto eliminato!');
                    // Rimuovi la riga dalla tabella immediatamente
                    const existingRow = document.querySelector(`tr[data-prodotto-id="${id}"]`);
                    if (existingRow) {
                        existingRow.remove();
                    }
                } else {
                    showToast('Errore durante l\'eliminazione!', 'error');
                }
            })
            .catch(error => {
                console.error('Errore:', error);
                showToast('Errore durante l\'eliminazione!', 'error');
            });
        }
    });
}

function deleteProdottoFromData(button) {
    const id = button.dataset.id;
    const nome = button.dataset.nome;
    
    deleteProdotto(id, nome);
}

// Funzioni per creare righe della tabella
function createTableRow(prodotto) {
    const disponibileBadge = prodotto.disponibile 
        ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Sì</span>'
        : '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>No</span>';
    
    const nomeEscaped = (prodotto.nome || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const descrizioneEscaped = (prodotto.descrizione || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const categoriaEscaped = (prodotto.categoria || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    const fotoHtml = prodotto.foto 
        ? `<img src="/static/${prodotto.foto}" alt="${prodotto.nome}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">`
        : `<div class="bg-light d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; border-radius: 4px;"><i class="fas fa-image text-muted"></i></div>`;
    
    return `
        <tr data-prodotto-id="${prodotto.id}">
            <td>${prodotto.id}</td>
            <td>${fotoHtml}</td>
            <td><strong>${prodotto.nome}</strong></td>
            <td class="text-success"><strong>€${parseFloat(prodotto.prezzo).toFixed(2)}</strong></td>
            <td><span class="badge bg-primary">${prodotto.categoria || 'Generale'}</span></td>
            <td>${disponibileBadge}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" 
                        data-id="${prodotto.id}" 
                        data-nome="${nomeEscaped}" 
                        data-descrizione="${descrizioneEscaped}" 
                        data-prezzo="${prodotto.prezzo}" 
                        data-categoria="${categoriaEscaped}" 
                        data-disponibile="${prodotto.disponibile}"
                        onclick="editProdottoFromData(this)">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" 
                        data-id="${prodotto.id}" 
                        data-nome="${nomeEscaped}"
                        onclick="deleteProdottoFromData(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

// Eventi Socket.IO per aggiornamenti in tempo reale
socket.on('prodotto_aggiunto', function(prodotto) {
    const tbody = document.querySelector('#prodotti-table tbody');
    tbody.insertAdjacentHTML('beforeend', createTableRow(prodotto));
});

socket.on('prodotto_aggiornato', function(prodotto) {
    const existingRow = document.querySelector(`tr[data-prodotto-id="${prodotto.id}"]`);
    if (existingRow) {
        existingRow.outerHTML = createTableRow(prodotto);
    }
});

socket.on('prodotto_eliminato', function(data) {
    const existingRow = document.querySelector(`tr[data-prodotto-id="${data.id}"]`);
    if (existingRow) {
        existingRow.remove();
    }
});

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CARICATO - INIZIALIZZAZIONE ===');
    
    // Setup del form
    setupFotoPreview();
    
    // Carica i dati iniziali
    Promise.all([
        loadCategorie(),
        loadAllergeni(), 
        loadIngredienti()
    ]).then(() => {
        console.log('=== DATI INIZIALI CARICATI ===');
        console.log('Categorie:', categorie.length);
        console.log('Allergeni:', allergeni.length);
        console.log('Ingredienti:', ingredienti.length);
    }).catch(error => {
        console.error('Errore nel caricamento dati iniziali:', error);
    });
    
    // Event listener per il form
    const form = document.getElementById('prodottoForm');
    if (form) {
        console.log('=== FORM TROVATO - AGGIUNTO EVENT LISTENER ===');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('=== FORM SUBMIT INTERCETTATO ===');
            saveProdotto();
        });
    } else {
        console.error('=== ERRORE: FORM NON TROVATO ===');
    }
    
    // Test per verificare se i bottoni edit esistono
    const editButtons = document.querySelectorAll('button[onclick*="editProdottoFromData"]');
    console.log('=== BOTTONI EDIT TROVATI:', editButtons.length, '===');
    editButtons.forEach((btn, index) => {
        console.log(`Bottone ${index + 1}:`, btn);
        console.log(`Data attributes:`, btn.dataset);
    });
    
    // Reset form quando si chiude il modal
    const prodottoModal = document.getElementById('prodottoModal');
    if (prodottoModal) {
        prodottoModal.addEventListener('hidden.bs.modal', function() {
            resetForm();
        });
        
        // Ricarica categorie quando si apre il modal
        prodottoModal.addEventListener('show.bs.modal', function() {
            loadCategorie();
            loadAllergeni();
            loadIngredienti();
        });
    }
});