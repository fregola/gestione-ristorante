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

# Funzione per tradurre automaticamente il testo
def traduci_testo(testo, lingua_destinazione='en'):
    """
    Traduce il testo dall'italiano alla lingua specificata usando Google Translate API
    """
    if not testo or lingua_destinazione == 'it':
        return testo
    
    try:
        # URL dell'API di Google Translate (versione gratuita)
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'it',  # lingua sorgente: italiano
            'tl': lingua_destinazione,  # lingua destinazione
            'dt': 't',
            'q': testo
        }
        
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            result = response.json()
            if result and len(result) > 0 and len(result[0]) > 0:
                return result[0][0][0]
    except Exception as e:
        print(f"Errore nella traduzione: {e}")
    
    return testo  # Ritorna il testo originale in caso di errore

# Funzione per salvare le traduzioni di un elemento
def salva_traduzioni(tabella, elemento_id, nome_it, descrizione_it=None, categoria_ingrediente_it=None):
    """
    Salva automaticamente le traduzioni per un elemento
    """
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    try:
        # Traduzione in inglese
        nome_en = traduci_testo(nome_it, 'en')
        descrizione_en = traduci_testo(descrizione_it, 'en') if descrizione_it else None
        categoria_ingrediente_en = traduci_testo(categoria_ingrediente_it, 'en') if categoria_ingrediente_it else None
        
        # Inserisci traduzione italiana
        if tabella == 'ingredienti_traduzioni':
            cursor.execute('''
                INSERT OR REPLACE INTO ingredienti_traduzioni 
                (ingrediente_id, lingua, nome, descrizione, categoria_ingrediente, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (elemento_id, 'it', nome_it, descrizione_it, categoria_ingrediente_it, datetime.now()))
            
            cursor.execute('''
                INSERT OR REPLACE INTO ingredienti_traduzioni 
                (ingrediente_id, lingua, nome, descrizione, categoria_ingrediente, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (elemento_id, 'en', nome_en, descrizione_en, categoria_ingrediente_en, datetime.now()))
        else:
            # Per prodotti, categorie e allergeni
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                ({"prodotto_id" if "prodotti" in tabella else "categoria_id" if "categorie" in tabella else "allergene_id"}, lingua, nome, descrizione, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (elemento_id, 'it', nome_it, descrizione_it, datetime.now()))
            
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                ({"prodotto_id" if "prodotti" in tabella else "categoria_id" if "categorie" in tabella else "allergene_id"}, lingua, nome, descrizione, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (elemento_id, 'en', nome_en, descrizione_en, datetime.now()))
        
        conn.commit()
        print(f"Traduzioni salvate per {tabella} ID {elemento_id}")
        
    except Exception as e:
        print(f"Errore nel salvare le traduzioni: {e}")
        conn.rollback()
    finally:
        conn.close()

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
            colore TEXT DEFAULT '#ff6b6b',
            codice TEXT,
            livello_rischio TEXT DEFAULT 'medio',
            attivo BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabella ingredienti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ingredienti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descrizione TEXT,
            categoria_ingrediente TEXT,
            attivo BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    
    # Tabelle di traduzione
    # Tabella traduzioni prodotti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prodotti_traduzioni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prodotto_id INTEGER NOT NULL,
            lingua TEXT NOT NULL,
            nome TEXT NOT NULL,
            descrizione TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prodotto_id) REFERENCES prodotti (id) ON DELETE CASCADE,
            UNIQUE(prodotto_id, lingua)
        )
    ''')
    
    # Tabella traduzioni categorie
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categorie_traduzioni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            lingua TEXT NOT NULL,
            nome TEXT NOT NULL,
            descrizione TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorie (id) ON DELETE CASCADE,
            UNIQUE(categoria_id, lingua)
        )
    ''')
    
    # Tabella traduzioni ingredienti
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ingredienti_traduzioni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingrediente_id INTEGER NOT NULL,
            lingua TEXT NOT NULL,
            nome TEXT NOT NULL,
            descrizione TEXT,
            categoria_ingrediente TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ingrediente_id) REFERENCES ingredienti (id) ON DELETE CASCADE,
            UNIQUE(ingrediente_id, lingua)
        )
    ''')
    
    # Tabella traduzioni allergeni
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS allergeni_traduzioni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            allergene_id INTEGER NOT NULL,
            lingua TEXT NOT NULL,
            nome TEXT NOT NULL,
            descrizione TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (allergene_id) REFERENCES allergeni (id) ON DELETE CASCADE,
            UNIQUE(allergene_id, lingua)
        )
    ''')

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
            ('Glutine', 'Contiene glutine', '🌾', '#f39c12'),
            ('Lattosio', 'Contiene lattosio', '🥛', '#3498db'),
            ('Uova', 'Contiene uova', '🥚', '#f1c40f'),
            ('Pesce', 'Contiene pesce', '🐟', '#2980b9'),
            ('Crostacei', 'Contiene crostacei', '🦐', '#e74c3c'),
            ('Frutta a guscio', 'Contiene frutta a guscio', '🥜', '#8b4513'),
            ('Soia', 'Contiene soia', '🫘', '#27ae60'),
            ('Sedano', 'Contiene sedano', '🥬', '#2ecc71')
        ]
        cursor.executemany('INSERT INTO allergeni (nome, descrizione, icona, colore) VALUES (?, ?, ?, ?)', 
                          allergeni_esempio)
    
    # Inserisci ingredienti di esempio se la tabella è vuota
    cursor.execute('SELECT COUNT(*) FROM ingredienti')
    if cursor.fetchone()[0] == 0:
        ingredienti_esempio = [
            ('Pomodoro', 'Pomodoro fresco', 'Verdure'),
            ('Mozzarella', 'Mozzarella di bufala', 'Latticini'),
            ('Basilico', 'Basilico fresco', 'Erbe aromatiche'),
            ('Olio extravergine', 'Olio extravergine di oliva', 'Condimenti'),
            ('Pancetta', 'Pancetta affumicata', 'Carne'),
            ('Pecorino', 'Pecorino romano', 'Formaggi'),
            ('Uova', 'Uova fresche', 'Proteine'),
            ('Spaghetti', 'Pasta di grano duro', 'Pasta'),
            ('Mascarpone', 'Mascarpone cremoso', 'Latticini'),
            ('Caffè', 'Caffè espresso', 'Bevande')
        ]
        cursor.executemany('INSERT INTO ingredienti (nome, descrizione, categoria_ingrediente) VALUES (?, ?, ?)', 
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

# Route per gestire i prodotti (con autenticazione)
@app.route('/gestione-prodotti')
@login_required
def gestione_prodotti():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query per ottenere prodotti con categoria gerarchica, allergeni e ingredienti
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, 
               CASE 
                   WHEN parent.nome IS NOT NULL THEN parent.nome || ' > ' || c.nome
                   ELSE c.nome
               END as categoria_nome,
               p.categoria_id, p.foto, p.disponibile,
               GROUP_CONCAT(DISTINCT a.nome) as allergeni,
               GROUP_CONCAT(DISTINCT i.nome) as ingredienti,
               GROUP_CONCAT(DISTINCT a.id) as allergeni_ids,
               GROUP_CONCAT(DISTINCT i.id) as ingredienti_ids
        FROM prodotti p 
        LEFT JOIN categorie c ON p.categoria_id = c.id 
        LEFT JOIN categorie parent ON c.parent_id = parent.id
        LEFT JOIN prodotti_allergeni pa ON p.id = pa.prodotto_id
        LEFT JOIN allergeni a ON pa.allergene_id = a.id AND a.attivo = 1
        LEFT JOIN prodotti_ingredienti pi ON p.id = pi.prodotto_id
        LEFT JOIN ingredienti i ON pi.ingrediente_id = i.id AND i.attivo = 1
        GROUP BY p.id, p.nome, p.descrizione, p.prezzo, categoria_nome, p.categoria_id, p.foto, p.disponibile
        ORDER BY p.nome
    ''')
    prodotti_list = cursor.fetchall()
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
    
    # Salva le traduzioni automaticamente per il nuovo prodotto
    try:
        salva_traduzioni('prodotti_traduzioni', prodotto_id, nome, descrizione)
    except Exception as e:
        print(f"Errore nel salvare le traduzioni del prodotto: {e}")
    
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
    
    # Aggiorna il prodotto
    cursor.execute('''
        UPDATE prodotti 
        SET nome = ?, descrizione = ?, prezzo = ?, categoria_id = ?, foto = ?, disponibile = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (nome, descrizione, prezzo, categoria_id, foto_path, disponibile, prodotto_id))
    
    # Rimuovi associazioni esistenti
    cursor.execute('DELETE FROM prodotti_allergeni WHERE prodotto_id = ?', (prodotto_id,))
    cursor.execute('DELETE FROM prodotti_ingredienti WHERE prodotto_id = ?', (prodotto_id,))
    
    # Inserisci nuove associazioni con allergeni
    for allergene_id in allergeni_ids:
        cursor.execute('''
            INSERT INTO prodotti_allergeni (prodotto_id, allergene_id) 
            VALUES (?, ?)
        ''', (prodotto_id, allergene_id))
    
    # Inserisci nuove associazioni con ingredienti
    for ingrediente_id in ingredienti_ids:
        cursor.execute('''
            INSERT INTO prodotti_ingredienti (prodotto_id, ingrediente_id) 
            VALUES (?, ?)
        ''', (prodotto_id, ingrediente_id))

    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per il prodotto aggiornato
    try:
        salva_traduzioni('prodotti_traduzioni', prodotto_id, nome, descrizione)
    except Exception as e:
        print(f"Errore nel salvare le traduzioni del prodotto: {e}")
    
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
        SELECT c.id, c.nome, c.parent_id, c.descrizione, c.ordine, c.attiva,
               p.nome as parent_nome
        FROM categorie c
        LEFT JOIN categorie p ON c.parent_id = p.id
        WHERE c.attiva = 1
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
            'attiva': cat[5],
            'parent_nome': cat[6]
        })
    
    return {'categorie': categorie_list}

@app.route('/api/prodotto/<int:id>')
def api_prodotto(id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, p.categoria_id, c.nome as categoria_nome, 
               p.foto, p.disponibile,
               GROUP_CONCAT(DISTINCT a.nome) as allergeni,
               GROUP_CONCAT(DISTINCT i.nome) as ingredienti
        FROM prodotti p
        LEFT JOIN categorie c ON p.categoria_id = c.id
        LEFT JOIN prodotti_allergeni pa ON p.id = pa.prodotto_id
        LEFT JOIN allergeni a ON pa.allergene_id = a.id
        LEFT JOIN prodotti_ingredienti pi ON p.id = pi.prodotto_id
        LEFT JOIN ingredienti i ON pi.ingrediente_id = i.id
        WHERE p.id = ?
        GROUP BY p.id
    ''', (id,))
    prodotto = cursor.fetchone()
    
    if prodotto is None:
        conn.close()
        return jsonify({"error": "Prodotto non trovato"}), 404
    
    result = {
        'id': prodotto[0],
        'nome': prodotto[1],
        'descrizione': prodotto[2],
        'prezzo': prodotto[3],
        'categoria_id': prodotto[4],
        'categoria_nome': prodotto[5],
        'foto': prodotto[6],
        'disponibile': bool(prodotto[7]),
        'allergeni': prodotto[8].split(',') if prodotto[8] else [],
        'ingredienti': prodotto[9].split(',') if prodotto[9] else []
    }
    conn.close()
    return jsonify(result)

@app.route('/api/categorie', methods=['POST'])
@login_required
def aggiungi_categoria():
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO categorie (nome, parent_id, descrizione, ordine) 
        VALUES (?, ?, ?, ?)
    ''', (data['nome'], data.get('parent_id'), data.get('descrizione', ''), data.get('ordine', 0)))
    
    categoria_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per la nuova categoria
    try:
        salva_traduzioni('categorie_traduzioni', categoria_id, data['nome'], data.get('descrizione', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni della categoria: {e}")
    
    return {'success': True, 'id': categoria_id}

@app.route('/api/categorie/<int:categoria_id>', methods=['PUT'])
@login_required
def aggiorna_categoria(categoria_id):
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE categorie 
        SET nome = ?, parent_id = ?, descrizione = ?, ordine = ?
        WHERE id = ?
    ''', (data['nome'], data.get('parent_id'), data.get('descrizione', ''), data.get('ordine', 0), categoria_id))
    
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per la categoria aggiornata
    try:
        salva_traduzioni('categorie_traduzioni', categoria_id, data['nome'], data.get('descrizione', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni della categoria: {e}")
    
    return {'success': True}

@app.route('/api/categorie/<int:categoria_id>', methods=['DELETE'])
@login_required
def elimina_categoria(categoria_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE categorie SET attiva = 0 WHERE id = ?', (categoria_id,))
    conn.commit()
    conn.close()
    
    return {'success': True}

# API per gestire gli allergeni
@app.route('/api/allergeni', methods=['GET'])
@login_required
def get_allergeni():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM allergeni WHERE attivo = 1 ORDER BY nome')
    allergeni = cursor.fetchall()
    conn.close()
    
    allergeni_list = []
    for all in allergeni:
        allergeni_list.append({
            'id': all[0],
            'nome': all[1],
            'descrizione': all[2],
            'icona': all[3],
            'colore': all[4],
            'attivo': all[5]
        })
    
    return {'allergeni': allergeni_list}

@app.route('/api/allergeni', methods=['POST'])
@login_required
def aggiungi_allergene():
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO allergeni (nome, descrizione, icona, colore) 
        VALUES (?, ?, ?, ?)
    ''', (data['nome'], data.get('descrizione', ''), data.get('icona', ''), data.get('colore', '#ff6b6b')))
    
    allergene_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per il nuovo allergene
    try:
        salva_traduzioni('allergeni_traduzioni', allergene_id, data['nome'], data.get('descrizione', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni dell'allergene: {e}")
    
    return {'success': True, 'id': allergene_id}

@app.route('/api/allergeni/<int:allergene_id>', methods=['PUT'])
@login_required
def aggiorna_allergene(allergene_id):
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE allergeni 
        SET nome = ?, descrizione = ?, icona = ?, colore = ?
        WHERE id = ?
    ''', (data['nome'], data.get('descrizione', ''), data.get('icona', ''), data.get('colore', '#ff6b6b'), allergene_id))
    
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per l'allergene aggiornato
    try:
        salva_traduzioni('allergeni_traduzioni', allergene_id, data['nome'], data.get('descrizione', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni dell'allergene: {e}")
    
    return {'success': True}

@app.route('/api/allergeni/<int:allergene_id>', methods=['DELETE'])
@login_required
def elimina_allergene(allergene_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE allergeni SET attivo = 0 WHERE id = ?', (allergene_id,))
    conn.commit()
    conn.close()
    
    return {'success': True}

# API per gestire gli ingredienti
@app.route('/api/ingredienti', methods=['GET'])
@login_required
def get_ingredienti():
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM ingredienti WHERE attivo = 1 ORDER BY nome')
    ingredienti = cursor.fetchall()
    conn.close()
    
    ingredienti_list = []
    for ing in ingredienti:
        ingredienti_list.append({
            'id': ing[0],
            'nome': ing[1],
            'descrizione': ing[2],
            'categoria_ingrediente': ing[3],
            'attivo': ing[4]
        })
    
    return {'ingredienti': ingredienti_list}

@app.route('/api/ingredienti', methods=['POST'])
@login_required
def aggiungi_ingrediente():
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO ingredienti (nome, descrizione, categoria_ingrediente) 
        VALUES (?, ?, ?)
    ''', (data['nome'], data.get('descrizione', ''), data.get('categoria_ingrediente', '')))
    
    ingrediente_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per il nuovo ingrediente
    try:
        salva_traduzioni('ingredienti_traduzioni', ingrediente_id, data['nome'], 
                        data.get('descrizione', ''), data.get('categoria_ingrediente', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni dell'ingrediente: {e}")
    
    return {'success': True, 'id': ingrediente_id}

@app.route('/api/ingredienti/<int:ingrediente_id>', methods=['PUT'])
@login_required
def aggiorna_ingrediente(ingrediente_id):
    data = request.get_json()
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE ingredienti 
        SET nome = ?, descrizione = ?, categoria_ingrediente = ?
        WHERE id = ?
    ''', (data['nome'], data.get('descrizione', ''), data.get('categoria_ingrediente', ''), ingrediente_id))
    
    conn.commit()
    conn.close()
    
    # Salva le traduzioni automaticamente per l'ingrediente aggiornato
    try:
        salva_traduzioni('ingredienti_traduzioni', ingrediente_id, data['nome'], 
                        data.get('descrizione', ''), data.get('categoria_ingrediente', ''))
    except Exception as e:
        print(f"Errore nel salvare le traduzioni dell'ingrediente: {e}")
    
    return {'success': True}

@app.route('/api/ingredienti/<int:ingrediente_id>', methods=['DELETE'])
@login_required
def elimina_ingrediente(ingrediente_id):
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE ingredienti SET attivo = 0 WHERE id = ?', (ingrediente_id,))
    conn.commit()
    conn.close()
    
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
        WHERE p.attivo = 1 AND c.attiva = 1
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
    
    # Query per ottenere tutti i prodotti di una categoria genitore con allergeni e ingredienti
    # Include sia i prodotti diretti che quelli delle categorie figlie
    cursor.execute('''
        SELECT p.id, p.nome, p.descrizione, p.prezzo, p.categoria_id, p.disponibile, 
               p.foto, p.updated_at, c.nome as categoria_nome, c.parent_id,
               CASE 
                   WHEN c.parent_id IS NOT NULL THEN parent.nome
                   ELSE NULL
               END as categoria_genitore_nome,
               GROUP_CONCAT(DISTINCT a.nome) as allergeni,
               GROUP_CONCAT(DISTINCT i.nome) as ingredienti,
               GROUP_CONCAT(DISTINCT a.icona) as allergeni_icone,
               GROUP_CONCAT(DISTINCT a.colore) as allergeni_colori,
               GROUP_CONCAT(DISTINCT a.id) as allergeni_ids,
               GROUP_CONCAT(DISTINCT i.id) as ingredienti_ids
        FROM prodotti p
        LEFT JOIN categorie c ON p.categoria_id = c.id
        LEFT JOIN categorie parent ON c.parent_id = parent.id
        LEFT JOIN prodotti_allergeni pa ON p.id = pa.prodotto_id
        LEFT JOIN allergeni a ON pa.allergene_id = a.id AND a.attivo = 1
        LEFT JOIN prodotti_ingredienti pi ON p.id = pi.prodotto_id
        LEFT JOIN ingredienti i ON pi.ingrediente_id = i.id AND i.attivo = 1
        WHERE p.attivo = 1 AND c.attiva = 1 AND p.disponibile = 1
        AND (
            -- Prodotti diretti della categoria genitore
            p.categoria_id = ?
            OR 
            -- Prodotti delle categorie figlie
            c.parent_id = ?
        )
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
        
        # Traduci il prodotto se necessario
        if lingua != 'it':
            cursor.execute('''
                SELECT nome, descrizione 
                FROM prodotti_traduzioni 
                WHERE prodotto_id = ? AND lingua = ?
            ''', (prodotto_id, lingua))
            
            traduzione_prodotto = cursor.fetchone()
            if traduzione_prodotto:
                nome_tradotto = traduzione_prodotto[0] or nome_originale
                descrizione_tradotta = traduzione_prodotto[1] or descrizione_originale
            else:
                nome_tradotto = nome_originale
                descrizione_tradotta = descrizione_originale
        else:
            nome_tradotto = nome_originale
            descrizione_tradotta = descrizione_originale
        
        # Processa allergeni con traduzioni
        allergeni_list = []
        if row[11]:  # allergeni
            allergeni_nomi = row[11].split(',')
            allergeni_icone = row[13].split(',') if row[13] else []
            allergeni_colori = row[14].split(',') if row[14] else []
            allergeni_ids = row[15].split(',') if row[15] else []
            
            for i, nome in enumerate(allergeni_nomi):
                allergene_id = allergeni_ids[i] if i < len(allergeni_ids) else None
                nome_allergene = nome
                
                # Traduci l'allergene se necessario
                if lingua != 'it' and allergene_id:
                    cursor.execute('''
                        SELECT nome 
                        FROM allergeni_traduzioni 
                        WHERE allergene_id = ? AND lingua = ?
                    ''', (allergene_id, lingua))
                    
                    traduzione_allergene = cursor.fetchone()
                    if traduzione_allergene and traduzione_allergene[0]:
                        nome_allergene = traduzione_allergene[0]
                
                allergeni_list.append({
                    'nome': nome_allergene,
                    'icona': allergeni_icone[i] if i < len(allergeni_icone) else '',
                    'colore': allergeni_colori[i] if i < len(allergeni_colori) else '#6c757d'
                })
        
        # Processa ingredienti con traduzioni
        ingredienti_list = []
        if row[12]:  # ingredienti
            ingredienti_nomi = row[12].split(',')
            ingredienti_ids = row[16].split(',') if row[16] else []
            
            for i, nome in enumerate(ingredienti_nomi):
                ingrediente_id = ingredienti_ids[i] if i < len(ingredienti_ids) else None
                nome_ingrediente = nome
                
                # Traduci l'ingrediente se necessario
                if lingua != 'it' and ingrediente_id:
                    cursor.execute('''
                        SELECT nome 
                        FROM ingredienti_traduzioni 
                        WHERE ingrediente_id = ? AND lingua = ?
                    ''', (ingrediente_id, lingua))
                    
                    traduzione_ingrediente = cursor.fetchone()
                    if traduzione_ingrediente and traduzione_ingrediente[0]:
                        nome_ingrediente = traduzione_ingrediente[0]
                
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
    
    categoria_nome = categoria_info[0] if categoria_info else ''
    categoria_descrizione = categoria_info[1] if categoria_info else ''
    
    # Traduci la categoria genitore se necessario
    if lingua != 'it' and categoria_info:
        cursor.execute('''
            SELECT nome, descrizione 
            FROM categorie_traduzioni 
            WHERE categoria_id = ? AND lingua = ?
        ''', (categoria_id, lingua))
        
        traduzione_categoria = cursor.fetchone()
        if traduzione_categoria:
            categoria_nome = traduzione_categoria[0] or categoria_nome
            categoria_descrizione = traduzione_categoria[1] or categoria_descrizione
    
    conn.close()
    
    return jsonify({
        'categoria_genitore': {
            'id': categoria_id,
            'nome': categoria_nome,
            'descrizione': categoria_descrizione
        },
        'categorie_figlie': list(categorie_figlie),
        'prodotti': prodotti,
        'totale_prodotti': len(prodotti)
    })

# API per ottenere categorie con conteggio prodotti
@app.route('/api/categorie-menu', methods=['GET'])
def get_categorie_menu():
    lingua = request.args.get('lang', 'it')  # Default italiano
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    # Query per ottenere solo le categorie genitore (parent_id IS NULL) 
    # che hanno prodotti direttamente o nelle loro categorie figlie
    cursor.execute('''
        WITH categorie_con_prodotti AS (
            -- Categorie che hanno prodotti direttamente
            SELECT DISTINCT c.id, c.nome, c.descrizione, c.parent_id
            FROM categorie c
            INNER JOIN prodotti p ON c.id = p.categoria_id 
            WHERE p.disponibile = 1 AND c.attiva = 1
            
            UNION
            
            -- Categorie genitore che hanno categorie figlie con prodotti
            SELECT DISTINCT parent.id, parent.nome, parent.descrizione, parent.parent_id
            FROM categorie parent
            INNER JOIN categorie figlio ON parent.id = figlio.parent_id
            INNER JOIN prodotti p ON figlio.id = p.categoria_id
            WHERE p.disponibile = 1 AND parent.attiva = 1 AND figlio.attiva = 1
        )
        SELECT 
            cp.id, 
            cp.nome, 
            cp.descrizione,
            (
                -- Conta prodotti diretti della categoria genitore
                SELECT COUNT(p1.id) 
                FROM prodotti p1 
                WHERE p1.categoria_id = cp.id AND p1.disponibile = 1
            ) + (
                -- Conta prodotti nelle categorie figlie
                SELECT COUNT(p2.id)
                FROM categorie figlio
                INNER JOIN prodotti p2 ON figlio.id = p2.categoria_id
                WHERE figlio.parent_id = cp.id AND p2.disponibile = 1 AND figlio.attiva = 1
            ) as prodotti_count
        FROM categorie_con_prodotti cp
        WHERE cp.parent_id IS NULL  -- Solo categorie genitore
        ORDER BY cp.nome
    ''')
    
    categorie = []
    for row in cursor.fetchall():
        categoria_id = row[0]
        nome_originale = row[1]
        descrizione_originale = row[2]
        
        # Se la lingua richiesta è diversa dall'italiano, cerca la traduzione
        if lingua != 'it':
            cursor.execute('''
                SELECT nome, descrizione 
                FROM categorie_traduzioni 
                WHERE categoria_id = ? AND lingua = ?
            ''', (categoria_id, lingua))
            
            traduzione = cursor.fetchone()
            if traduzione:
                nome_tradotto = traduzione[0] or nome_originale
                descrizione_tradotta = traduzione[1] or descrizione_originale
            else:
                nome_tradotto = nome_originale
                descrizione_tradotta = descrizione_originale
        else:
            nome_tradotto = nome_originale
            descrizione_tradotta = descrizione_originale
        
        categorie.append({
            'id': categoria_id,
            'nome': nome_tradotto,
            'descrizione': descrizione_tradotta,
            'prodotti_count': row[3]
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
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)