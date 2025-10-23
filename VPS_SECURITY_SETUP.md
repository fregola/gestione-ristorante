# Configurazione Sicura SECRET_KEY per VPS

## 1. Configurazione Iniziale sulla VPS

### Trasferimento della SECRET_KEY
```bash
# Connessione alla VPS
ssh your-user@your-vps-ip

# Navigazione alla directory del progetto
cd /path/to/gestione-ristorante

# Creazione del file .env (se non esiste)
touch .env

# Impostazione permessi sicuri
chmod 600 .env
```

### Configurazione del file .env sulla VPS
```bash
# Modifica del file .env
nano .env

# Aggiungere la stessa SECRET_KEY utilizzata in locale:
SECRET_KEY=your-generated-secret-key-here
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

### Verifica della sicurezza
```bash
# Controllo permessi
ls -la .env
# Output atteso: -rw------- 1 user user size date .env

# Controllo proprietario
stat .env
```

## 2. Configurazione del Servizio Systemd

### Creazione del file di servizio
```bash
sudo nano /etc/systemd/system/gestione-ristorante.service
```

### Contenuto del file di servizio
```ini
[Unit]
Description=Gestione Ristorante Flask App
After=network.target

[Service]
Type=simple
User=your-service-user
WorkingDirectory=/path/to/gestione-ristorante
Environment=PATH=/path/to/gestione-ristorante/venv/bin
EnvironmentFile=/path/to/gestione-ristorante/.env
ExecStart=/path/to/gestione-ristorante/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 3. Sistema di Rotazione delle Chiavi

### Script di rotazione automatica
```bash
#!/bin/bash
# File: rotate_secret_key.sh

# Configurazione
PROJECT_DIR="/path/to/gestione-ristorante"
BACKUP_DIR="/path/to/backups"
SERVICE_NAME="gestione-ristorante"

# Generazione nuova chiave
NEW_KEY=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'; print(''.join(secrets.choice(chars) for _ in range(64)))")

# Backup della chiave attuale
cp $PROJECT_DIR/.env $BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)

# Aggiornamento della chiave
sed -i "s/^SECRET_KEY=.*/SECRET_KEY=$NEW_KEY/" $PROJECT_DIR/.env

# Riavvio del servizio
sudo systemctl restart $SERVICE_NAME

# Verifica del servizio
sleep 5
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "Rotazione chiave completata con successo"
    # Rimozione backup vecchi (mantieni solo gli ultimi 5)
    ls -t $BACKUP_DIR/.env.backup.* | tail -n +6 | xargs rm -f
else
    echo "Errore nel riavvio del servizio, ripristino backup"
    cp $BACKUP_DIR/.env.backup.$(ls -t $BACKUP_DIR/.env.backup.* | head -n 1) $PROJECT_DIR/.env
    sudo systemctl restart $SERVICE_NAME
fi
```

### Configurazione cron per rotazione automatica
```bash
# Modifica crontab
crontab -e

# Rotazione mensile (primo giorno del mese alle 2:00 AM)
0 2 1 * * /path/to/rotate_secret_key.sh >> /var/log/key-rotation.log 2>&1
```

## 4. Monitoraggio e Sicurezza

### Script di verifica sicurezza
```bash
#!/bin/bash
# File: security_check.sh

PROJECT_DIR="/path/to/gestione-ristorante"

echo "=== Controllo Sicurezza SECRET_KEY ==="

# Verifica permessi file .env
PERMS=$(stat -c "%a" $PROJECT_DIR/.env)
if [ "$PERMS" = "600" ]; then
    echo "✓ Permessi file .env corretti (600)"
else
    echo "✗ Permessi file .env non sicuri: $PERMS"
fi

# Verifica proprietario
OWNER=$(stat -c "%U" $PROJECT_DIR/.env)
if [ "$OWNER" = "your-service-user" ]; then
    echo "✓ Proprietario file .env corretto"
else
    echo "✗ Proprietario file .env: $OWNER"
fi

# Verifica lunghezza chiave
KEY_LENGTH=$(grep "^SECRET_KEY=" $PROJECT_DIR/.env | cut -d'=' -f2 | wc -c)
if [ $KEY_LENGTH -ge 64 ]; then
    echo "✓ Lunghezza SECRET_KEY adeguata ($KEY_LENGTH caratteri)"
else
    echo "✗ SECRET_KEY troppo corta ($KEY_LENGTH caratteri)"
fi

# Verifica che la chiave non sia quella di default
if grep -q "your-super-secret-key-here-change-this" $PROJECT_DIR/.env; then
    echo "✗ SECRET_KEY di default rilevata!"
else
    echo "✓ SECRET_KEY personalizzata"
fi
```

## 5. Procedure di Emergenza

### Ripristino da backup
```bash
# In caso di problemi con la nuova chiave
cp /path/to/backups/.env.backup.YYYYMMDD_HHMMSS /path/to/gestione-ristorante/.env
sudo systemctl restart gestione-ristorante
```

### Generazione manuale nuova chiave
```bash
# Generazione chiave sicura
python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'; print(''.join(secrets.choice(chars) for _ in range(64)))"
```

## 6. Checklist di Sicurezza

- [ ] File .env con permessi 600
- [ ] Proprietario corretto del file .env
- [ ] SECRET_KEY di almeno 64 caratteri
- [ ] File .env incluso nel .gitignore
- [ ] Backup automatici configurati
- [ ] Rotazione automatica configurata
- [ ] Monitoraggio sicurezza attivo
- [ ] Procedure di emergenza testate

## Note Importanti

1. **Mai condividere la SECRET_KEY** in chat, email o sistemi non sicuri
2. **Testare sempre** la rotazione in ambiente di staging prima della produzione
3. **Monitorare i log** dopo ogni rotazione per verificare il corretto funzionamento
4. **Mantenere backup** delle chiavi per almeno 30 giorni
5. **Documentare** ogni cambio di chiave con data e motivo