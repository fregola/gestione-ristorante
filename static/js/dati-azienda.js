// JavaScript per la gestione dei dati azienda

document.addEventListener('DOMContentLoaded', function() {
    // Carica i dati azienda all'avvio
    caricaDatiAzienda();
    
    // Gestione dell'upload del logo
    const logoInput = document.getElementById('logo');
    const logoPreview = document.getElementById('logo-preview');
    const logoImg = document.getElementById('logo-img');
    
    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Verifica che sia un'immagine
            if (!file.type.startsWith('image/')) {
                mostraToast('Errore', 'Seleziona un file immagine valido', 'error');
                return;
            }
            
            // Verifica dimensione (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                mostraToast('Errore', 'Il file è troppo grande. Massimo 5MB', 'error');
                return;
            }
            
            // Mostra anteprima
            const reader = new FileReader();
            reader.onload = function(e) {
                logoImg.src = e.target.result;
                logoImg.style.display = 'block';
                logoPreview.querySelector('p').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Gestione del form
    const form = document.getElementById('dati-azienda-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        salvaDatiAzienda();
    });
    
    // Pulsante reset
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', function() {
        if (confirm('Sei sicuro di voler ripristinare tutti i campi?')) {
            caricaDatiAzienda();
        }
    });
});

// Funzione per caricare i dati azienda
async function caricaDatiAzienda() {
    try {
        const response = await fetch('/api/dati-azienda', {credentials: 'include'})
        const data = await response.json();
        
        if (response.ok) {
            // Popola i campi del form
            document.getElementById('nome_attivita').value = data.nome_attivita || '';
            document.getElementById('indirizzo').value = data.indirizzo || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('telefono').value = data.telefono || '';
            document.getElementById('partita_iva').value = data.partita_iva || '';
            document.getElementById('facebook_url').value = data.facebook_url || '';
            document.getElementById('instagram_url').value = data.instagram_url || '';
            document.getElementById('google_url').value = data.google_url || '';
            document.getElementById('sito_web').value = data.sito_web || '';
            document.getElementById('descrizione').value = data.descrizione || '';
            document.getElementById('orari_apertura').value = data.orari_apertura || '';
            
            // Mostra il logo se presente
            if (data.logo) {
                const logoImg = document.getElementById('logo-img');
                logoImg.src = `/static/${data.logo}`;
                logoImg.style.display = 'block';
                document.querySelector('#logo-preview p').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        mostraToast('Errore', 'Errore nel caricamento dei dati azienda', 'error');
    }
}

// Funzione per salvare i dati azienda
async function salvaDatiAzienda() {
    const form = document.getElementById('dati-azienda-form');
    const formData = new FormData(form);
    
    try {
        // Prima salva i dati testuali
        const datiResponse = await fetch('/api/dati-azienda', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                nome_attivita: formData.get('nome_attivita'),
                indirizzo: formData.get('indirizzo'),
                email: formData.get('email'),
                telefono: formData.get('telefono'),
                partita_iva: formData.get('partita_iva'),
                facebook_url: formData.get('facebook_url'),
                instagram_url: formData.get('instagram_url'),
                google_url: formData.get('google_url'),
                sito_web: formData.get('sito_web'),
                descrizione: formData.get('descrizione'),
                orari_apertura: formData.get('orari_apertura')
            })
        });
        
        if (!datiResponse.ok) {
            throw new Error('Errore nel salvataggio dei dati');
        }
        
        // Se c'è un nuovo logo, caricalo
        const logoFile = formData.get('logo');
        if (logoFile && logoFile.size > 0) {
            const logoFormData = new FormData();
            logoFormData.append('logo', logoFile);
            
            const logoResponse = await fetch('/api/upload-logo', {
                method: 'POST',
                credentials: 'include',
                body: logoFormData
            });
            
            if (!logoResponse.ok) {
                throw new Error('Errore nel caricamento del logo');
            }
        }
        
        mostraToast('Successo', 'Dati azienda salvati con successo!', 'success');
        
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        mostraToast('Errore', 'Errore nel salvataggio dei dati', 'error');
    }
}

// Funzione per mostrare i toast
function mostraToast(titolo, messaggio, tipo = 'info') {
    // Rimuovi toast esistenti
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Crea il nuovo toast
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();
    
    let bgClass = 'bg-info';
    let iconClass = 'fas fa-info-circle';
    
    if (tipo === 'success') {
        bgClass = 'bg-success';
        iconClass = 'fas fa-check-circle';
    } else if (tipo === 'error') {
        bgClass = 'bg-danger';
        iconClass = 'fas fa-exclamation-circle';
    }
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${iconClass} me-2"></i>
                    <strong>${titolo}:</strong> ${messaggio}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.innerHTML = toastHTML;
    
    // Mostra il toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    toast.show();
}

// Funzione per validare l'email
function validaEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Funzione per validare la partita IVA italiana
function validaPartitaIva(piva) {
    if (!piva) return true; // Campo opzionale
    
    // Rimuovi spazi e caratteri non numerici
    piva = piva.replace(/\s/g, '').replace(/[^0-9]/g, '');
    
    // Deve essere di 11 cifre
    if (piva.length !== 11) return false;
    
    // Calcolo del check digit
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let digit = parseInt(piva[i]);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(piva[10]);
}

// Validazione in tempo reale
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    const pivaInput = document.getElementById('partita_iva');
    
    emailInput.addEventListener('blur', function() {
        if (this.value && !validaEmail(this.value)) {
            this.classList.add('is-invalid');
            mostraToast('Attenzione', 'Formato email non valido', 'error');
        } else {
            this.classList.remove('is-invalid');
        }
    });
    
    pivaInput.addEventListener('blur', function() {
        if (this.value && !validaPartitaIva(this.value)) {
            this.classList.add('is-invalid');
            mostraToast('Attenzione', 'Partita IVA non valida', 'error');
        } else {
            this.classList.remove('is-invalid');
        }
    });
});