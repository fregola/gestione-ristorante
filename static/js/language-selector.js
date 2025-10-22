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
        
        // Mostra un messaggio informativo (opzionale)
        console.log(`Lingua selezionata: ${newLanguage === 'it' ? 'Italiano' : 'English'}`);
        
        // Nota: La traduzione automatica è disabilitata per semplificare l'applicazione
        // Il selettore serve solo come interfaccia visiva
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Inizializza il selettore quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    new LanguageSelector();
});