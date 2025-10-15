let categorie = [];

// Carica le categorie all'avvio
document.addEventListener('DOMContentLoaded', function() {
    caricaCategorie();
});

function caricaCategorie() {
    fetch('/api/categorie')
        .then(response => response.json())
        .then(data => {
            categorie = data.categorie;
            mostraCategorie();
            aggiornaSelectCategorie();
            aggiornaStatistiche();
        })
        .catch(error => {
            console.error('Errore nel caricamento categorie:', error);
            document.getElementById('categories-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Errore nel caricamento delle categorie. Riprova più tardi.
                </div>
            `;
        });
}

function mostraCategorie() {
    const container = document.getElementById('categories-list');
    container.innerHTML = '';
    
    if (categorie.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-tags fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Nessuna categoria trovata</h5>
                <p class="text-muted">Inizia creando la tua prima categoria</p>
                <button class="btn btn-add-category" onclick="aggiungiCategoria()">
                    <i class="fas fa-plus me-2"></i>Crea Prima Categoria
                </button>
            </div>
        `;
        return;
    }
    
    // Raggruppa categorie per genitore
    const categorieGruppi = {};
    categorie.forEach(cat => {
        const parentId = cat.parent_id || 'root';
        if (!categorieGruppi[parentId]) {
            categorieGruppi[parentId] = [];
        }
        categorieGruppi[parentId].push(cat);
    });
    
    // Ordina le categorie alfabeticamente
    Object.keys(categorieGruppi).forEach(key => {
        categorieGruppi[key].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    
    // Crea tabella per categorie principali
    const table = document.createElement('table');
    table.className = 'table table-hover';
    table.innerHTML = `
        <thead class="table-dark">
            <tr>
                <th>Nome Categoria</th>
                <th>Descrizione</th>
                <th>Sottocategorie</th>
                <th>Azioni</th>
            </tr>
        </thead>
        <tbody id="categories-table-body">
        </tbody>
    `;
    
    const tbody = table.querySelector('#categories-table-body');
    
    // Mostra solo categorie principali nella tabella
    if (categorieGruppi['root']) {
        categorieGruppi['root'].forEach(categoria => {
            const sottocategorieCount = categorieGruppi[categoria.id] ? categorieGruppi[categoria.id].length : 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${categoria.nome}</strong></td>
                <td>${categoria.descrizione || '-'}</td>
                <td>
                    ${sottocategorieCount > 0 ? 
                        `<button class="btn btn-sm btn-outline-primary" onclick="toggleSottocategorie(${categoria.id})">
                            <i class="fas fa-eye me-1"></i>${sottocategorieCount} sottocategorie
                        </button>` : 
                        '<span class="text-muted">Nessuna</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="modificaCategoria(${categoria.id})" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminaCategoria(${categoria.id})" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Aggiungi riga nascosta per sottocategorie
            if (sottocategorieCount > 0) {
                const sottocategorieRow = document.createElement('tr');
                sottocategorieRow.id = `sottocategorie-${categoria.id}`;
                sottocategorieRow.style.display = 'none';
                sottocategorieRow.className = 'table-secondary';
                sottocategorieRow.innerHTML = `
                    <td colspan="4">
                        <div class="ps-4">
                            <h6 class="mb-2">Sottocategorie di "${categoria.nome}":</h6>
                            <div class="row">
                                ${categorieGruppi[categoria.id].map(figlio => `
                                    <div class="col-md-6 mb-2">
                                        <div class="card card-body py-2">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>${figlio.nome}</strong>
                                                    ${figlio.descrizione ? `<br><small class="text-muted">${figlio.descrizione}</small>` : ''}
                                                </div>
                                                <div>
                                                    <button class="btn btn-sm btn-warning me-1" onclick="modificaCategoria(${figlio.id})" title="Modifica">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-sm btn-danger" onclick="eliminaCategoria(${figlio.id})" title="Elimina">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(sottocategorieRow);
            }
        });
    }

    // Crea il wrapper table-responsive
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    tableWrapper.appendChild(table);
    
    container.appendChild(tableWrapper);
}

function creaCategoriaCard(categoria, isFiglio) {
    const card = document.createElement('div');
    card.className = `category-card ${isFiglio ? 'hierarchy-indicator' : ''}`;
    
    card.innerHTML = `
        <div class="category-header">
            <div>
                <div class="category-name">${categoria.nome}</div>
                ${categoria.parent_nome ? `<div class="category-parent">Sottocategoria di: ${categoria.parent_nome}</div>` : ''}
            </div>
            <div class="category-actions">
                <button class="btn btn-action btn-edit" onclick="modificaCategoria(${categoria.id})" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-action btn-delete" onclick="eliminaCategoria(${categoria.id})" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        ${categoria.descrizione ? `<div class="category-body"><div class="category-description">${categoria.descrizione}</div></div>` : ''}
    `;
    
    return card;
}

function aggiornaStatistiche() {
    // Statistiche rimosse - non più necessarie
}

function aggiungiCategoria() {
    document.getElementById('categoriaModalTitle').innerHTML = '<i class="fas fa-tag me-2"></i>Aggiungi Categoria';
    document.getElementById('categoriaForm').reset();
    document.getElementById('categoriaId').value = '';
    new bootstrap.Modal(document.getElementById('categoriaModal')).show();
}

function modificaCategoria(id) {
    const categoria = categorie.find(c => c.id === id);
    if (!categoria) return;
    
    document.getElementById('categoriaModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Categoria';
    document.getElementById('categoriaId').value = categoria.id;
    document.getElementById('categoriaNome').value = categoria.nome;
    document.getElementById('categoriaParent').value = categoria.parent_id || '';
    document.getElementById('categoriaDescrizione').value = categoria.descrizione || '';
    
    new bootstrap.Modal(document.getElementById('categoriaModal')).show();
}

function toggleSottocategorie(categoriaId) {
    const row = document.getElementById(`sottocategorie-${categoriaId}`);
    const button = event.target.closest('button');
    
    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        button.innerHTML = '<i class="fas fa-eye-slash me-1"></i>Nascondi sottocategorie';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-outline-secondary');
    } else {
        row.style.display = 'none';
        const count = row.querySelectorAll('.card').length;
        button.innerHTML = `<i class="fas fa-eye me-1"></i>${count} sottocategorie`;
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-outline-primary');
    }
}

function salvaCategoria() {
    const id = document.getElementById('categoriaId').value;
    const data = {
        nome: document.getElementById('categoriaNome').value.trim(),
        parent_id: document.getElementById('categoriaParent').value || null,
        descrizione: document.getElementById('categoriaDescrizione').value.trim()
    };
    
    if (!data.nome) {
        alert('Il nome della categoria è obbligatorio');
        return;
    }
    
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
        } else {
            alert('Errore nel salvataggio della categoria');
        }
    })
    .catch(error => {
        console.error('Errore nel salvataggio categoria:', error);
        alert('Errore nel salvataggio della categoria');
    });
}

function eliminaCategoria(id) {
    const categoria = categorie.find(c => c.id === id);
    if (!categoria) return;
    
    // Controlla se ha sottocategorie
    const hasSottocategorie = categorie.some(c => c.parent_id === id);
    
    let messaggio = `Sei sicuro di voler eliminare la categoria "${categoria.nome}"?`;
    if (hasSottocategorie) {
        messaggio += '\n\nATTENZIONE: Questa categoria ha delle sottocategorie che verranno eliminate insieme ad essa.';
    }
    
    if (confirm(messaggio)) {
        fetch(`/api/categorie/${id}`, {method: 'DELETE'})
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    caricaCategorie();
                } else {
                    alert('Errore nell\'eliminazione della categoria');
                }
            })
            .catch(error => {
                console.error('Errore nell\'eliminazione categoria:', error);
                alert('Errore nell\'eliminazione della categoria');
            });
    }
}

function aggiornaSelectCategorie() {
    const select = document.getElementById('categoriaParent');
    select.innerHTML = '<option value="">Nessuna (Categoria principale)</option>';
    
    // Mostra solo le categorie principali come possibili genitori
    categorie.filter(c => !c.parent_id).forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        select.appendChild(option);
    });
}