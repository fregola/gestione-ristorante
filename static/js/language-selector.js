// Selettore di lingua semplificato - Solo interfaccia visiva
class LanguageSelector {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'it';
        this.init();
    }

    init() {
        this.createSelector();
    }

    createSelector() {
        // Crea il selettore di lingua se non esiste già
        if (document.getElementById('language-selector')) return;

        const selector = document.createElement('div');
        selector.id = 'language-selector';
        selector.className = 'language-selector';
        selector.innerHTML = `
            <select id="language-select" class="form-select form-select-sm">
                <option value="it" ${this.currentLanguage === 'it' ? 'selected' : ''}>🇮🇹 Italiano</option>
                <option value="en" ${this.currentLanguage === 'en' ? 'selected' : ''}>🇬🇧 English</option>
            </select>
        `;

        // Posiziona il selettore sopra il logo nella pagina menu
        const companyHeader = document.querySelector('.company-header');
        const companyLogo = document.querySelector('.company-logo');
        
        if (companyHeader && companyLogo) {
            // Inserisci il selettore all'inizio dell'header aziendale, sopra il logo
            companyHeader.insertBefore(selector, companyLogo);
        } else if (companyHeader) {
            // Se non c'è logo, inserisci all'inizio dell'header
            companyHeader.insertBefore(selector, companyHeader.firstChild);
        } else {
            // Fallback: aggiungi alla navbar se esiste
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                navbar.appendChild(selector);
            } else {
                // Se non c'è navbar, aggiungi al body
                document.body.insertBefore(selector, document.body.firstChild);
            }
        }

        // Aggiungi event listener per salvare la selezione
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });
    }

    changeLanguage(newLanguage) {
        // Salva la lingua selezionata nel localStorage
        localStorage.setItem('selectedLanguage', newLanguage);
        this.currentLanguage = newLanguage;
        
        // Mostra un messaggio informativo
        console.log(`Lingua selezionata: ${newLanguage === 'it' ? 'Italiano' : 'English'}`);
        
        // Aggiorna l'interfaccia in base alla pagina corrente
        if (window.location.pathname === '/menu') {
            this.updateMenuInterface(newLanguage);
        }
    }

    /**
     * Aggiorna l'interfaccia del menu mantenendo lo stato corrente
     * @param {string} newLanguage - La nuova lingua selezionata
     */
    updateMenuInterface(newLanguage) {
        try {
            // Mostra indicatore di caricamento
            this.showLanguageChangeIndicator();
            
            // Salva lo stato corrente della vista
            const currentState = this.saveCurrentState();
            
            // Invalida la cache per forzare il ricaricamento con la nuova lingua
            if (typeof invalidaCacheEAggiorna === 'function') {
                invalidaCacheEAggiorna();
            }
            
            // Ricarica i dati con la nuova lingua
            if (typeof caricaCategorie === 'function') {
                caricaCategorie().then(() => {
                    // Ripristina lo stato precedente se possibile
                    this.restoreState(currentState);
                    this.hideLanguageChangeIndicator();
                }).catch(error => {
                    console.error('Errore durante il cambio lingua:', error);
                    this.showLanguageChangeError();
                    this.hideLanguageChangeIndicator();
                });
            } else {
                // Fallback: ricarica la pagina se le funzioni non sono disponibili
                window.location.reload();
            }
        } catch (error) {
            console.error('Errore durante il cambio lingua:', error);
            this.showLanguageChangeError();
        }
    }

    /**
     * Salva lo stato corrente dell'applicazione
     * @returns {Object} Oggetto contenente lo stato corrente
     */
    saveCurrentState() {
        const state = {
            viewType: 'categories', // default
            categoryId: null,
            categoryName: null,
            scrollPosition: window.scrollY
        };

        // Determina il tipo di vista corrente
        const container = document.getElementById('categories-boxes-container');
        if (container) {
            if (container.classList.contains('category-products')) {
                state.viewType = 'products';
                state.categoryId = container.getAttribute('data-categoria-id');
                state.categoryName = container.getAttribute('data-nome-categoria');
            }
        }

        return state;
    }

    /**
     * Ripristina lo stato precedente dell'applicazione
     * @param {Object} state - Lo stato da ripristinare
     */
    restoreState(state) {
        if (state.viewType === 'products' && state.categoryId) {
            // Ripristina la vista prodotti per la categoria
            setTimeout(() => {
                if (typeof visualizzaProdottiCategoria === 'function') {
                    visualizzaProdottiCategoria(parseInt(state.categoryId), state.categoryName);
                }
                // Ripristina la posizione di scroll
                setTimeout(() => {
                    window.scrollTo(0, state.scrollPosition);
                }, 100);
            }, 100);
        } else {
            // Ripristina la vista categorie
            setTimeout(() => {
                if (typeof mostraCategorie === 'function') {
                    mostraCategorie();
                }
                // Ripristina la posizione di scroll
                setTimeout(() => {
                    window.scrollTo(0, state.scrollPosition);
                }, 100);
            }, 100);
        }
    }

    /**
     * Mostra un indicatore di caricamento durante il cambio lingua
     */
    showLanguageChangeIndicator() {
        // Rimuovi indicatori esistenti
        this.hideLanguageChangeIndicator();
        
        const indicator = document.createElement('div');
        indicator.id = 'language-change-indicator';
        indicator.className = 'language-change-indicator';
        indicator.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Caricamento...</span>
                </div>
                <span>Cambio lingua in corso...</span>
            </div>
        `;
        
        // Aggiungi stili inline per l'indicatore
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-size: 14px;
            color: #495057;
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Nasconde l'indicatore di caricamento
     */
    hideLanguageChangeIndicator() {
        const indicator = document.getElementById('language-change-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Mostra un messaggio di errore durante il cambio lingua
     */
    showLanguageChangeError() {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'alert alert-warning alert-dismissible fade show';
        errorMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        `;
        errorMsg.innerHTML = `
            <strong>Attenzione!</strong> Errore durante il cambio lingua. La pagina verrà ricaricata.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(errorMsg);
        
        // Ricarica la pagina dopo 3 secondi
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Inizializza il selettore quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.languageSelector = new LanguageSelector();
});