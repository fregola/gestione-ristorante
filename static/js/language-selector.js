// Gestione del selettore di lingua
class LanguageSelector {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'it';
        this.init();
    }

    init() {
        this.createSelector();
        this.updatePageContent();
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

        // Aggiungi event listener
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });
    }

    changeLanguage(newLanguage) {
        this.currentLanguage = newLanguage;
        localStorage.setItem('selectedLanguage', newLanguage);
        this.updatePageContent();
        
        // Ricarica i dati se siamo nella pagina del menu
        if (window.location.pathname.includes('menu')) {
            if (typeof caricaCategorie === 'function' && typeof mostraCategorie === 'function') {
                caricaCategorie().then(() => {
                    mostraCategorie();
                });
            }
        }
    }

    updatePageContent() {
        // Aggiorna i testi statici della pagina in base alla lingua
        const translations = {
            it: {
                'menu-title': 'Menu del Ristorante',
                'categories-title': 'Categorie',
                'products-title': 'Prodotti',
                'price-label': 'Prezzo',
                'ingredients-label': 'Ingredienti',
                'allergens-label': 'Allergeni',
                'back-to-categories': 'Torna alle Categorie',
                'no-products': 'Nessun prodotto disponibile in questa categoria.',
                'loading': 'Caricamento...'
            },
            en: {
                'menu-title': 'Restaurant Menu',
                'categories-title': 'Categories',
                'products-title': 'Products',
                'price-label': 'Price',
                'ingredients-label': 'Ingredients',
                'allergens-label': 'Allergens',
                'back-to-categories': 'Back to Categories',
                'no-products': 'No products available in this category.',
                'loading': 'Loading...'
            }
        };

        const currentTranslations = translations[this.currentLanguage];
        
        // Aggiorna tutti gli elementi con data-translate
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (currentTranslations[key]) {
                element.textContent = currentTranslations[key];
            }
        });
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Inizializza il selettore di lingua quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.languageSelector = new LanguageSelector();
});