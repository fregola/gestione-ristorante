# 🍽️ Gestione Ristorante

Sistema completo di gestione ristorante con supporto multilingue sviluppato con Python Flask e aggiornamenti in tempo reale.

## 🚀 Caratteristiche Principali

- **Sistema Multilingue** (Italiano/Inglese) con traduzioni automatiche
- **Autenticazione sicura** con Flask-Login
- **Aggiornamenti in tempo reale** con Socket.IO
- **Gestione completa menu** con categorie, prodotti, ingredienti e allergeni
- **Upload immagini** per prodotti e logo aziendale
- **Design responsive** con Bootstrap 5
- **Database SQLite** con struttura completa
- **Separazione MVC** per codice organizzato

## 📁 Struttura del Progetto

```
gestione-ristorante/
├── app.py                     # Applicazione Flask principale
├── requirements.txt           # Dipendenze Python
├── ristorante.db             # Database SQLite
├── traduci_dati_esistenti.py # Script per traduzioni automatiche
├── templates/                # Template HTML
│   ├── base.html             # Template base
│   ├── login.html            # Pagina di login
│   ├── home.html             # Dashboard amministrativa
│   ├── menu.html             # Menu pubblico
│   ├── gestione_prodotti.html # Gestione prodotti
│   ├── categorie.html        # Gestione categorie
│   ├── ingredienti.html      # Gestione ingredienti
│   ├── allergeni.html        # Gestione allergeni
│   ├── dati_azienda.html     # Configurazione azienda
│   └── impostazioni.html     # Impostazioni sistema
└── static/                   # File statici
    ├── css/                  # Fogli di stile separati per pagina
    ├── js/                   # JavaScript modulare
    └── uploads/              # Immagini caricate
```

## 🛠️ Installazione

1. **Clona il repository:**
   ```bash
   git clone https://github.com/fregola/gestione-ristorante.git
   cd gestione-ristorante
   ```

2. **Configura le variabili d'ambiente:**
   ```bash
   cp .env.example .env
   ```
   Modifica il file `.env` con le tue credenziali (vedi `SECURITY.md` per dettagli).

3. **Installa le dipendenze:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Avvia l'applicazione:**
   ```bash
   python app.py
   ```

5. **Accedi all'applicazione:**
   - URL: `http://localhost:5001` o `https://ordinalosubito.it`
   - **Username:** `admin`
   - **Password:** `admin123`

## 🔐 Configurazione Sicurezza

Per motivi di sicurezza, le credenziali non sono più hardcoded. Consulta il file `SECURITY.md` per le istruzioni complete sulla configurazione delle credenziali e delle variabili d'ambiente.

## 📱 Funzionalità

### Area Pubblica
- **Menu Multilingue:** Visualizzazione prodotti con cambio lingua
- **Filtri Avanzati:** Per categoria, allergeni, ingredienti
- **Design Responsive:** Ottimizzato per tutti i dispositivi
- **Aggiornamenti Real-time:** Menu sempre sincronizzato

### Area Amministrativa (dopo login)
- **Dashboard:** Panoramica completa del sistema
- **Gestione Prodotti:** CRUD completo con immagini e traduzioni
- **Gestione Categorie:** Organizzazione gerarchica del menu
- **Gestione Ingredienti:** Database completo ingredienti
- **Gestione Allergeni:** Controllo allergeni e intolleranze
- **Dati Azienda:** Logo, informazioni e configurazione
- **Sistema Multilingue:** Traduzioni manuali e automatiche

## 🗄️ Struttura Database

### Tabelle Principali
- `utenti` - Gestione utenti e autenticazione
- `categorie` - Categorie menu con gerarchia
- `prodotti` - Prodotti del menu
- `ingredienti` - Database ingredienti
- `allergeni` - Lista allergeni
- `dati_azienda` - Informazioni aziendali

### Tabelle Traduzioni
- `categorie_traduzioni` - Traduzioni categorie
- `prodotti_traduzioni` - Traduzioni prodotti
- `ingredienti_traduzioni` - Traduzioni ingredienti
- `allergeni_traduzioni` - Traduzioni allergeni

### Tabelle Relazioni
- `prodotto_ingredienti` - Ingredienti per prodotto
- `prodotto_allergeni` - Allergeni per prodotto

## 🌍 Sistema Multilingue

### Lingue Supportate
- **Italiano** (predefinito)
- **Inglese**

### Funzionalità Traduzioni
- **Selettore lingua** visibile su tutte le pagine
- **Traduzioni automatiche** via Google Translate API
- **Traduzioni manuali** tramite interfaccia admin
- **Persistenza** delle preferenze lingua
- **Fallback** alla lingua predefinita se traduzione mancante

## 🔧 Tecnologie Utilizzate

- **Backend:** Python Flask, SQLite
- **Real-time:** Flask-SocketIO
- **Autenticazione:** Flask-Login, bcrypt
- **Frontend:** HTML5, Bootstrap 5, JavaScript ES6+
- **Traduzioni:** Google Translate API
- **Upload:** Werkzeug secure filename
- **Architettura:** MVC pattern

## 🌐 API Endpoints

### Autenticazione
- `GET /` - Redirect alla home o menu
- `GET /login` - Pagina di login
- `POST /login` - Effettua login
- `GET /logout` - Effettua logout

### Area Pubblica
- `GET /menu` - Menu pubblico multilingue

### Area Amministrativa (richiedono login)
- `GET /home` - Dashboard
- `GET /gestione-prodotti` - Gestione prodotti
- `GET /categorie` - Gestione categorie
- `GET /ingredienti` - Gestione ingredienti
- `GET /allergeni` - Gestione allergeni
- `GET /dati-azienda` - Configurazione azienda
- `GET /impostazioni` - Impostazioni sistema

### API REST
- `GET /api/menu/last-update` - Timestamp ultimo aggiornamento
- `POST /api/prodotti` - Aggiungi prodotto
- `PUT /api/prodotti/<id>` - Aggiorna prodotto
- `DELETE /api/prodotti/<id>` - Elimina prodotto
- `POST /api/categorie` - Aggiungi categoria
- `PUT /api/categorie/<id>` - Aggiorna categoria
- `DELETE /api/categorie/<id>` - Elimina categoria
- `POST /api/ingredienti` - Aggiungi ingrediente
- `PUT /api/ingredienti/<id>` - Aggiorna ingrediente
- `DELETE /api/ingredienti/<id>` - Elimina ingrediente
- `POST /api/allergeni` - Aggiungi allergene
- `PUT /api/allergeni/<id>` - Aggiorna allergene
- `DELETE /api/allergeni/<id>` - Elimina allergene

## 🔄 Aggiornamenti Real-time

Socket.IO sincronizza automaticamente:
- Modifiche ai prodotti
- Aggiornamenti categorie
- Cambi di disponibilità
- Notifiche sistema
- Aggiornamenti menu pubblico

## 🎨 Design e UX

- **Responsive Design:** Ottimizzato per desktop, tablet e mobile
- **Interfaccia Moderna:** Bootstrap 5 con personalizzazioni
- **Navigazione Intuitiva:** Menu chiaro e breadcrumb
- **Feedback Visivo:** Toast notifications e loading states
- **Accessibilità:** Icone Font Awesome e buon contrasto
- **Footer Fisso:** Sempre visibile in fondo alla pagina

## 🚀 Sviluppo e Personalizzazione

### Struttura Modulare
- **CSS separati** per ogni pagina
- **JavaScript modulare** con classi ES6+
- **Template estendibili** con Jinja2
- **API RESTful** per integrazioni

### Aggiungere Nuove Lingue
1. Aggiorna il selettore in `language-selector.js`
2. Aggiungi le traduzioni nel database
3. Testa con lo script `traduci_dati_esistenti.py`

## 📝 Script Utili

### Traduzioni Automatiche
```bash
python traduci_dati_esistenti.py
```
Traduce automaticamente tutti i dati esistenti usando Google Translate API.

## 🔒 Sicurezza

- **Password hashate** con bcrypt
- **Sessioni sicure** con Flask-Login
- **Upload sicuri** con validazione file
- **Sanitizzazione input** lato client e server
- **Protezione CSRF** integrata

## 📱 Compatibilità

- **Browser moderni** (Chrome, Firefox, Safari, Edge)
- **Dispositivi mobili** iOS e Android
- **Tablet** con interfaccia ottimizzata
- **Desktop** con layout completo

---

**Sviluppato con ❤️ da F.Creazioni per la gestione completa del tuo ristorante!**