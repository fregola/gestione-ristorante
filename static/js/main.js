// JavaScript principale per Gestione Ristorante

// Configurazione CSRF Token per tutte le richieste AJAX
function setupCSRF() {
    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    // Configura jQuery se disponibile
    if (typeof $ !== 'undefined') {
        $.ajaxSetup({
            beforeSend: function(xhr, settings) {
                if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", token);
                }
            }
        });
    }
    
    // Configura fetch globalmente
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (options.method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(options.method.toUpperCase())) {
            options.headers = options.headers || {};
            options.headers['X-CSRFToken'] = token;
        }
        return originalFetch(url, options);
    };
}

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    // Configura CSRF per AJAX
    setupCSRF();
    
    // Inizializza animazioni
    initAnimations();
    
    // Inizializza tooltips Bootstrap
    initTooltips();
    
    // Gestione form
    initFormValidation();
    
    console.log('Gestione Ristorante - Sistema inizializzato');
});

// Funzione per inizializzare le animazioni
function initAnimations() {
    // Animazione fade-in per le card
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animazione per i badge
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        badge.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Funzione per inizializzare i tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Funzione per la validazione dei form
function initFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
}

// Funzioni di utilità per le notifiche
function showNotification(message, type = 'success', duration = 3000) {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border-radius: 10px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'danger' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Rimuovi automaticamente dopo la durata specificata
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Funzione per confermare azioni
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Funzioni per la gestione del loading
function showLoading(element) {
    const originalContent = element.innerHTML;
    element.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Caricamento...';
    element.disabled = true;
    
    return function hideLoading() {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

// Funzione per formattare i prezzi
function formatPrice(price) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

// Funzione per formattare le date
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Funzione per validare i campi del form
function validateField(field, rules) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Controllo campo obbligatorio
    if (rules.required && !value) {
        isValid = false;
        errorMessage = 'Questo campo è obbligatorio';
    }
    
    // Controllo lunghezza minima
    if (rules.minLength && value.length < rules.minLength) {
        isValid = false;
        errorMessage = `Minimo ${rules.minLength} caratteri`;
    }
    
    // Controllo lunghezza massima
    if (rules.maxLength && value.length > rules.maxLength) {
        isValid = false;
        errorMessage = `Massimo ${rules.maxLength} caratteri`;
    }
    
    // Controllo valore numerico
    if (rules.numeric && isNaN(parseFloat(value))) {
        isValid = false;
        errorMessage = 'Inserire un valore numerico valido';
    }
    
    // Controllo valore minimo
    if (rules.min && parseFloat(value) < rules.min) {
        isValid = false;
        errorMessage = `Valore minimo: ${rules.min}`;
    }
    
    // Aggiorna l'interfaccia
    updateFieldValidation(field, isValid, errorMessage);
    
    return isValid;
}

// Funzione per aggiornare la validazione visuale del campo
function updateFieldValidation(field, isValid, errorMessage) {
    const feedbackElement = field.parentNode.querySelector('.invalid-feedback') || 
                           field.parentNode.querySelector('.valid-feedback');
    
    // Rimuovi classi esistenti
    field.classList.remove('is-valid', 'is-invalid');
    
    if (isValid) {
        field.classList.add('is-valid');
        if (feedbackElement) {
            feedbackElement.textContent = 'Campo valido';
            feedbackElement.className = 'valid-feedback';
        }
    } else {
        field.classList.add('is-invalid');
        if (feedbackElement) {
            feedbackElement.textContent = errorMessage;
            feedbackElement.className = 'invalid-feedback';
        } else {
            // Crea elemento feedback se non esiste
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = errorMessage;
            field.parentNode.appendChild(feedback);
        }
    }
}

// Funzione per gestire gli errori di rete
function handleNetworkError(error) {
    console.error('Errore di rete:', error);
    showNotification('Errore di connessione. Riprova più tardi.', 'danger');
}

// Funzione per debounce (utile per le ricerche)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Funzione per il controllo dello stato della connessione
function checkConnectionStatus() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('connect', function() {
            console.log('Connesso al server');
            updateConnectionStatus(true);
        });
        
        socket.on('disconnect', function() {
            console.log('Disconnesso dal server');
            updateConnectionStatus(false);
        });
        
        return socket;
    }
}

// Funzione per aggiornare l'indicatore di stato della connessione
function updateConnectionStatus(isConnected) {
    const statusIndicators = document.querySelectorAll('.status-indicator');
    statusIndicators.forEach(indicator => {
        if (isConnected) {
            indicator.classList.remove('status-offline');
            indicator.classList.add('status-online');
        } else {
            indicator.classList.remove('status-online');
            indicator.classList.add('status-offline');
        }
    });
}

// Funzione per gestire il responsive design
function handleResponsive() {
    const isMobile = window.innerWidth <= 768;
    
    // Adatta la navbar per mobile
    const navbar = document.querySelector('.navbar-nav');
    if (navbar) {
        if (isMobile) {
            navbar.classList.add('text-center');
        } else {
            navbar.classList.remove('text-center');
        }
    }
    
    // Adatta le tabelle per mobile
    const tables = document.querySelectorAll('.table-responsive');
    tables.forEach(table => {
        if (isMobile) {
            table.style.fontSize = '0.9rem';
        } else {
            table.style.fontSize = '';
        }
    });
}

// Event listener per il resize della finestra
window.addEventListener('resize', debounce(handleResponsive, 250));

// Inizializza il controllo responsive
handleResponsive();

// Esporta funzioni globali per l'uso nei template
window.GestioneRistorante = {
    showNotification,
    confirmAction,
    showLoading,
    formatPrice,
    formatDate,
    validateField,
    handleNetworkError,
    checkConnectionStatus
};