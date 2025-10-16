# Configurazione Gunicorn per Applicazione Ristorante

## Panoramica
Questa applicazione è ora configurata per funzionare con **Gunicorn**, un server WSGI di produzione per applicazioni Python. Gunicorn offre prestazioni superiori, stabilità e sicurezza rispetto al server di sviluppo Flask.

## File di Configurazione

### `gunicorn_config.py`
File di configurazione principale per Gunicorn con le seguenti impostazioni:

- **Bind**: `0.0.0.0:5001` - Server accessibile su tutte le interfacce di rete
- **Workers**: 4 processi worker per gestire le richieste
- **Worker Class**: `eventlet` - Ottimizzato per Flask-SocketIO
- **Timeout**: 120 secondi per richieste lunghe
- **Logging**: Output su stdout/stderr con livello INFO
- **Security**: Configurazioni di sicurezza per produzione

### `start_production.sh`
Script di avvio semplificato che:
- Verifica l'ambiente virtuale
- Controlla le dipendenze
- Carica le variabili d'ambiente
- Inizializza il database
- Avvia Gunicorn con la configurazione ottimizzata

## Comandi di Avvio

### Modalità Sviluppo (Flask)
```bash
python app.py
```
- Server di sviluppo Flask
- Porta 5000 (HTTP) o 5443 (HTTPS)
- Auto-reload attivo
- Debug abilitato

### Modalità Produzione (Gunicorn)
```bash
# Metodo 1: Script automatico
./start_production.sh

# Metodo 2: Comando diretto
gunicorn -c gunicorn_config.py app:app

# Metodo 3: Con parametri personalizzati
gunicorn --bind 0.0.0.0:5001 --workers 4 --worker-class eventlet app:app
```

## Vantaggi di Gunicorn

### Prestazioni
- **Multi-processo**: 4 worker gestiscono richieste simultanee
- **Eventlet**: Worker class ottimizzata per WebSocket/SocketIO
- **Load Balancing**: Distribuzione automatica del carico

### Stabilità
- **Crash Recovery**: Riavvio automatico dei worker in caso di errore
- **Memory Management**: Gestione ottimizzata della memoria
- **Graceful Shutdown**: Chiusura pulita del server

### Sicurezza
- **Process Isolation**: Isolamento tra i processi worker
- **Resource Limits**: Controllo dell'uso delle risorse
- **Production Ready**: Configurazioni sicure per produzione

## Monitoraggio

### Log di Sistema
I log di Gunicorn mostrano:
- Avvio/arresto del server
- Stato dei worker
- Richieste HTTP con codici di stato
- Errori e warning

### Metriche Disponibili
- Numero di worker attivi
- Richieste per secondo
- Tempo di risposta medio
- Utilizzo memoria per worker

## Deployment su VPS

### Architettura Consigliata
```
Internet → Nginx → Gunicorn → Flask App
```

### Configurazione Systemd
Per avvio automatico su VPS:
```ini
[Unit]
Description=Gunicorn instance to serve Restaurant App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/app
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn -c gunicorn_config.py app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Troubleshooting

### Problemi Comuni
1. **Porta già in uso**: Cambiare porta in `gunicorn_config.py`
2. **Worker crash**: Controllare log per errori Python
3. **SocketIO issues**: Verificare worker class `eventlet`
4. **Performance**: Aumentare numero di worker se necessario

### Comandi Utili
```bash
# Verifica processi Gunicorn
ps aux | grep gunicorn

# Monitoraggio in tempo reale
tail -f gunicorn.log

# Test di carico
ab -n 1000 -c 10 http://localhost:5001/

# Verifica porte aperte
netstat -tlnp | grep :5001
```

## Note per Produzione

1. **SSL/HTTPS**: Configurare tramite Nginx, non Gunicorn
2. **Static Files**: Servire tramite Nginx per prestazioni ottimali
3. **Database**: Usare PostgreSQL o MySQL invece di SQLite
4. **Backup**: Implementare backup automatici del database
5. **Monitoring**: Configurare Prometheus/Grafana per metriche avanzate

## Supporto
Per problemi o domande sulla configurazione Gunicorn, consultare:
- [Documentazione Gunicorn](https://docs.gunicorn.org/)
- [Flask-SocketIO con Gunicorn](https://flask-socketio.readthedocs.io/en/latest/deployment.html)