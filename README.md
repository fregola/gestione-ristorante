# 🍽️ Sistema di Gestione Ristorante

Un sistema completo per la gestione di ristoranti con interfaccia web moderna, menu digitale e funzionalità real-time.

## 📋 Indice

- [Caratteristiche](#-caratteristiche)
- [Tecnologie Utilizzate](#-tecnologie-utilizzate)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [Utilizzo](#-utilizzo)
- [Struttura del Progetto](#-struttura-del-progetto)
- [API Endpoints](#-api-endpoints)
- [Database](#-database)
- [Funzionalità Real-time](#-funzionalità-real-time)
- [Sicurezza](#-sicurezza)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

## ✨ Caratteristiche

### 🏪 Gestione Aziendale
- **Dati Azienda**: Configurazione nome, descrizione, logo e informazioni di contatto
- **Multilingua**: Supporto italiano/inglese con traduzione automatica Google Translate
- **Upload Logo**: Gestione immagini con ridimensionamento automatico

### 📱 Menu Digitale
- **Menu Pubblico**: Visualizzazione categorie e prodotti senza autenticazione
- **Design Responsivo**: Ottimizzato per desktop, tablet e mobile
- **Aggiornamenti Real-time**: Sincronizzazione automatica via WebSocket
- **Cache Intelligente**: Sistema di cache per prestazioni ottimali

### 🛠️ Gestione Prodotti
- **CRUD Completo**: Creazione, modifica, eliminazione prodotti
- **Gestione Foto**: Upload e gestione immagini prodotti
- **Categorie Gerarchiche**: Categorie padre e figlie con visualizzazione organizzata
- **Allergeni e Ingredienti**: Associazione multipla per ogni prodotto
- **Disponibilità**: Controllo stato disponibilità prodotti

### 📊 Sistema di Categorizzazione
- **Categorie Gerarchiche**: Struttura padre-figlio illimitata
- **Ordinamento**: Controllo ordine visualizzazione
- **Gestione Completa**: CRUD per categorie con validazione

### 🔧 Gestione Ingredienti e Allergeni
- **Database Ingredienti**: Catalogazione completa ingredienti
- **Gestione Allergeni**: Tracciamento allergeni per sicurezza alimentare
- **Associazioni**: Collegamento multiplo prodotti-ingredienti-allergeni

### 🔐 Sistema di Autenticazione
- **Login Sicuro**: Autenticazione con hash password
- **Sessioni**: Gestione sessioni utente con Flask-Login
- **Protezione Route**: Accesso controllato alle funzionalità amministrative

## 🛠️ Tecnologie Utilizzate

### Backend
- **Flask 2.3.3** - Framework web Python
- **Flask-Login 0.6.3** - Gestione autenticazione
- **Flask-SocketIO 5.3.6** - Comunicazione real-time
- **SQLite3** - Database embedded
- **Google Cloud Translate 3.22.0** - Traduzione automatica

### Frontend
- **HTML5/CSS3** - Markup e styling
- **Bootstrap 5** - Framework CSS responsivo
- **JavaScript ES6+** - Logica client-side
- **Socket.IO** - Real-time communication
- **Font Awesome** - Icone

### Sicurezza
- **Werkzeug 2.3.7** - Utilities sicurezza
- **bcrypt 4.0.1** - Hash password
- **CSRF Protection** - Protezione cross-site request forgery

## 🚀 Installazione

### Prerequisiti
- Python 3.8+
- pip (Python package manager)
- Git

### Installazione Rapida

```bash
# Clona il repository
git clone https://github.com/fregola/gestione-ristorante.git
cd gestione-ristorante

# Crea ambiente virtuale
python -m venv venv

# Attiva ambiente virtuale
# Su macOS/Linux:
source venv/bin/activate
# Su Windows:
venv\Scripts\activate

# Installa dipendenze
pip install -r requirements.txt

# Avvia l'applicazione
python app.py
```

L'applicazione sarà disponibile su `http://localhost:5000`

## ⚙️ Configurazione

### Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
# Chiave segreta Flask (CAMBIARE IN PRODUZIONE!)
SECRET_KEY=your-secret-key-here

# Configurazione CORS per Socket.IO
CORS_ORIGINS=http://localhost:5001,http://127.0.0.1:5001

# Configurazione Google Translate (opzionale)
GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
```

### Configurazione Google Translate

1. Crea un progetto su Google Cloud Console
2. Abilita l'API Google Translate
3. Crea credenziali di servizio
4. Scarica il file JSON delle credenziali
5. Imposta la variabile d'ambiente `GOOGLE_APPLICATION_CREDENTIALS`

### Database

Il database SQLite viene creato automaticamente al primo avvio in `database.db`.

**Credenziali di default:**
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANTE**: Cambiare le credenziali di default in produzione!

## 📖 Utilizzo

### Accesso Amministrativo

1. Vai su `http://localhost:5000/login`
2. Inserisci le credenziali di default
3. Accedi al pannello di controllo

### Gestione Dati Azienda

1. Vai su **Impostazioni** → **Dati Azienda**
2. Configura nome, descrizione, contatti
3. Carica il logo aziendale
4. Salva le modificazioni

### Gestione Categorie

1. Vai su **Gestione** → **Categorie**
2. Crea categorie padre (es. "Primi Piatti")
3. Crea categorie figlie (es. "Pasta", "Risotti")
4. Ordina secondo le tue preferenze

### Gestione Prodotti

1. Vai su **Gestione Prodotti**
2. Clicca **Aggiungi Prodotto**
3. Compila tutti i campi:
   - Nome e descrizione
   - Prezzo
   - Categoria (gerarchica)
   - Foto prodotto
   - Allergeni e ingredienti
   - Stato disponibilità
4. Salva il prodotto

### Menu Pubblico

Il menu è accessibile pubblicamente su `http://localhost:5000/menu`:
- Visualizzazione per categorie
- Dettagli prodotti con allergeni
- Aggiornamenti automatici
- Design responsivo

## 📁 Struttura del Progetto

```
gestione-ristorante/
├── app.py                      # Applicazione Flask principale
├── translation_service.py     # Servizio traduzione Google
├── requirements.txt           # Dipendenze Python
├── database.db               # Database SQLite (auto-generato)
├── README.md                 # Documentazione
├── .gitignore               # File Git ignore
├── 
├── static/                  # File statici
│   ├── css/                # Fogli di stile
│   │   ├── style.css       # Stili globali
│   │   ├── menu.css        # Stili menu pubblico
│   │   ├── login.css       # Stili login
│   │   └── ...             # Altri stili specifici
│   ├── js/                 # JavaScript
│   │   ├── main.js         # Script globali
│   │   ├── menu.js         # Logica menu pubblico
│   │   ├── gestione-prodotti.js # Gestione prodotti
│   │   └── ...             # Altri script
│   └── uploads/            # File caricati
│       └── logo/           # Loghi aziendali
│
└── templates/              # Template HTML
    ├── base.html           # Template base
    ├── menu.html           # Menu pubblico
    ├── gestione_prodotti.html # Gestione prodotti
    ├── categorie.html      # Gestione categorie
    ├── login.html          # Pagina login
    └── ...                 # Altri template
```

## 🔌 API Endpoints

### Autenticazione
- `GET /login` - Pagina login
- `POST /login` - Autenticazione utente
- `GET /logout` - Logout utente

### Menu Pubblico
- `GET /menu` - Pagina menu pubblico
- `GET /api/categorie-menu` - Lista categorie per menu
- `GET /api/prodotti/categoria/<id>` - Prodotti per categoria

### Gestione Prodotti
- `GET /api/prodotti` - Lista tutti i prodotti
- `POST /api/menu` - Crea nuovo prodotto
- `PUT /api/menu/<id>` - Aggiorna prodotto
- `DELETE /api/menu/<id>` - Elimina prodotto

### Gestione Categorie
- `GET /api/categorie` - Lista categorie
- `POST /api/categorie` - Crea categoria
- `PUT /api/categorie/<id>` - Aggiorna categoria
- `DELETE /api/categorie/<id>` - Elimina categoria

### Gestione Ingredienti
- `GET /api/ingredienti` - Lista ingredienti
- `POST /api/ingredienti` - Crea ingrediente
- `PUT /api/ingredienti/<id>` - Aggiorna ingrediente
- `DELETE /api/ingredienti/<id>` - Elimina ingrediente

### Gestione Allergeni
- `GET /api/allergeni` - Lista allergeni
- `POST /api/allergeni` - Crea allergene
- `PUT /api/allergeni/<id>` - Aggiorna allergene
- `DELETE /api/allergeni/<id>` - Elimina allergene

### Dati Azienda
- `GET /api/dati-azienda` - Ottieni dati azienda
- `POST /api/dati-azienda` - Aggiorna dati azienda
- `POST /api/upload-logo` - Carica logo aziendale

### Real-time
- `GET /api/menu/last-update` - Timestamp ultimo aggiornamento

## 🗄️ Database

### Schema Tabelle

#### `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
```

#### `categorie`
```sql
CREATE TABLE categorie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    parent_id INTEGER,
    ordine INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categorie (id)
);
```

#### `prodotti`
```sql
CREATE TABLE prodotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    prezzo REAL NOT NULL,
    categoria_id INTEGER,
    foto TEXT,
    disponibile BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorie (id)
);
```

#### `ingredienti`
```sql
CREATE TABLE ingredienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descrizione TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `allergeni`
```sql
CREATE TABLE allergeni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    icona TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `dati_azienda`
```sql
CREATE TABLE dati_azienda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_azienda TEXT,
    descrizione TEXT,
    indirizzo TEXT,
    telefono TEXT,
    email TEXT,
    sito_web TEXT,
    logo_path TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabelle di Associazione
- `prodotti_ingredienti` - Relazione many-to-many prodotti-ingredienti
- `prodotti_allergeni` - Relazione many-to-many prodotti-allergeni

## ⚡ Funzionalità Real-time

### WebSocket Events

Il sistema utilizza Socket.IO per aggiornamenti real-time:

#### Eventi Emessi dal Server
- `prodotto_aggiunto` - Nuovo prodotto creato
- `prodotto_aggiornato` - Prodotto modificato
- `prodotto_eliminato` - Prodotto rimosso
- `categoria_aggiornata` - Categoria modificata

#### Gestione Client-side
```javascript
// Connessione Socket.IO
const socket = io();

// Ascolto eventi
socket.on('prodotto_aggiunto', function(prodotto) {
    // Aggiorna interfaccia
});

socket.on('prodotto_aggiornato', function(prodotto) {
    // Sincronizza modifiche
});
```

### Sistema di Cache

- **Cache Categorie**: 30 secondi di durata
- **Cache Prodotti**: Per categoria, 30 secondi
- **Invalidazione Automatica**: Su modifiche via WebSocket
- **Fallback**: Ricaricamento automatico su errori

## 🔒 Sicurezza

### Misure Implementate

1. **Autenticazione**
   - Hash password con bcrypt
   - Sessioni sicure Flask-Login
   - Protezione route amministrative

2. **Upload File**
   - Validazione estensioni file
   - Nomi file sicuri (secure_filename)
   - Limite dimensione file (16MB)

3. **Database**
   - Query parametrizzate (prevenzione SQL injection)
   - Validazione input lato server
   - Sanitizzazione dati

4. **CORS**
   - Configurazione origins Socket.IO
   - Headers sicurezza

### Raccomandazioni Produzione

1. **Cambiare SECRET_KEY**
2. **Configurare HTTPS**
3. **Usare database PostgreSQL/MySQL**
4. **Implementare rate limiting**
5. **Configurare firewall**
6. **Backup regolari database**
7. **Monitoraggio logs**

## 🤝 Contribuire

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit modifiche (`git commit -am 'Aggiunge nuova funzionalità'`)
4. Push branch (`git push origin feature/nuova-funzionalita`)
5. Crea Pull Request

### Linee Guida

- Codice pulito e commentato
- Test per nuove funzionalità
- Documentazione aggiornata
- Rispetto convenzioni esistenti

## 📝 Changelog

### v1.0.0 (Attuale)
- ✅ Sistema gestione prodotti completo
- ✅ Menu pubblico responsivo
- ✅ Gestione categorie gerarchiche
- ✅ Sistema real-time WebSocket
- ✅ Traduzione automatica Google
- ✅ Upload e gestione immagini
- ✅ Gestione allergeni e ingredienti
- ✅ Sistema autenticazione sicuro

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

---

## 🆘 Supporto

Per supporto, bug report o richieste di funzionalità:

1. **Issues GitHub**: Apri un issue sul repository
2. **Documentazione**: Consulta questo README
3. **Email**: Contatta il maintainer del progetto

---

**Sviluppato con ❤️ per la gestione moderna dei ristoranti**