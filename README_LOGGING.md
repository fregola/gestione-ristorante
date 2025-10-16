# 📋 Sistema di Logging - Applicazione Ristorante

## 🎯 Panoramica
Sistema di logging completo implementato per monitorare, debuggare e analizzare l'applicazione ristorante in tempo reale.

## 📁 File di Configurazione

### `logging_config.py`
Configurazione centralizzata del sistema di logging con:
- **4 tipi di log** specializzati
- **Rotazione automatica** dei file
- **Livelli configurabili**
- **Formattazione strutturata**

## 📊 Tipi di Log

### 1. 📝 **Log Generale** (`logs/app.log`)
- **Scopo**: Attività generali dell'applicazione
- **Rotazione**: 10MB, 5 backup
- **Livello**: INFO e superiori
- **Esempi**:
  ```
  2025-10-16 08:15:23 - Applicazione ristorante avviata
  2025-10-16 08:16:45 - Prodotto aggiunto: Pizza Margherita (ID: 15)
  2025-10-16 08:17:12 - Prodotto eliminato: Pasta Carbonara (ID: 8)
  ```

### 2. ❌ **Log Errori** (`logs/errors.log`)
- **Scopo**: Errori e eccezioni dell'applicazione
- **Rotazione**: 5MB, 3 backup
- **Livello**: ERROR e CRITICAL
- **Esempi**:
  ```
  2025-10-16 08:20:15 - ERROR - Errore eliminazione foto: /static/uploads/pizza.jpg
  2025-10-16 08:21:30 - ERROR - Errore aggiornamento dati azienda da utente admin
  ```

### 3. 🔒 **Log Sicurezza** (`logs/security.log`)
- **Scopo**: Eventi di sicurezza e accessi
- **Rotazione**: 5MB, 5 backup
- **Livello**: WARNING e superiori
- **Esempi**:
  ```
  2025-10-16 08:18:45 - LOGIN_SUCCESS - Utente: admin, IP: 127.0.0.1
  2025-10-16 08:19:12 - LOGIN_FAILED - Utente: test, IP: 192.168.1.100
  2025-10-16 08:20:00 - RATE_LIMIT_EXCEEDED - IP: 192.168.1.50, Endpoint: login
  ```

### 4. 💼 **Log Business** (`logs/business.log`)
- **Scopo**: Operazioni di business e analytics
- **Rotazione**: 10MB, 10 backup
- **Livello**: INFO e superiori
- **Esempi**:
  ```
  2025-10-16 08:22:30 - ADD_PRODUCT - Nome: Tiramisu, Prezzo: €6.50, ID: 20
  2025-10-16 08:23:15 - DELETE_PRODUCT - Nome: Gelato Vaniglia, ID: 12
  2025-10-16 08:24:00 - UPDATE_COMPANY - Logo aggiornato da admin
  ```

## 🔧 Funzioni di Logging

### Funzioni Principali
```python
# Logging generale
logger.info("Messaggio informativo")
logger.warning("Messaggio di avviso")
logger.error("Messaggio di errore")

# Logging specializzato
log_user_action(user_id, action, details)
log_security_event(event_type, details)
log_error(exception, context)
log_performance(operation, duration)
```

### Esempi di Utilizzo
```python
# Login utente
log_security_event("LOGIN_SUCCESS", f"Utente: {username}, IP: {client_ip}")
logger.info(f"Login riuscito per {username} da {client_ip}")

# Aggiunta prodotto
log_user_action(current_user.id, "ADD_PRODUCT", f"Nome: {nome}, Prezzo: €{prezzo}")
logger.info(f"Prodotto aggiunto: {nome} da utente {current_user.username}")

# Gestione errori
try:
    # operazione rischiosa
except Exception as e:
    log_error(e, "Contesto dell'errore")
    logger.error(f"Errore specifico: {str(e)}")
```

## 📈 Eventi Loggati

### 🔐 Sicurezza
- ✅ Login riusciti/falliti
- ✅ Logout utenti
- ✅ Rate limiting superato
- ✅ Tentativi di accesso non autorizzati
- ✅ Sessioni scadute

### 💼 Business Operations
- ✅ Aggiunta/modifica/eliminazione prodotti
- ✅ Gestione categorie
- ✅ Upload file e immagini
- ✅ Aggiornamenti dati azienda
- ✅ Configurazioni sistema

### ⚠️ Errori e Problemi
- ✅ Eccezioni applicazione
- ✅ Errori database
- ✅ Problemi file system
- ✅ Errori di validazione
- ✅ Timeout e connessioni

## 🎛️ Configurazione

### Variabili Ambiente
```bash
# Livello di logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO
```

### Livelli di Logging
- **DEBUG**: Informazioni dettagliate per debugging
- **INFO**: Informazioni generali di funzionamento
- **WARNING**: Situazioni anomale ma gestibili
- **ERROR**: Errori che impediscono operazioni
- **CRITICAL**: Errori critici che bloccano l'applicazione

## 📂 Struttura File Log

```
logs/
├── app.log          # Log generale (10MB, 5 backup)
├── app.log.1        # Backup automatico
├── errors.log       # Solo errori (5MB, 3 backup)
├── security.log     # Eventi sicurezza (5MB, 5 backup)
└── business.log     # Operazioni business (10MB, 10 backup)
```

## 🔍 Monitoraggio e Analisi

### Comandi Utili
```bash
# Visualizza log in tempo reale
tail -f logs/app.log

# Cerca errori specifici
grep "ERROR" logs/errors.log

# Monitora login
grep "LOGIN" logs/security.log

# Analizza operazioni business
grep "ADD_PRODUCT" logs/business.log
```

### Filtri per Analisi
```bash
# Login falliti nelle ultime 24h
grep "LOGIN_FAILED" logs/security.log | grep "$(date +%Y-%m-%d)"

# Errori per utente specifico
grep "admin" logs/errors.log

# Rate limiting per IP
grep "RATE_LIMIT_EXCEEDED" logs/security.log | grep "192.168.1"
```

## 🚀 Integrazione Gunicorn

Il sistema di logging è completamente integrato con Gunicorn:
- **Logs Gunicorn**: Gestiti automaticamente
- **Logs Applicazione**: Tramite `logging_config.py`
- **Rotazione**: Automatica per tutti i file
- **Performance**: Ottimizzata per produzione

## 📊 Vantaggi del Sistema

### 🎯 Per il Ristorante
- **Monitoraggio Ordini**: Traccia tutte le operazioni
- **Sicurezza**: Rileva accessi sospetti
- **Performance**: Identifica colli di bottiglia
- **Manutenzione**: Facilita debugging

### 👨‍💻 Per lo Sviluppatore
- **Debug Rapido**: Log strutturati e dettagliati
- **Analisi Errori**: Tracciamento completo eccezioni
- **Monitoring**: Visibilità completa sistema
- **Ottimizzazione**: Dati per miglioramenti

## 🔧 Manutenzione

### Rotazione Automatica
- I file vengono ruotati automaticamente al raggiungimento della dimensione massima
- I backup vengono mantenuti secondo la configurazione
- Nessun intervento manuale richiesto

### Pulizia Manuale (opzionale)
```bash
# Rimuovi log vecchi (oltre 30 giorni)
find logs/ -name "*.log.*" -mtime +30 -delete

# Comprimi log grandi
gzip logs/*.log.1 logs/*.log.2
```

---
*Sistema implementato il 16 Ottobre 2025*
*Compatibile con Gunicorn e Flask*