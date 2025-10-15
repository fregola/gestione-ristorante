let ingredienti = [];
let ingredientiFiltrati = [];

// Carica gli ingredienti all'avvio
document.addEventListener('DOMContentLoaded', function() {
    caricaIngredienti();
    
    // Event listeners per ricerca
    document.getElementById('searchInput').addEventListener('input', filtraIngredienti);
});

function caricaIngredienti() {
    fetch('/api/ingredienti')
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
    return `
        <tr>
            <td><strong>${ingrediente.nome}</strong></td>
            <td>${ingrediente.descrizione || '-'}</td>
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
            (ingrediente.descrizione && ingrediente.descrizione.toLowerCase().includes(searchTerm));
        
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
    document.getElementById('ingredienteDescrizione').value = ingrediente.descrizione || '';
    
    new bootstrap.Modal(document.getElementById('ingredienteModal')).show();
}

function salvaIngrediente() {
    const id = document.getElementById('ingredienteId').value;
    const data = {
        nome: document.getElementById('ingredienteNome').value,
        descrizione: document.getElementById('ingredienteDescrizione').value
    };
    
    if (!data.nome.trim()) {
        alert('Il nome dell\'ingrediente è obbligatorio');
        return;
    }
    
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
        } else {
            alert('Errore nel salvataggio: ' + (result.message || 'Errore sconosciuto'));
        }
    })
    .catch(error => {
        console.error('Errore nel salvataggio ingrediente:', error);
        alert('Errore nel salvataggio dell\'ingrediente');
    });
}

function eliminaIngrediente(id) {
    if (confirm('Sei sicuro di voler eliminare questo ingrediente?')) {
        fetch(`/api/ingredienti/${id}`, {method: 'DELETE'})
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    caricaIngredienti();
                } else {
                    alert('Errore nell\'eliminazione: ' + (result.message || 'Errore sconosciuto'));
                }
            })
            .catch(error => {
                console.error('Errore nell\'eliminazione ingrediente:', error);
                alert('Errore nell\'eliminazione dell\'ingrediente');
            });
    }
}