// Gestione Prodotti - JavaScript
let prodottiData = [];
let isEditMode = false;

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadProdottiData();
});

// Inizializza tutti gli event listeners
function initializeEventListeners() {
    // Filtri e ricerca
    document.getElementById('filtroCategoria').addEventListener('change', applicaFiltri);
    document.getElementById('filtroDisponibilita').addEventListener('change', applicaFiltri);
    document.getElementById('cercaProdotto').addEventListener('input', applicaFiltri);
    
    // Form prodotto
    document.getElementById('prodottoForm').addEventListener('submit', salvaProdotto);
    
    // Preview foto
    document.getElementById('foto').addEventListener('change', previewFoto);
    
    // Reset form quando si chiude il modal
    document.getElementById('prodottoModal').addEventListener('hidden.bs.modal', resetForm);
}

// Carica i dati dei prodotti dalla tabella
function loadProdottiData() {
    const rows = document.querySelectorAll('#prodottiTableBody tr');
    prodottiData = Array.from(rows).map(row => ({
        element: row,
        categoria: row.dataset.categoria,
        disponibile: row.dataset.disponibile,
        nome: row.dataset.nome
    }));
}

// Applica i filtri alla tabella
function applicaFiltri() {
    const filtroCategoria = document.getElementById('filtroCategoria').value;
    const filtroDisponibilita = document.getElementById('filtroDisponibilita').value;
    const cercaProdotto = document.getElementById('cercaProdotto').value.toLowerCase();
    
    prodottiData.forEach(prodotto => {
        let mostra = true;
        
        // Filtro categoria
        if (filtroCategoria && prodotto.categoria !== filtroCategoria) {
            mostra = false;
        }
        
        // Filtro disponibilità
        if (filtroDisponibilita && prodotto.disponibile !== filtroDisponibilita) {
            mostra = false;
        }
        
        // Ricerca per nome
        if (cercaProdotto && !prodotto.nome.includes(cercaProdotto)) {
            mostra = false;
        }
        
        prodotto.element.style.display = mostra ? '' : 'none';
    });
}

// Reset del form
function resetForm() {
    document.getElementById('prodottoForm').reset();
    document.getElementById('prodottoId').value = '';
    document.getElementById('prodottoModalLabel').textContent = 'Nuovo Prodotto';
    document.getElementById('fotoPreview').innerHTML = '';
    isEditMode = false;
    
    // Rimuovi classi di validazione
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
}

// Preview della foto selezionata
function previewFoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('fotoPreview');
    
    if (file) {
        // Validazione file
        if (!file.type.startsWith('image/')) {
            showAlert('Errore: Seleziona un file immagine valido.', 'danger');
            event.target.value = '';
            preview.innerHTML = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showAlert('Errore: Il file è troppo grande. Massimo 5MB.', 'danger');
            event.target.value = '';
            preview.innerHTML = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" 
                     class="img-thumbnail" 
                     style="max-width: 200px; max-height: 200px; object-fit: cover;">
            `;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

// Salva prodotto (nuovo o modifica)
async function salvaProdotto(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    showLoading(true);
    
    try {
        const formData = new FormData(document.getElementById('prodottoForm'));
        const prodottoId = document.getElementById('prodottoId').value;
        
        // Aggiungi il valore della checkbox disponibile
        formData.set('disponibile', document.getElementById('disponibile').checked);
        
        let url, method;
        if (isEditMode && prodottoId) {
            url = `/api/gestione-prodotti/${prodottoId}`;
            method = 'PUT';
        } else {
            url = '/api/gestione-prodotti';
            method = 'POST';
        }
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            
            // Chiudi il modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('prodottoModal'));
            modal.hide();
            
            // Ricarica la pagina per mostrare i cambiamenti
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('Errore:', error);
        showAlert('Errore durante il salvataggio del prodotto.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Modifica prodotto
async function modificaProdotto(prodottoId) {
    try {
        showLoading(true);
        
        // Ottieni i dati del prodotto dalle API esistenti
        const response = await fetch('/api/prodotti');
        const prodotti = await response.json();
        
        const prodotto = prodotti.find(p => p.id === prodottoId);
        
        if (!prodotto) {
            showAlert('Prodotto non trovato.', 'danger');
            return;
        }
        
        // Popola il form
        document.getElementById('prodottoId').value = prodotto.id;
        document.getElementById('nome').value = prodotto.nome;
        document.getElementById('descrizione').value = prodotto.descrizione || '';
        document.getElementById('prezzo').value = prodotto.prezzo;
        document.getElementById('categoria_id').value = prodotto.categoria_id || '';
        document.getElementById('disponibile').checked = prodotto.disponibile;
        document.getElementById('allergeni').value = prodotto.allergeni || '';
        document.getElementById('ingredienti').value = prodotto.ingredienti || '';
        
        // Mostra preview foto esistente
        if (prodotto.foto_path) {
            document.getElementById('fotoPreview').innerHTML = `
                <img src="/static/uploads/${prodotto.foto_path}" 
                     class="img-thumbnail" 
                     style="max-width: 200px; max-height: 200px; object-fit: cover;">
                <p class="text-muted mt-1">Foto attuale</p>
            `;
        }
        
        // Cambia il titolo del modal
        document.getElementById('prodottoModalLabel').textContent = 'Modifica Prodotto';
        isEditMode = true;
        
        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('prodottoModal'));
        modal.show();
        
    } catch (error) {
        console.error('Errore:', error);
        showAlert('Errore durante il caricamento del prodotto.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Elimina prodotto
async function eliminaProdotto(prodottoId, nomeProdotto) {
    if (!confirm(`Sei sicuro di voler eliminare il prodotto "${nomeProdotto}"?`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/gestione-prodotti/${prodottoId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            
            // Rimuovi la riga dalla tabella
            const row = document.querySelector(`button[onclick="eliminaProdotto(${prodottoId}, '${nomeProdotto}')"]`).closest('tr');
            row.remove();
            
            // Aggiorna i dati dei prodotti
            loadProdottiData();
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('Errore:', error);
        showAlert('Errore durante l\'eliminazione del prodotto.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Validazione form
function validateForm() {
    let isValid = true;
    
    // Rimuovi validazioni precedenti
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
    
    // Valida nome
    const nome = document.getElementById('nome');
    if (!nome.value.trim()) {
        showFieldError(nome, 'Il nome del prodotto è obbligatorio.');
        isValid = false;
    }
    
    // Valida prezzo
    const prezzo = document.getElementById('prezzo');
    if (!prezzo.value || parseFloat(prezzo.value) < 0) {
        showFieldError(prezzo, 'Inserisci un prezzo valido.');
        isValid = false;
    }
    
    return isValid;
}

// Mostra errore su un campo specifico
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentNode.appendChild(feedback);
}

// Mostra/nascondi loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    } else {
        overlay.classList.add('d-none');
        overlay.classList.remove('d-flex');
    }
}

// Mostra alert
function showAlert(message, type = 'info') {
    // Rimuovi alert esistenti
    document.querySelectorAll('.alert-custom').forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}