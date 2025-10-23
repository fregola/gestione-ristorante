let ingredienti = [];
let ingredientiFiltrati = [];

// Connessione SocketIO
const socket = io();

// Carica gli ingredienti all'avvio
document.addEventListener('DOMContentLoaded', function() {
    caricaIngredienti();
    
    // Event listeners per ricerca
    document.getElementById('searchInput').addEventListener('input', filtraIngredienti);
});

// Listener per aggiornamenti real-time
socket.on('ingrediente_eliminato', function(data) {
    console.log('Ingrediente eliminato:', data);
    caricaIngredienti(); // Ricarica la lista degli ingredienti
});

socket.on('ingrediente_aggiornato', function(data) {
    console.log('Ingrediente aggiornato:', data);
    caricaIngredienti(); // Ricarica la lista degli ingredienti
});

function caricaIngredienti() {
    fetch('/api/ingredienti', {credentials: 'include'})
        .then(response => response.json())
        .then(data => {
            ingredienti = data.ingredienti;
            ingredientiFiltrati = [...ingredienti];
            mostraIngredienti();
            aggiornaStatistiche();
        })
        .catch(error => {
            console.error('Errore nel caricamento ingredienti:', error);
            document.getElementById('ingredients-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Errore nel caricamento degli ingredienti. Riprova più tardi.
                </div>
            `;
        });
}

function mostraIngredienti() {
    const container = document.getElementById('ingredients-list');
    container.innerHTML = '';
    
    if (ingredientiFiltrati.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4 text-muted">
                    <i class="fas fa-search me-2"></i>Nessun ingrediente trovato
                </td>
            </tr>
        `;
        return;
    }
    
    ingredientiFiltrati.forEach(ingrediente => {
        const rowHTML = creaIngredienteRow(ingrediente);
        container.innerHTML += rowHTML;
    });
}

function creaIngredienteRow(ingrediente) {
    const iconaDisplay = ingrediente.icona ? `<span class="me-2">${ingrediente.icona}</span>` : '';
    return `
        <tr>
            <td>${iconaDisplay}<strong>${ingrediente.nome}</strong></td>
            <td>${ingrediente.icona || '-'}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="modificaIngrediente(${ingrediente.id})" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminaIngrediente(${ingrediente.id})" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function aggiornaStatistiche() {
    // Statistiche rimosse - non più necessarie
}

function filtraIngredienti() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    ingredientiFiltrati = ingredienti.filter(ingrediente => {
        const matchesSearch = !searchTerm || 
            ingrediente.nome.toLowerCase().includes(searchTerm) ||
            (ingrediente.icona && ingrediente.icona.toLowerCase().includes(searchTerm));
        
        return matchesSearch;
    });
    
    mostraIngredienti();
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
    document.getElementById('ingredienteIcona').value = ingrediente.icona || '';
    
    new bootstrap.Modal(document.getElementById('ingredienteModal')).show();
}

function salvaIngrediente() {
    const id = document.getElementById('ingredienteId').value;
    const data = {
        nome: document.getElementById('ingredienteNome').value,
        icona: document.getElementById('ingredienteIcona').value
    };
    
    if (!data.nome.trim()) {
        modalConfirm.show({
            title: 'Campo Obbligatorio',
            message: 'Il nome dell\'ingrediente è obbligatorio',
            subtext: 'Inserisci un nome valido per l\'ingrediente.',
            confirmText: 'OK',
            confirmClass: 'btn-primary',
            icon: 'fas fa-exclamation-triangle text-warning',
            showCancel: false
        });
        return;
    }
    
    const url = id ? `/api/ingredienti/${id}` : '/api/ingredienti';
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('ingredienteModal')).hide();
            caricaIngredienti();
        } else {
            modalConfirm.show({
                title: 'Errore Salvataggio',
                message: 'Errore nel salvataggio: ' + (result.message || 'Errore sconosciuto'),
                subtext: 'Si è verificato un errore durante il salvataggio.',
                confirmText: 'OK',
                confirmClass: 'btn-primary',
                icon: 'fas fa-exclamation-triangle text-danger',
                showCancel: false
            });
        }
    })
    .catch(error => {
        console.error('Errore nel salvataggio ingrediente:', error);
        modalConfirm.show({
            title: 'Errore di Connessione',
            message: 'Errore nel salvataggio dell\'ingrediente',
            subtext: 'Verifica la connessione e riprova.',
            confirmText: 'OK',
            confirmClass: 'btn-primary',
            icon: 'fas fa-exclamation-triangle text-danger',
            showCancel: false
        });
    });
}

function eliminaIngrediente(id) {
    const ingrediente = ingredienti.find(i => i.id === id);
    if (!ingrediente) return;
    
    modalConfirm.show({
        title: 'Conferma Eliminazione Ingrediente',
        message: `Sei sicuro di voler eliminare l'ingrediente "${ingrediente.nome}"?`,
        subtext: 'Questa azione non può essere annullata.',
        confirmText: 'Elimina',
        confirmClass: 'btn-danger',
        icon: 'fas fa-trash text-danger'
    }).then(confirmed => {
        if (confirmed) {
            fetch(`/api/ingredienti/${id}`, {method: 'DELETE', credentials: 'include'})
                .then(response => response.json())
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