from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import os
from datetime import datetime
import uuid
import time
import requests
import json

# Variabile globale per tracciare l'ultimo aggiornamento
ultimo_aggiornamento = int(time.time() * 1000)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5001,http://127.0.0.1:5001').split(',')
socketio = SocketIO(app, cors_allowed_origins=cors_origins)

# Configurazione Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Devi effettuare il login per accedere a questa pagina.'

# Funzione di traduzione semplificata - DISABILITATA
def traduci_testo(testo, lingua_destinazione='en'):
    """
    Funzione di traduzione semplice per allergeni, categorie e ingredienti comuni.
    """
    if lingua_destinazione != 'en':
        return testo
    
    # Dizionario di traduzioni per allergeni comuni
    traduzioni_allergeni = {
        'glutine': 'gluten',
        'lattosio': 'lactose',
        'uova': 'eggs',
        'pesce': 'fish',
        'crostacei': 'crustaceans',
        'frutta a guscio': 'nuts',
        'soia': 'soy',
        'sedano': 'celery',
        'senape': 'mustard',
        'sesamo': 'sesame',
        'anidride solforosa': 'sulfur dioxide',
        'lupini': 'lupin',
        'molluschi': 'molluscs',
        'arachidi': 'peanuts'
    }
    
    # Dizionario di traduzioni per categorie comuni
    traduzioni_categorie = {
        'antipasti': 'appetizers',
        'primi piatti': 'first courses',
        'secondi piatti': 'main courses',
        'contorni': 'side dishes',
        'dolci': 'desserts',
        'bevande': 'beverages',
        'vini': 'wines',
        'birre': 'beers',
        'cocktail': 'cocktails',
        'caffetteria': 'coffee shop',
        'pizza': 'pizza',
        'pasta': 'pasta',
        'carne': 'meat',
        'pesce': 'fish',
        'vegetariano': 'vegetarian',
        'vegano': 'vegan',
        'vegetariani': 'vegetarian',
        'nuovo': 'new',
        'nuova': 'new',
        'nuovi': 'new',
        'nuove': 'new',
        'gioco': 'game',
        'giochi': 'games',
        'sport': 'sports',
        'fitness': 'fitness',
        'salute': 'health',
        'benessere': 'wellness',
        'tradizionale': 'traditional',
        'moderno': 'modern',
        'classico': 'classic',
        'speciale': 'special',
        'speciali': 'special',
        'gourmet': 'gourmet',
        'fusion': 'fusion',
        'etnico': 'ethnic',
        'internazionale': 'international',
        'regionale': 'regional',
        'stagionale': 'seasonal',
        'fresco': 'fresh',
        'biologico': 'organic',
        'naturale': 'natural',
        'light': 'light',
        'dietetico': 'diet',
        'senza glutine': 'gluten-free',
        'senza lattosio': 'lactose-free'
    }
    
    # Dizionario di traduzioni per ingredienti comuni
    traduzioni_ingredienti = {
        'pomodoro': 'tomato',
        'mozzarella': 'mozzarella',
        'basilico': 'basil',
        'olio': 'oil',
        'aglio': 'garlic',
        'cipolla': 'onion',
        'peperoni': 'peppers',
        'funghi': 'mushrooms',
        'prosciutto': 'ham',
        'salame': 'salami',
        'tonno': 'tuna',
        'salmone': 'salmon',
        'gamberi': 'shrimp',
        'parmigiano': 'parmesan',
        'gorgonzola': 'gorgonzola',
        'ricotta': 'ricotta',
        'spinaci': 'spinach',
        'rucola': 'arugula',
        'olive': 'olives',
        'capperi': 'capers',
        'pancetta': 'bacon',
        'guanciale': 'guanciale',
        'pecorino': 'pecorino',
        'burrata': 'burrata',
        'bresaola': 'bresaola',
        'speck': 'speck',
        'mortadella': 'mortadella',
        'zucchine': 'zucchini',
        'melanzane': 'eggplant',
        'peperoncino': 'chili pepper',
        'uova': 'eggs',
        'spaghetti': 'spaghetti',
        'mascarpone': 'mascarpone',
        'caffè': 'coffee'
    }
    
    # Cerca traduzione esatta (case insensitive)
    testo_lower = testo.lower().strip()
    
    # Controlla prima gli allergeni
    if testo_lower in traduzioni_allergeni:
        return traduzioni_allergeni[testo_lower]
    
    # Poi le categorie
    if testo_lower in traduzioni_categorie:
        return traduzioni_categorie[testo_lower]
    
    # Infine gli ingredienti
    if testo_lower in traduzioni_ingredienti:
        return traduzioni_ingredienti[testo_lower]
    
    # Traduzioni di fallback per parole comuni
    traduzioni_fallback = {
        'nuovo': 'new',
        'nuova': 'new',
        'nuovi': 'new',
        'nuove': 'new',
        'categoria': 'category',
        'prodotto': 'product',
        'prodotti': 'products',
        'menu': 'menu',
        'lista': 'list',
        'altro': 'other',
        'vario': 'various',
        'vari': 'various',
        'varie': 'various',
        'misto': 'mixed',
        'mista': 'mixed',
        'assortito': 'assorted',
        'selezione': 'selection',
        'collezione': 'collection'
    }
    
    # Controlla le traduzioni di fallback
    if testo_lower in traduzioni_fallback:
        return traduzioni_fallback[testo_lower]
    
    # Se non trova traduzione, ritorna il testo originale
    return testo

# Funzione per salvare le traduzioni di un elemento - DISABILITATA per semplificare il database
def salva_traduzioni(tabella, elemento_id, nome_it, descrizione_it=None):
    """
    Funzione disabilitata per semplificare il database.
    Le traduzioni possono essere gestite manualmente se necessario.
    """
    pass

# Classe User per Flask-Login
class User(UserMixin):
    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.password_hash = password_hash

@login_manager.user_loader
def load_user(user_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM utenti WHERE id = ?', (user_id,))
    user_data = cursor.fetchone()
    conn.close()
    
    if user_data:
        return User(user_data[0], user_data[1], user_data[2])
    return None

# Inizializzazione database
def init_db():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Tabella utenti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS utenti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabella prodotti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prodotti (
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
        )
    ''')
    
    # Tabella categorie (sistema gerarchico)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categorie (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            parent_id INTEGER,
            descrizione TEXT,
            ordine INTEGER DEFAULT 0,
            attiva BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES categorie (id)
        )
    ''')
    
    # Tabella allergeni
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS allergeni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descrizione TEXT,
            icona TEXT,
            codice TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            nome_en TEXT
        )
    ''')
    
    # Tabella ingredienti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ingredienti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descrizione TEXT,
            icona TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            nome_en TEXT
        )
    ''')
    
    # Tabella di collegamento prodotti-allergeni (many-to-many)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prodotti_allergeni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prodotto_id INTEGER NOT NULL,
            allergene_id INTEGER NOT NULL,
            FOREIGN KEY (prodotto_id) REFERENCES prodotti (id) ON DELETE CASCADE,
            FOREIGN KEY (allergene_id) REFERENCES allergeni (id) ON DELETE CASCADE,
            UNIQUE(prodotto_id, allergene_id)
        )
    ''')
    
    # Tabella di collegamento prodotti-ingredienti (many-to-many)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prodotti_ingredienti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prodotto_id INTEGER NOT NULL,
            ingrediente_id INTEGER NOT NULL,
            quantita TEXT,
            FOREIGN KEY (prodotto_id) REFERENCES prodotti (id) ON DELETE CASCADE,
            FOREIGN KEY (ingrediente_id) REFERENCES ingredienti (id) ON DELETE CASCADE,
            UNIQUE(prodotto_id, ingrediente_id)
        )
    ''')
    
    # Tabelle di traduzione rimosse per semplificare il database
    # Le traduzioni possono essere gestite direttamente nelle tabelle principali se necessario

    # Tabella azienda per i dati dell'attività
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS azienda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_attivita TEXT,
            indirizzo TEXT,
            email TEXT,
            telefono TEXT,
            partita_iva TEXT,
            logo TEXT,
            facebook_url TEXT,
            instagram_url TEXT,
            google_url TEXT,
            sito_web TEXT,
            descrizione TEXT,
            orari_apertura TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Inserisci categorie di esempio se la tabella è vuota
    cursor.execute('SELECT COUNT(*) FROM categorie')
    if cursor.fetchone()[0] == 0:
        categorie_esempio = [
            # Categorie genitore
            ('Primi Piatti', None, 'Primi piatti della tradizione italiana', 1),
            ('Secondi Piatti', None, 'Secondi piatti di carne e pesce', 2),
            ('Pizza', None, 'Le nostre pizze speciali', 3),
            ('Antipasti', None, 'Antipasti e stuzzichini', 4),
            ('Dolci', None, 'Dolci della casa', 5),
            # Categorie figlie per Primi Piatti
            ('Carne', 1, 'Primi piatti a base di carne', 1),
            ('Pesce', 1, 'Primi piatti a base di pesce', 2),
            ('Vegetariani', 1, 'Primi piatti vegetariani', 3),
            # Categorie figlie per Secondi Piatti  
            ('Carne', 2, 'Secondi piatti a base di carne', 1),
            ('Pesce', 2, 'Secondi piatti a base di pesce', 2),
            ('Vegetariani', 2, 'Secondi piatti vegetariani', 3)
        ]
        cursor.executemany('INSERT INTO categorie (nome, parent_id, descrizione, ordine) VALUES (?, ?, ?, ?)', 
                          categorie_esempio)
    
    # Inserisci allergeni di esempio se la tabella è vuota
    cursor.execute('SELECT COUNT(*) FROM allergeni')
    if cursor.fetchone()[0] == 0:
        allergeni_esempio = [
            ('Glutine', '🌾'),
            ('Lattosio', '🥛'),
            ('Uova', '🥚'),
            ('Pesce', '🐟'),
            ('Crostacei', '🦐'),
            ('Frutta a guscio', '🥜'),
            ('Soia', '🫘'),
            ('Sedano', '🥬')
        ]
        cursor.executemany('INSERT INTO allergeni (nome, icona) VALUES (?, ?)', 
                          allergeni_esempio)
    
    # Inserisci ingredienti di esempio se la tabella è vuota
    cursor.execute('SELECT COUNT(*) FROM ingredienti')
    if cursor.fetchone()[0] == 0:
        ingredienti_esempio = [
            ('Pomodoro', '🍅'),
            ('Mozzarella', '🧀'),
            ('Basilico', '🌿'),
            ('Olio extravergine', '🫒'),
            ('Pancetta', '🥓'),
            ('Pecorino', '🧀'),
            ('Uova', '🥚'),
            ('Spaghetti', '🍝'),
            ('Mascarpone', '🧀'),
            ('Caffè', '☕')
        ]
        cursor.executemany('INSERT INTO ingredienti (nome, icona) VALUES (?, ?)', 
                          ingredienti_esempio)
    
    # Crea utente admin di default se non esiste
    default_admin_username = os.environ.get('DEFAULT_ADMIN_USERNAME', 'admin')
    default_admin_password = os.environ.get('DEFAULT_ADMIN_PASSWORD')
    
    cursor.execute('SELECT * FROM utenti WHERE username = ?', (default_admin_username,))
    if not cursor.fetchone() and default_admin_password:
        admin_password = generate_password_hash(default_admin_password)
        cursor.execute('INSERT INTO utenti (username, password_hash) VALUES (?, ?)', 
                      (default_admin_username, admin_password))
    
    # Inserisci alcuni prodotti di esempio se la tabella è vuota
    cursor.execute('SELECT COUNT(*) FROM prodotti')
    if cursor.fetchone()[0] == 0:
        prodotti_esempio = [
            ('Pizza Margherita', 'Pizza con pomodoro, mozzarella e basilico', 8.50, 3),  # Pizza
            ('Spaghetti Carbonara', 'Pasta con uova, pancetta e pecorino', 12.00, 6),   # Primi->Carne
            ('Tiramisù', 'Dolce al caffè con mascarpone', 6.00, 5),                     # Dolci
            ('Bruschetta', 'Pane tostato con pomodoro e basilico', 5.50, 4)             # Antipasti
        ]
        cursor.executemany('INSERT INTO prodotti (nome, descrizione, prezzo, categoria_id) VALUES (?, ?, ?, ?)', 
                          prodotti_esempio)
    
    conn.commit()
    
    # Aggiungi colonna 'attivo' alla tabella prodotti se non esiste
    try:
        cursor.execute('ALTER TABLE prodotti ADD COLUMN attivo BOOLEAN DEFAULT 1')
        conn.commit()
    except sqlite3.OperationalError:
        # La colonna esiste già
        pass
    
    # Aggiungi colonna 'ultimo_aggiornamento' alla tabella prodotti se non esiste
    try:
        cursor.execute('ALTER TABLE prodotti ADD COLUMN ultimo_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        conn.commit()
    except sqlite3.OperationalError:
        # La colonna esiste già
        pass
    
    conn.close()

# Route per il login
@app.route('/')
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = sqlite3.connect('ristorante.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM utenti WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        conn.close()
        
        if user_data and check_password_hash(user_data[2], password):
            user = User(user_data[0], user_data[1], user_data[2])
            login_user(user)
            return redirect(url_for('home'))
        else:
            flash('Username o password non corretti', 'error')
    
    return render_template('login.html')

# Route per la home (dopo il login)
@app.route('/home')
@login_required
def home():
    return render_template('home.html', username=current_user.username)

# Route per visualizzare tutti i prodotti (senza autenticazione)
@app.route('/menu')
def menu():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Recupera i dati azienda
    cursor.execute('SELECT * FROM azienda LIMIT 1')
    dati_azienda = cursor.fetchone()
    
    conn.close()
    
    return render_template('menu.html', dati_azienda=dati_azienda)

# Route per gestire i prodotti (con autenticazione) - OTTIMIZZATA
@app.route('/gestione-prodotti')
@login_required
def gestione_prodotti():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query ottimizzata 1: Ottieni solo i prodotti base con categorie
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, 
               CASE 
                   WHEN parent.nome IS NOT NULL THEN parent.nome || ' > ' || c.nome
                   ELSE c.nome
               END as categoria_nome,
               p.categoria_id, p.foto, p.disponibile
        FROM prodotti p 
        LEFT JOIN categorie c ON p.categoria_id = c.id 
        LEFT JOIN categorie parent ON c.parent_id = parent.id
        WHERE p.attivo = 1
        ORDER BY p.nome
    ''')
    prodotti_base = cursor.fetchall()
    
    # Crea un dizionario per i prodotti
    prodotti_dict = {}
    for prodotto in prodotti_base:
        prodotti_dict[prodotto[0]] = {
            'id': prodotto[0],
            'nome': prodotto[1],
            'descrizione': prodotto[2],
            'prezzo': prodotto[3],
            'categoria_nome': prodotto[4],
            'categoria_id': prodotto[5],
            'foto': prodotto[6],
            'disponibile': prodotto[7],
            'allergeni': [],
            'ingredienti': [],
            'allergeni_ids': [],
            'ingredienti_ids': []
        }
    
    if prodotti_dict:
        prodotti_ids = list(prodotti_dict.keys())
        placeholders = ','.join(['?' for _ in prodotti_ids])
        
        # Query ottimizzata 2: Ottieni allergeni per tutti i prodotti
        cursor.execute(f'''
            SELECT pa.prodotto_id, a.nome, a.id
            FROM prodotti_allergeni pa
            JOIN allergeni a ON pa.allergene_id = a.id
            WHERE pa.prodotto_id IN ({placeholders})
            ORDER BY pa.prodotto_id, a.nome
        ''', prodotti_ids)
        
        for row in cursor.fetchall():
            prodotto_id, allergene_nome, allergene_id = row
            if prodotto_id in prodotti_dict:
                prodotti_dict[prodotto_id]['allergeni'].append(allergene_nome)
                prodotti_dict[prodotto_id]['allergeni_ids'].append(str(allergene_id))
        
        # Query ottimizzata 3: Ottieni ingredienti per tutti i prodotti
        cursor.execute(f'''
            SELECT pi.prodotto_id, i.nome, i.id
            FROM prodotti_ingredienti pi
            JOIN ingredienti i ON pi.ingrediente_id = i.id
            WHERE pi.prodotto_id IN ({placeholders})
            ORDER BY pi.prodotto_id, i.nome
        ''', prodotti_ids)
        
        for row in cursor.fetchall():
            prodotto_id, ingrediente_nome, ingrediente_id = row
            if prodotto_id in prodotti_dict:
                prodotti_dict[prodotto_id]['ingredienti'].append(ingrediente_nome)
                prodotti_dict[prodotto_id]['ingredienti_ids'].append(str(ingrediente_id))
    
    # Converti il dizionario in lista nel formato atteso dal template
    prodotti_list = []
    for prodotto in prodotti_dict.values():
        prodotti_list.append((
            prodotto['id'],
            prodotto['nome'],
            prodotto['descrizione'],
            prodotto['prezzo'],
            prodotto['categoria_nome'],
            prodotto['categoria_id'],
            prodotto['foto'],
            prodotto['disponibile'],
            ','.join(prodotto['allergeni']) if prodotto['allergeni'] else None,
            ','.join(prodotto['ingredienti']) if prodotto['ingredienti'] else None,
            ','.join(prodotto['allergeni_ids']) if prodotto['allergeni_ids'] else None,
            ','.join(prodotto['ingredienti_ids']) if prodotto['ingredienti_ids'] else None
        ))
    
    conn.close()
    return render_template('gestione_prodotti.html', prodotti=prodotti_list)

# API per aggiungere prodotto
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    if file and allowed_file(file.filename):
        # Genera un nome file unico
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        return f"uploads/{unique_filename}"
    return None
# API per aggiungere prodotto
@app.route('/api/menu', methods=['POST'])
@login_required
def aggiungi_prodotto():
    # Gestisce sia form-data (con file) che JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form con file upload
        nome = request.form.get('nome')
        descrizione = request.form.get('descrizione')
        prezzo = float(request.form.get('prezzo'))
        categoria_id = int(request.form.get('categoria_id'))
        disponibile = request.form.get('disponibile', 'true').lower() == 'true'
        
        # Gestione allergeni e ingredienti
        allergeni_json = request.form.get('allergeni', '[]')
        ingredienti_json = request.form.get('ingredienti', '[]')
        
        # Gestione foto
        foto_path = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file.filename != '':
                foto_path = save_uploaded_file(file)
    else:
        # JSON data (compatibilità con codice esistente)
        data = request.get_json()
        nome = data['nome']
        descrizione = data['descrizione']
        prezzo = data['prezzo']
        categoria_id = data['categoria_id']
        disponibile = data.get('disponibile', True)
        allergeni_json = data.get('allergeni', '[]')
        ingredienti_json = data.get('ingredienti', '[]')
        foto_path = None
    
    # Parse degli array JSON
    import json
    try:
        allergeni_ids = json.loads(allergeni_json) if isinstance(allergeni_json, str) else allergeni_json
        ingredienti_ids = json.loads(ingredienti_json) if isinstance(ingredienti_json, str) else ingredienti_json
    except json.JSONDecodeError:
        allergeni_ids = []
        ingredienti_ids = []
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Inserisci il prodotto
    cursor.execute('''
        INSERT INTO prodotti (nome, descrizione, prezzo, categoria_id, foto, disponibile) 
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (nome, descrizione, prezzo, categoria_id, foto_path, disponibile))
    
    prodotto_id = cursor.lastrowid
    
    # Inserisci associazioni con allergeni
    for allergene_id in allergeni_ids:
        cursor.execute('''
            INSERT INTO prodotti_allergeni (prodotto_id, allergene_id) 
            VALUES (?, ?)
        ''', (prodotto_id, allergene_id))
    
    # Inserisci associazioni con ingredienti
    for ingrediente_id in ingredienti_ids:
        cursor.execute('''
            INSERT INTO prodotti_ingredienti (prodotto_id, ingrediente_id) 
            VALUES (?, ?)
        ''', (prodotto_id, ingrediente_id))
    
    conn.commit()
    conn.close()
    
    # Traduzioni automatiche disabilitate per migliorare le performance
    # Le traduzioni possono essere aggiunte manualmente tramite l'interfaccia admin
    
    # Aggiorna timestamp per polling
    global ultimo_aggiornamento
    ultimo_aggiornamento = int(time.time() * 1000)
    
    # Emetti aggiornamento in tempo reale
    socketio.emit('prodotto_aggiunto', {
        'id': prodotto_id,
        'nome': nome,
        'descrizione': descrizione,
        'prezzo': prezzo,
        'categoria_id': categoria_id,
        'foto': foto_path,
        'disponibile': disponibile
    })
    
    return jsonify({'success': True, 'id': prodotto_id, 'foto': foto_path})

# API per aggiornare prodotto
@app.route('/api/menu/<int:prodotto_id>', methods=['PUT'])
@login_required
def aggiorna_prodotto(prodotto_id):
    # Gestisce sia form-data (con file) che JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form con file upload
        nome = request.form.get('nome')
        descrizione = request.form.get('descrizione')
        prezzo = float(request.form.get('prezzo'))
        categoria_id = int(request.form.get('categoria_id'))
        disponibile = request.form.get('disponibile', 'false').lower() == 'true'
        
        print(f"=== DEBUG BACKEND PUT ===")
        print(f"Disponibile raw value: '{request.form.get('disponibile')}'")
        print(f"Disponibile converted: {disponibile}")
        print(f"All form data: {dict(request.form)}")
        
        # Gestione allergeni e ingredienti
        allergeni_json = request.form.get('allergeni', '[]')
        ingredienti_json = request.form.get('ingredienti', '[]')
        
        # Gestione foto
        foto_path = None
        if 'foto' in request.files:
            file = request.files['foto']
            if file.filename != '':
                # Elimina la vecchia foto se esiste
                conn = sqlite3.connect('ristorante.db')
                cursor = conn.cursor()
                cursor.execute('SELECT foto FROM prodotti WHERE id = ?', (prodotto_id,))
                old_foto = cursor.fetchone()
                if old_foto and old_foto[0]:
                    old_file_path = os.path.join('static', old_foto[0])
                    if os.path.exists(old_file_path):
                        try:
                            os.remove(old_file_path)
                            print(f"Vecchia foto eliminata: {old_file_path}")
                        except OSError as e:
                            print(f"Errore nell'eliminazione della vecchia foto {old_file_path}: {e}")
                conn.close()
                
                foto_path = save_uploaded_file(file)
        else:
            # Mantieni la foto esistente se non viene caricata una nuova
            conn = sqlite3.connect('ristorante.db')
            cursor = conn.cursor()
            cursor.execute('SELECT foto FROM prodotti WHERE id = ?', (prodotto_id,))
            result = cursor.fetchone()
            foto_path = result[0] if result else None
            conn.close()
    else:
        # JSON data (compatibilità con codice esistente)
        data = request.get_json()
        nome = data['nome']
        descrizione = data['descrizione']
        prezzo = data['prezzo']
        categoria_id = data['categoria_id']
        disponibile = data.get('disponibile', True)
        allergeni_json = data.get('allergeni', '[]')
        ingredienti_json = data.get('ingredienti', '[]')
        
        # Mantieni la foto esistente per aggiornamenti JSON
        conn = sqlite3.connect('ristorante.db')
        cursor = conn.cursor()
        cursor.execute('SELECT foto FROM prodotti WHERE id = ?', (prodotto_id,))
        result = cursor.fetchone()
        foto_path = result[0] if result else None
        conn.close()
    
    # Parse degli array JSON
    import json
    try:
        allergeni_ids = json.loads(allergeni_json) if isinstance(allergeni_json, str) else allergeni_json
        ingredienti_ids = json.loads(ingredienti_json) if isinstance(ingredienti_json, str) else ingredienti_json
    except json.JSONDecodeError:
        allergeni_ids = []
        ingredienti_ids = []
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    try:
        # Aggiorna il prodotto
        cursor.execute('''
            UPDATE prodotti 
            SET nome = ?, descrizione = ?, prezzo = ?, categoria_id = ?, foto = ?, disponibile = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (nome, descrizione, prezzo, categoria_id, foto_path, disponibile, prodotto_id))
        
        # Rimuovi associazioni esistenti in batch
        cursor.execute('DELETE FROM prodotti_allergeni WHERE prodotto_id = ?', (prodotto_id,))
        cursor.execute('DELETE FROM prodotti_ingredienti WHERE prodotto_id = ?', (prodotto_id,))
        
        # Inserisci nuove associazioni con allergeni in batch
        if allergeni_ids:
            allergeni_data = [(prodotto_id, allergene_id) for allergene_id in allergeni_ids]
            cursor.executemany('''
                INSERT INTO prodotti_allergeni (prodotto_id, allergene_id) 
                VALUES (?, ?)
            ''', allergeni_data)
        
        # Inserisci nuove associazioni con ingredienti in batch
        if ingredienti_ids:
            # Gestisce sia array di ID che array di oggetti con id e quantita
            ingredienti_data = []
            for ingrediente in ingredienti_ids:
                if isinstance(ingrediente, dict):
                    # Formato: {"id": 1, "quantita": "100g"}
                    ingrediente_id = ingrediente.get('id')
                    quantita = ingrediente.get('quantita', '')
                else:
                    # Formato: solo ID numerico
                    ingrediente_id = ingrediente
                    quantita = ''
                
                if ingrediente_id:
                    ingredienti_data.append((prodotto_id, ingrediente_id, quantita))
            
            if ingredienti_data:
                cursor.executemany('''
                    INSERT INTO prodotti_ingredienti (prodotto_id, ingrediente_id, quantita) 
                    VALUES (?, ?, ?)
                ''', ingredienti_data)

        # Commit della transazione
        conn.commit()
        
    except Exception as e:
        # Rollback in caso di errore
        conn.rollback()
        print(f"Errore durante l'aggiornamento del prodotto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
    
    # Traduzioni automatiche disabilitate per migliorare le performance
    # Le traduzioni possono essere aggiunte manualmente tramite l'interfaccia admin
    
    # Aggiorna il timestamp dell'ultimo aggiornamento
    global ultimo_aggiornamento
    ultimo_aggiornamento = int(time.time() * 1000)
    
    # Emetti aggiornamento in tempo reale
    socketio.emit('prodotto_aggiornato', {
        'id': prodotto_id,
        'nome': nome,
        'descrizione': descrizione,
        'prezzo': prezzo,
        'categoria_id': categoria_id,
        'foto': foto_path,
        'disponibile': disponibile
    })
    
    return jsonify({'success': True, 'foto': foto_path})

# API per eliminare prodotto
@app.route('/api/menu/<int:prodotto_id>', methods=['DELETE'])
@login_required
def elimina_prodotto(prodotto_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Prima di eliminare il prodotto, recupera il percorso della foto
    cursor.execute('SELECT foto FROM prodotti WHERE id = ?', (prodotto_id,))
    result = cursor.fetchone()
    foto_path = result[0] if result else None
    
    # Elimina il prodotto dal database
    cursor.execute('DELETE FROM prodotti WHERE id = ?', (prodotto_id,))
    conn.commit()
    conn.close()
    
    # Elimina la foto dal filesystem se esiste
    if foto_path:
        full_foto_path = os.path.join('static', foto_path)
        if os.path.exists(full_foto_path):
            try:
                os.remove(full_foto_path)
                print(f"Foto eliminata: {full_foto_path}")
            except OSError as e:
                print(f"Errore nell'eliminazione della foto {full_foto_path}: {e}")
    
    # Emetti aggiornamento in tempo reale
    socketio.emit('prodotto_eliminato', {'id': prodotto_id})
    
    return {'success': True}

# Route per le impostazioni
@app.route('/impostazioni')
@login_required
def impostazioni():
    return render_template('impostazioni.html')

# Route per le categorie
@app.route('/categorie')
@login_required
def categorie():
    return render_template('categorie.html')

# Route per gli ingredienti
@app.route('/ingredienti')
@login_required
def ingredienti():
    return render_template('ingredienti.html')

# Route per gli allergeni
@app.route('/allergeni')
@login_required
def allergeni():
    return render_template('allergeni.html')

# Route per i dati azienda
@app.route('/dati-azienda')
@login_required
def dati_azienda():
    return render_template('dati_azienda.html')

# API per gestire i dati azienda
@app.route('/api/dati-azienda', methods=['GET'])
@login_required
def get_dati_azienda():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM azienda WHERE id = 1')
    azienda = cursor.fetchone()
    conn.close()
    
    if azienda:
        return jsonify({
            'id': azienda[0],
            'nome_attivita': azienda[1],
            'indirizzo': azienda[2],
            'email': azienda[3],
            'telefono': azienda[4],
            'partita_iva': azienda[5],
            'logo': azienda[6],
            'facebook_url': azienda[7],
            'instagram_url': azienda[8],
            'google_url': azienda[9],
            'sito_web': azienda[10],
            'descrizione': azienda[11],
            'orari_apertura': azienda[12]
        })
    else:
        return jsonify({
            'nome_attivita': 'Il Mio Ristorante',
            'indirizzo': '',
            'email': '',
            'telefono': '',
            'partita_iva': '',
            'logo': '',
            'facebook_url': '',
            'instagram_url': '',
            'google_url': '',
            'sito_web': '',
            'descrizione': '',
            'orari_apertura': ''
        })

@app.route('/api/dati-azienda', methods=['POST'])
@login_required
def update_dati_azienda():
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('ristorante.db')
        cursor = conn.cursor()
        
        # Aggiorna o inserisce i dati azienda
        cursor.execute('''
            INSERT OR REPLACE INTO azienda 
            (id, nome_attivita, indirizzo, email, telefono, partita_iva, 
             facebook_url, instagram_url, google_url, sito_web, descrizione, orari_apertura, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            data.get('nome_attivita'),
            data.get('indirizzo'),
            data.get('email'),
            data.get('telefono'),
            data.get('partita_iva'),
            data.get('facebook_url'),
            data.get('instagram_url'),
            data.get('google_url'),
            data.get('sito_web'),
            data.get('descrizione'),
            data.get('orari_apertura')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Dati azienda aggiornati con successo'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Errore durante l\'aggiornamento: {str(e)}'})

@app.route('/api/upload-logo', methods=['POST'])
@login_required
def upload_logo():
    try:
        if 'logo' not in request.files:
            return jsonify({'success': False, 'message': 'Nessun file selezionato'})
        
        file = request.files['logo']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nessun file selezionato'})
        
        if file and allowed_file(file.filename):
            filename = save_uploaded_file(file)
            
            # Aggiorna il logo nel database
            conn = sqlite3.connect('ristorante.db')
            cursor = conn.cursor()
            cursor.execute('UPDATE azienda SET logo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', (filename,))
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'Logo caricato con successo', 'logo_path': filename})
        else:
            return jsonify({'success': False, 'message': 'Formato file non supportato'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Errore durante il caricamento: {str(e)}'})

# API per gestire le categorie
@app.route('/api/categorie', methods=['GET'])
@login_required
def get_categorie():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query per ottenere tutte le categorie con i loro parent
    cursor.execute('''
        SELECT c.id, c.nome, c.parent_id, c.descrizione, c.ordine,
               p.nome as parent_nome, c.nome_en
        FROM categorie c
        LEFT JOIN categorie p ON c.parent_id = p.id
        ORDER BY c.nome
    ''')
    all_categorie = cursor.fetchall()
    
    conn.close()
    
    categorie_list = []
    for cat in all_categorie:
        categorie_list.append({
            'id': cat[0],
            'nome': cat[1],
            'parent_id': cat[2],
            'descrizione': cat[3],
            'ordine': cat[4],
            'parent_nome': cat[5],
            'nome_en': cat[6] if cat[6] else cat[1]  # Fallback al nome italiano se non c'è traduzione
        })
    
    return {'categorie': categorie_list}

@app.route('/api/categorie', methods=['POST'])
@login_required
def aggiungi_categoria():
    data = request.get_json()
    
    # Traduzione automatica del nome in inglese
    nome_en = traduci_testo(data['nome'])
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO categorie (nome, parent_id, descrizione, ordine, nome_en) 
        VALUES (?, ?, ?, ?, ?)
    ''', (data['nome'], data.get('parent_id'), data.get('descrizione', ''), data.get('ordine', 0), nome_en))
    
    categoria_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {'success': True, 'id': categoria_id}

# Funzione duplicata rimossa - mantenuta solo la prima definizione

@app.route('/api/categorie/<int:categoria_id>', methods=['DELETE'])
@login_required
def elimina_categoria(categoria_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Verifica se ci sono prodotti associati a questa categoria
    cursor.execute('SELECT COUNT(*) FROM prodotti WHERE categoria_id = ? AND attivo = 1', (categoria_id,))
    prodotti_count = cursor.fetchone()[0]
    
    if prodotti_count > 0:
        conn.close()
        return {'success': False, 'error': 'Impossibile eliminare la categoria: ci sono prodotti associati'}, 400
    
    # Verifica se ci sono sottocategorie
    cursor.execute('SELECT COUNT(*) FROM categorie WHERE parent_id = ?', (categoria_id,))
    sottocategorie_count = cursor.fetchone()[0]
    
    if sottocategorie_count > 0:
        conn.close()
        return {'success': False, 'error': 'Impossibile eliminare la categoria: ci sono sottocategorie associate'}, 400
    
    # Elimina fisicamente la categoria
    cursor.execute('DELETE FROM categorie WHERE id = ?', (categoria_id,))
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('categoria_eliminata', {'id': categoria_id})
    
    return {'success': True}

# Funzione duplicata rimossa - mantenuta solo la prima definizione

@app.route('/api/categorie/<int:categoria_id>', methods=['PUT'])
@login_required
def aggiorna_categoria(categoria_id):
    data = request.get_json()
    
    # Traduzione automatica del nome in inglese
    nome_en = traduci_testo(data['nome'])
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE categorie 
        SET nome = ?, parent_id = ?, descrizione = ?, ordine = ?, nome_en = ?
        WHERE id = ?
    ''', (data['nome'], data.get('parent_id'), data.get('descrizione', ''), data.get('ordine', 0), nome_en, categoria_id))
    
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('categoria_aggiornata', {'id': categoria_id, 'data': data})
    
    return {'success': True}

# Funzione duplicata rimossa - mantenuta solo la prima definizione

# API per gestire gli allergeni
@app.route('/api/allergeni', methods=['GET'])
@login_required
def get_allergeni():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM allergeni ORDER BY nome')
    allergeni = cursor.fetchall()
    conn.close()
    
    allergeni_list = []
    for all in allergeni:
        allergeni_list.append({
            'id': all[0],
            'nome': all[1],
            'descrizione': all[2],
            'icona': all[3],
            'nome_en': all[4] if len(all) > 4 else None  # Gestisce allergeni senza traduzione
        })
    
    return {'allergeni': allergeni_list}

@app.route('/api/allergeni', methods=['POST'])
@login_required
def aggiungi_allergene():
    data = request.get_json()
    
    # Genera automaticamente la traduzione inglese
    nome_en = traduci_testo(data['nome'], 'en')
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO allergeni (nome, icona, nome_en) 
        VALUES (?, ?, ?)
    ''', (data['nome'], data.get('icona', ''), nome_en))
    
    allergene_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {'success': True, 'id': allergene_id}

@app.route('/api/allergeni/<int:allergene_id>', methods=['PUT'])
@login_required
def aggiorna_allergene(allergene_id):
    data = request.get_json()
    
    # Genera automaticamente la traduzione inglese
    nome_en = traduci_testo(data['nome'], 'en')
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE allergeni 
        SET nome = ?, icona = ?, nome_en = ?
        WHERE id = ?
    ''', (data['nome'], data.get('icona', ''), nome_en, allergene_id))
    
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('allergene_aggiornato', {'id': allergene_id, 'data': data})
    
    return {'success': True}

@app.route('/api/allergeni/<int:allergene_id>', methods=['DELETE'])
@login_required
def elimina_allergene(allergene_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Verifica se ci sono prodotti associati a questo allergene
    cursor.execute('SELECT COUNT(*) FROM prodotti_allergeni WHERE allergene_id = ?', (allergene_id,))
    prodotti_count = cursor.fetchone()[0]
    
    if prodotti_count > 0:
        conn.close()
        return {'success': False, 'error': 'Impossibile eliminare l\'allergene: ci sono prodotti associati'}, 400
    
    # Elimina fisicamente l'allergene
    cursor.execute('DELETE FROM allergeni WHERE id = ?', (allergene_id,))
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('allergene_eliminato', {'id': allergene_id})
    
    return {'success': True}

# API per gestire gli ingredienti
@app.route('/api/ingredienti', methods=['GET'])
@login_required
def get_ingredienti():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, icona, nome_en FROM ingredienti ORDER BY nome')
    ingredienti = cursor.fetchall()
    conn.close()
    
    ingredienti_list = []
    for ing in ingredienti:
        ingredienti_list.append({
            'id': ing[0],
            'nome': ing[1],
            'icona': ing[2],
            'nome_en': ing[3] if ing[3] else ing[1]  # Fallback al nome italiano se non c'è traduzione
        })
    
    return {'ingredienti': ingredienti_list}

@app.route('/api/ingredienti', methods=['POST'])
@login_required
def aggiungi_ingrediente():
    data = request.get_json()
    
    # Traduzione automatica del nome in inglese
    nome_en = traduci_testo(data['nome'])
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO ingredienti (nome, icona, nome_en)
        VALUES (?, ?, ?)
        ''', (data['nome'], data.get('icona', ''), nome_en))
    
    ingrediente_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {'success': True, 'id': ingrediente_id}

@app.route('/api/ingredienti/<int:ingrediente_id>', methods=['PUT'])
@login_required
def aggiorna_ingrediente(ingrediente_id):
    data = request.get_json()
    
    # Traduzione automatica del nome in inglese
    nome_en = traduci_testo(data['nome'])
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE ingredienti 
        SET nome = ?, icona = ?, nome_en = ?
        WHERE id = ?
        ''', (data['nome'], data.get('icona', ''), nome_en, ingrediente_id))
    
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('ingrediente_aggiornato', {'id': ingrediente_id, 'data': data})
    
    return {'success': True}

@app.route('/api/ingredienti/<int:ingrediente_id>', methods=['DELETE'])
@login_required
def elimina_ingrediente(ingrediente_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Verifica se ci sono prodotti associati a questo ingrediente
    cursor.execute('SELECT COUNT(*) FROM prodotti_ingredienti WHERE ingrediente_id = ?', (ingrediente_id,))
    prodotti_count = cursor.fetchone()[0]
    
    if prodotti_count > 0:
        conn.close()
        return {'success': False, 'error': 'Impossibile eliminare l\'ingrediente: ci sono prodotti associati'}, 400
    
    # Elimina fisicamente l'ingrediente
    cursor.execute('DELETE FROM ingredienti WHERE id = ?', (ingrediente_id,))
    conn.commit()
    conn.close()
    
    # Emetti evento SocketIO per aggiornamento real-time
    socketio.emit('ingrediente_eliminato', {'id': ingrediente_id})
    
    return {'success': True}

# API per ottenere tutti i prodotti
@app.route('/api/prodotti', methods=['GET'])
def get_prodotti():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, p.categoria_id, p.disponibile, 
               p.foto, p.updated_at, c.nome as categoria_nome
        FROM prodotti p
        LEFT JOIN categorie c ON p.categoria_id = c.id
        WHERE p.attivo = 1
        ORDER BY c.nome, p.nome
    ''')
    
    prodotti = []
    for row in cursor.fetchall():
        prodotti.append({
            'id': row[0],
            'nome': row[1],
            'descrizione': row[2],
            'prezzo': row[3],
            'categoria_id': row[4],
            'disponibile': bool(row[5]),
            'foto': row[6],
            'ultimo_aggiornamento': row[7],
            'categoria_nome': row[8]
        })
    
    conn.close()
    return jsonify(prodotti)

@app.route('/api/prodotti/categoria/<int:categoria_id>', methods=['GET'])
def get_prodotti_categoria(categoria_id):
    lingua = request.args.get('lang', 'it')  # Default italiano
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query ottimizzata con JOIN per ottenere tutti i dati in una sola query
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, p.categoria_id, p.disponibile, 
               p.foto, p.updated_at, c.nome as categoria_nome, c.parent_id,
               CASE 
                   WHEN c.parent_id IS NOT NULL THEN parent.nome
                   ELSE NULL
               END as categoria_genitore_nome,
               GROUP_CONCAT(DISTINCT a.id || '|' || a.nome || '|' || COALESCE(a.icona, '') || '|' || COALESCE(a.colore, '#6c757d')) as allergeni_data,
               GROUP_CONCAT(DISTINCT i.id || '|' || i.nome) as ingredienti_data
        FROM prodotti p
        LEFT JOIN categorie c ON p.categoria_id = c.id
        LEFT JOIN categorie parent ON c.parent_id = parent.id
        LEFT JOIN prodotti_allergeni pa ON p.id = pa.prodotto_id
        LEFT JOIN allergeni a ON pa.allergene_id = a.id AND a.attivo = 1
        LEFT JOIN prodotti_ingredienti pi ON p.id = pi.prodotto_id
        LEFT JOIN ingredienti i ON pi.ingrediente_id = i.id AND i.attivo = 1
        WHERE p.attivo = 1 AND p.disponibile = 1
        AND (p.categoria_id = ? OR c.parent_id = ?)
        GROUP BY p.id, p.nome, p.descrizione, p.prezzo, p.categoria_id, p.disponibile, 
                 p.foto, p.updated_at, c.nome, c.parent_id, categoria_genitore_nome
        ORDER BY c.nome, p.nome
    ''', (categoria_id, categoria_id))
    
    prodotti = []
    categorie_figlie = set()
    
    for row in cursor.fetchall():
        prodotto_id = row[0]
        nome_originale = row[1]
        descrizione_originale = row[2]
        
        # Traduzioni disabilitate - usa sempre il testo originale
        nome_tradotto = nome_originale
        descrizione_tradotta = descrizione_originale
        
        # Parse allergeni dalla stringa concatenata
        allergeni_list = []
        if row[11]:  # allergeni_data
            for allergene_str in row[11].split(','):
                parts = allergene_str.split('|')
                if len(parts) >= 4:
                    allergene_id, nome_allergene, icona, colore = parts[0], parts[1], parts[2], parts[3]
                    
                    # Traduzioni disabilitate - usa sempre il nome originale
                    # nome_allergene rimane invariato
                    
                    allergeni_list.append({
                        'nome': nome_allergene,
                        'icona': icona or '',
                        'colore': colore or '#6c757d'
                    })
        
        # Parse ingredienti dalla stringa concatenata
        ingredienti_list = []
        if row[12]:  # ingredienti_data
            for ingrediente_str in row[12].split(','):
                parts = ingrediente_str.split('|')
                if len(parts) >= 2:
                    ingrediente_id, nome_ingrediente = parts[0], parts[1]
                    
                    # Traduzioni disabilitate - usa sempre il nome originale
                    # nome_ingrediente rimane invariato
                    
                    ingredienti_list.append(nome_ingrediente)
        
        prodotti.append({
            'id': prodotto_id,
            'nome': nome_tradotto,
            'descrizione': descrizione_tradotta,
            'prezzo': row[3],
            'categoria_id': row[4],
            'disponibile': bool(row[5]),
            'foto': row[6],
            'ultimo_aggiornamento': row[7],
            'categoria_nome': row[8],
            'categoria_genitore_nome': row[10],
            'allergeni': allergeni_list,
            'ingredienti': ingredienti_list
        })
        
        # Se il prodotto appartiene a una categoria figlia, aggiungi la categoria alla lista
        if row[9] == categoria_id:  # parent_id == categoria_id
            categorie_figlie.add(row[8])  # categoria_nome
    
    # Ottieni informazioni sulla categoria genitore con traduzione
    cursor.execute('SELECT nome, descrizione FROM categorie WHERE id = ?', (categoria_id,))
    categoria_info = cursor.fetchone()
    
    # Traduzioni disabilitate - usa sempre il testo originale
    categoria_nome = categoria_info[0] if categoria_info else ''
    categoria_descrizione = categoria_info[1] if categoria_info else ''
    
    conn.close()
    
    return jsonify({
        'categoria': {
            'id': categoria_id,
            'nome': categoria_nome,
            'descrizione': categoria_descrizione
        },
        'categorie_figlie': list(categorie_figlie),
        'prodotti': prodotti,
        'totale_prodotti': len(prodotti)
    })

# API per ottenere categorie con conteggio prodotti (ottimizzata)
@app.route('/api/categorie-menu', methods=['GET'])
def get_categorie_menu():
    lingua = request.args.get('lang', 'it')  # Default italiano
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query ottimizzata con JOIN per eliminare il problema N+1
    cursor.execute('''
        SELECT c.id, c.nome, c.descrizione, 
               COALESCE(COUNT(DISTINCT p.id), 0) as prodotti_count
        FROM categorie c
        LEFT JOIN categorie c_figlio ON c_figlio.parent_id = c.id
        LEFT JOIN prodotti p ON (p.categoria_id = c.id OR p.categoria_id = c_figlio.id)
                               AND p.disponibile = 1 AND p.attivo = 1
        WHERE c.parent_id IS NULL 
        AND c.attiva = 1
        GROUP BY c.id, c.nome, c.descrizione
        HAVING prodotti_count > 0
        ORDER BY c.nome
    ''')
    
    categorie = []
    for row in cursor.fetchall():
        categoria_id = row[0]
        nome_originale = row[1]
        descrizione_originale = row[2]
        prodotti_count = row[3]
        
        # Traduzioni disabilitate - usa sempre il testo originale
        nome_tradotto = nome_originale
        descrizione_tradotta = descrizione_originale
        
        categorie.append({
            'id': categoria_id,
            'nome': nome_tradotto,
            'descrizione': descrizione_tradotta,
            'prodotti_count': prodotti_count
        })
    
    conn.close()
    return jsonify(categorie)

# Route per il logout
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Eventi SocketIO per aggiornamenti in tempo reale
@socketio.on('connect')
def handle_connect():
    print('Client connesso')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnesso')

# API per ottenere il timestamp dell'ultimo aggiornamento
@app.route('/api/menu/last-update')
def get_last_update():
    global ultimo_aggiornamento
    return jsonify({'timestamp': ultimo_aggiornamento})

if __name__ == '__main__':
    init_db()
    # Configurazione per produzione senza debug
    socketio.run(app, debug=False, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)