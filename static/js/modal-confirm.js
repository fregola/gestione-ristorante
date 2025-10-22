/**
 * Sistema di modali di conferma personalizzate
 * Sostituisce i dialog confirm() nativi con modali Bootstrap eleganti
 */

class ModalConfirm {
    constructor() {
        this.modalId = 'customConfirmModal';
        this.createModal();
    }

    createModal() {
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Crea la struttura HTML del modal
        const modalHTML = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-light border-0 pb-2">
                            <h5 class="modal-title fw-bold text-dark" id="confirmModalLabel">
                                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                Conferma Operazione
                            </h5>
                        </div>
                        <div class="modal-body px-4 py-4">
                            <div class="d-flex align-items-start">
                                <div class="flex-shrink-0 me-3">
                                    <div class="bg-warning bg-opacity-10 rounded-circle p-2">
                                        <i class="fas fa-question-circle text-warning fs-4"></i>
                                    </div>
                                </div>
                                <div class="flex-grow-1">
                                    <p class="mb-0 text-dark fw-medium" id="confirmModalMessage">
                                        Sei sicuro di voler procedere con questa operazione?
                                    </p>
                                    <small class="text-muted mt-2 d-block" id="confirmModalSubtext">
                                        Questa azione non può essere annullata.
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pt-0 pb-4 px-4">
                            <button type="button" class="btn btn-light border me-2" id="confirmModalCancel">
                                <i class="fas fa-times me-1"></i>
                                Annulla
                            </button>
                            <button type="button" class="btn btn-danger" id="confirmModalConfirm">
                                <i class="fas fa-trash me-1"></i>
                                Elimina
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Aggiungi il modal al body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Ottieni riferimenti agli elementi
        this.modal = document.getElementById(this.modalId);
        this.modalInstance = new bootstrap.Modal(this.modal);
        this.confirmBtn = document.getElementById('confirmModalConfirm');
        this.cancelBtn = document.getElementById('confirmModalCancel');
        this.messageEl = document.getElementById('confirmModalMessage');
        this.subtextEl = document.getElementById('confirmModalSubtext');
        this.titleEl = document.getElementById('confirmModalLabel');

        // Aggiungi event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Gestisci click su Annulla
        this.cancelBtn.addEventListener('click', () => {
            this.modalInstance.hide();
            if (this.rejectCallback) {
                this.rejectCallback();
            }
        });

        // Gestisci chiusura modal con ESC o click fuori
        this.modal.addEventListener('hidden.bs.modal', () => {
            if (this.rejectCallback) {
                this.rejectCallback();
            }
        });
    }

    /**
     * Mostra il modal di conferma
     * @param {Object} options - Opzioni per il modal
     * @param {string} options.title - Titolo del modal
     * @param {string} options.message - Messaggio principale
     * @param {string} options.subtext - Testo secondario
     * @param {string} options.confirmText - Testo del pulsante di conferma
     * @param {string} options.confirmClass - Classe CSS del pulsante di conferma
     * @param {string} options.icon - Icona da mostrare
     * @returns {Promise} Promise che si risolve con true/false
     */
    show(options = {}) {
        return new Promise((resolve, reject) => {
            // Imposta i valori di default
            const config = {
                title: 'Conferma Operazione',
                message: 'Sei sicuro di voler procedere con questa operazione?',
                subtext: 'Questa azione non può essere annullata.',
                confirmText: 'Elimina',
                confirmClass: 'btn-danger',
                icon: 'fas fa-exclamation-triangle text-warning',
                ...options
            };

            // Aggiorna il contenuto del modal
            this.titleEl.innerHTML = `
                <i class="${config.icon} me-2"></i>
                ${config.title}
            `;
            this.messageEl.textContent = config.message;
            this.subtextEl.textContent = config.subtext;
            this.confirmBtn.innerHTML = `
                <i class="fas fa-trash me-1"></i>
                ${config.confirmText}
            `;
            this.confirmBtn.className = `btn ${config.confirmClass}`;

            // Imposta i callback
            this.rejectCallback = () => resolve(false);

            // Rimuovi event listener precedenti dal pulsante conferma
            const newConfirmBtn = this.confirmBtn.cloneNode(true);
            this.confirmBtn.parentNode.replaceChild(newConfirmBtn, this.confirmBtn);
            this.confirmBtn = newConfirmBtn;

            // Aggiungi nuovo event listener
            this.confirmBtn.addEventListener('click', () => {
                this.modalInstance.hide();
                resolve(true);
            });

            // Mostra il modal
            this.modalInstance.show();
        });
    }

    /**
     * Metodo di convenienza per conferme di eliminazione
     * @param {string} itemName - Nome dell'elemento da eliminare
     * @param {string} itemType - Tipo di elemento (categoria, ingrediente, etc.)
     * @returns {Promise} Promise che si risolve con true/false
     */
    confirmDelete(itemName, itemType = 'elemento') {
        return this.show({
            title: 'Conferma Eliminazione',
            message: `Sei sicuro di voler eliminare ${itemType} "${itemName}"?`,
            subtext: 'Questa azione non può essere annullata e potrebbe influenzare altri elementi collegati.',
            confirmText: 'Elimina',
            confirmClass: 'btn-danger',
            icon: 'fas fa-trash text-danger'
        });
    }

    /**
     * Metodo di convenienza per conferme generiche
     * @param {string} message - Messaggio da mostrare
     * @returns {Promise} Promise che si risolve con true/false
     */
    confirm(message) {
        return this.show({
            message: message,
            confirmText: 'Conferma',
            confirmClass: 'btn-primary',
            icon: 'fas fa-question-circle text-primary'
        });
    }
}

// Crea un'istanza globale
window.modalConfirm = new ModalConfirm();

// Funzione di convenienza globale per sostituire confirm()
window.customConfirm = function(message) {
    return window.modalConfirm.confirm(message);
};

// Funzione di convenienza per eliminazioni
window.confirmDelete = function(itemName, itemType) {
    return window.modalConfirm.confirmDelete(itemName, itemType);
};