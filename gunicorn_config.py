# Configurazione Gunicorn per l'applicazione Flask
import os
from dotenv import load_dotenv

# Carica le variabili d'ambiente
load_dotenv()

# Configurazione del server
bind = "0.0.0.0:5001"
workers = 4  # Numero di processi worker (consigliato: 2 * CPU cores + 1)
worker_class = "eventlet"  # Necessario per Flask-SocketIO
worker_connections = 1000

# Configurazione SSL (se abilitato)
ssl_enabled = os.environ.get('SSL_ENABLED', 'False').lower() == 'true'
if ssl_enabled:
    certfile = "cert.pem"
    keyfile = "key.pem"

# Configurazione logging
accesslog = "-"  # Log su stdout
errorlog = "-"   # Log errori su stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Configurazione processo
daemon = False  # Non eseguire come daemon per sviluppo
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# Configurazione performance
max_requests = 1000  # Riavvia worker dopo N richieste (previene memory leak)
max_requests_jitter = 100  # Aggiunge randomness al riavvio
preload_app = True  # Carica l'app prima di fare fork dei worker
timeout = 30  # Timeout richieste in secondi
keepalive = 2  # Keep-alive connections

# Configurazione sicurezza
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Hook per il reload automatico in sviluppo
reload = os.environ.get('FLASK_ENV') == 'development'
reload_extra_files = ['app.py', '.env']

print(f"Gunicorn configurato con {workers} workers")
print(f"SSL abilitato: {ssl_enabled}")
print(f"Bind address: {bind}")