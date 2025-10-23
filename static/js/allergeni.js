// JavaScript specifico per la pagina Allergeni

let allergeni = [];
let allergeniFiltrati = [];

// Connessione SocketIO
const socket = io();

// Carica gli allergeni all'avvio
document.addEventListener('DOMContentLoaded', function() {
    caricaAllergeni();
    
    // Event listener per la ricerca
    document.getElementById('searchInput').addEventListener('input', filtraAllergeni);
});

// Listener per aggiornamenti real-time
socket.on('allergene_eliminato', function(data) {
    console.log('Allergene eliminato:', data);
    caricaAllergeni(); // Ricarica la lista degli allergeni
});

socket.on('allergene_aggiornato', function(data) {
    console.log('Allergene aggiornato:', data);
    caricaAllergeni(); // Ricarica la lista degli allergeni
});

function caricaAllergeni() {
    fetch('/api/allergeni', {credentials: 'include'})
        .then(response => response.json())
        .then(data => {
            allergeni = data.allergeni;
            allergeniFiltrati = [...allergeni];
            mostraAllergeni();
            aggiornaStatistiche();
            // Rimuovo la chiamata a creaFiltri() dato che non è più utilizzata
        })
        .catch(error => {
            console.error('Errore nel caricamento allergeni:', error);
            document.getElementById('allergens-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Errore nel caricamento degli allergeni. Riprova più tardi.
                </div>
            `;
        });
}

function mostraAllergeni() {
    const container = document.getElementById('allergens-list');
    container.innerHTML = '';
    
    if (allergeniFiltrati.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="2" class="text-center py-4 text-muted">
                    <i class="fas fa-search me-2"></i>Nessun allergene trovato
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordina per nome alfabeticamente
    const allergeniOrdinati = [...allergeniFiltrati].sort((a, b) => a.nome.localeCompare(b.nome));
    
    allergeniOrdinati.forEach(allergene => {
        container.appendChild(creaAllergeneRow(allergene));
    });
}

function creaAllergeneRow(allergene) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>
            <strong>${allergene.nome}</strong>
        </td>
        <td>
            <button class="btn btn-sm btn-warning me-1" onclick="modificaAllergene(${allergene.id})" title="Modifica">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="eliminaAllergene(${allergene.id})" title="Elimina">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

function aggiornaStatistiche() {
    // Statistiche rimosse - non più necessarie
}

// Rimuovo completamente le funzioni creaFiltri e filtraAllergeni dato che non sono più utilizzate

function filtraAllergeni() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    allergeniFiltrati = allergeni.filter(allergene => {
        const matchSearch = !searchTerm || 
            allergene.nome.toLowerCase().includes(searchTerm);
        
        return matchSearch;
    });
    
    mostraAllergeni();
}

function aggiungiAllergene() {
    document.getElementById('allergeneModalTitle').innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Aggiungi Allergene';
    document.getElementById('allergeneForm').reset();
    document.getElementById('allergeneId').value = '';
    new bootstrap.Modal(document.getElementById('allergeneModal')).show();
}

function modificaAllergene(id) {
    const allergene = allergeni.find(a => a.id === id);
    if (!allergene) return;
    
    document.getElementById('allergeneModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Allergene';
    document.getElementById('allergeneId').value = allergene.id;
    document.getElementById('allergeneNome').value = allergene.nome;
    document.getElementById('allergeneIcona').value = allergene.icona || 'default';
    
    new bootstrap.Modal(document.getElementById('allergeneModal')).show();
}

function salvaAllergene() {
    const id = document.getElementById('allergeneId').value;
    const data = {
        nome: document.getElementById('allergeneNome').value.trim(),
        icona: document.getElementById('allergeneIcona').value
    };
    
    if (!data.nome.trim()) {
        modalConfirm.show({
            title: 'Campo Obbligatorio',
            message: 'Il nome dell\'allergene è obbligatorio',
            subtext: 'Inserisci un nome valido per l\'allergene.',
            confirmText: 'OK',
            confirmClass: 'btn-primary',
            icon: 'fas fa-exclamation-triangle text-warning',
            showCancel: false
        });
        return;
    }
    
    const url = id ? `/api/allergeni/${id}` : '/api/allergeni';
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
            bootstrap.Modal.getInstance(document.getElementById('allergeneModal')).hide();
            caricaAllergeni();
        } else {
            modalConfirm.show({
                title: 'Errore Salvataggio',
                message: 'Errore nel salvataggio dell\'allergene',
                subtext: result.message || 'Si è verificato un errore durante il salvataggio.',
                confirmText: 'OK',
                confirmClass: 'btn-primary',
                icon: 'fas fa-exclamation-triangle text-danger',
                showCancel: false
            });
        }
    })
    .catch(error => {
        console.error('Errore nel salvataggio allergene:', error);
        modalConfirm.show({
            title: 'Errore di Connessione',
            message: 'Errore nel salvataggio dell\'allergene',
            subtext: 'Verifica la connessione e riprova.',
            confirmText: 'OK',
            confirmClass: 'btn-primary',
            icon: 'fas fa-exclamation-triangle text-danger',
            showCancel: false
        });
    });
}

function eliminaAllergene(id) {
    const allergene = allergeni.find(a => a.id === id);
    if (!allergene) return;
    
    modalConfirm.show({
        title: 'Conferma Eliminazione Allergene',
        message: `Sei sicuro di voler eliminare l'allergene "${allergene.nome}"?`,
        subtext: 'ATTENZIONE: Questa azione potrebbe compromettere la sicurezza alimentare se l\'allergene è utilizzato nei prodotti.',
        confirmText: 'Elimina',
        confirmClass: 'btn-danger',
        icon: 'fas fa-exclamation-triangle text-danger'
    }).then(confirmed => {
        if (confirmed) {
            fetch(`/api/allergeni/${id}`, {method: 'DELETE', credentials: 'include'})
                .then(response => response.json())
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