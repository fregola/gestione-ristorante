# Guida al Deployment su VPS

## Prerequisiti VPS
- Ubuntu 20.04+ o CentOS 8+
- Python 3.8+
- Nginx
- Supervisor (per gestire il processo)
- SSL Certificate (Let's Encrypt consigliato)

## 1. Preparazione del Server

### Aggiornamento sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Installazione dipendenze
```bash
sudo apt install python3 python3-pip python3-venv nginx supervisor git -y
```

## 2. Deploy dell'Applicazione

### Clone del repository
```bash
cd /var/www/
sudo git clone https://github.com/[username]/gestione-ristorante.git
sudo chown -R www-data:www-data gestione-ristorante/
cd gestione-ristorante/
```

### Setup ambiente virtuale
```bash
sudo -u www-data python3 -m venv venv
sudo -u www-data ./venv/bin/pip install -r requirements.txt
```

### Configurazione ambiente
```bash
sudo -u www-data cp .env.example .env
sudo -u www-data nano .env
```

**Modifica le seguenti variabili in .env:**
```
SECRET_KEY=[genera-una-chiave-sicura]
DEBUG=False
PORT=5001
CORS_ORIGINS=https://tuodominio.com
DEFAULT_ADMIN_PASSWORD=[password-sicura]
```

### Inizializzazione database
```bash
sudo -u www-data ./venv/bin/python app.py
# Ctrl+C dopo l'inizializzazione
```

## 3. Configurazione Nginx

Crea `/etc/nginx/sites-available/gestione-ristorante`:
```nginx
server {
    listen 80;
    server_name tuodominio.com www.tuodominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /var/www/gestione-ristorante/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Attiva il sito:
```bash
sudo ln -s /etc/nginx/sites-available/gestione-ristorante /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Configurazione Supervisor

Crea `/etc/supervisor/conf.d/gestione-ristorante.conf`:
```ini
[program:gestione-ristorante]
command=/var/www/gestione-ristorante/venv/bin/python app.py
directory=/var/www/gestione-ristorante
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/gestione-ristorante.log
environment=PYTHONPATH="/var/www/gestione-ristorante"
```

Avvia il servizio:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gestione-ristorante
```

## 5. SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com
```

## 6. Backup Automatico

Crea script di backup `/var/www/gestione-ristorante/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gestione-ristorante"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/gestione-ristorante/ristorante.db $BACKUP_DIR/ristorante_$DATE.db
cp -r /var/www/gestione-ristorante/static/uploads $BACKUP_DIR/uploads_$DATE

# Mantieni solo gli ultimi 7 backup
find $BACKUP_DIR -name "ristorante_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*" -mtime +7 -exec rm -rf {} \;
```

Aggiungi al crontab:
```bash
sudo crontab -e
# Aggiungi: 0 2 * * * /var/www/gestione-ristorante/backup.sh
```

## 7. Monitoraggio

### Log dell'applicazione
```bash
sudo tail -f /var/log/gestione-ristorante.log
```

### Status del servizio
```bash
sudo supervisorctl status gestione-ristorante
```

### Riavvio dell'applicazione
```bash
sudo supervisorctl restart gestione-ristorante
```

## 8. Aggiornamenti

Per aggiornare l'applicazione:
```bash
cd /var/www/gestione-ristorante
sudo -u www-data git pull origin main
sudo -u www-data ./venv/bin/pip install -r requirements.txt
sudo supervisorctl restart gestione-ristorante
```

## Note di Sicurezza

1. **Firewall**: Configura UFW per aprire solo le porte necessarie (80, 443, 22)
2. **Database**: Il database SQLite è ottimizzato con 25 indici personalizzati
3. **Cache**: L'applicazione usa cache intelligente per ridurre il carico del database
4. **Real-time**: Socket.IO è configurato per aggiornamenti in tempo reale
5. **Backup**: Backup automatici giornalieri del database e uploads

## Performance

L'applicazione è ottimizzata per:
- Tempi di risposta < 2ms per le API principali
- Cache intelligente per categorie e prodotti
- Aggiornamenti real-time senza ricaricamento pagina
- Database ottimizzato con indici personalizzati