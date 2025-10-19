# Sicurezza

## Configurazione delle Credenziali

Per motivi di sicurezza, le credenziali di default non sono più hardcoded nel codice. 

### Configurazione Iniziale

1. Copia il file `.env.example` in `.env`:
   ```bash
   cp .env.example .env
   ```

2. **IMPORTANTE**: Modifica il file `.env` con le tue credenziali sicure:
   ```
   SECRET_KEY=your-secret-key-here
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   CORS_ORIGINS=http://localhost:5001,http://127.0.0.1:5001
   ```

### Generazione Chiave Sicura

Per generare una `SECRET_KEY` sicura, usa questo comando:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Variabili d'Ambiente

- `SECRET_KEY`: Chiave segreta per Flask (obbligatoria in produzione)
- `DEFAULT_ADMIN_USERNAME`: Username dell'amministratore di default
- `DEFAULT_ADMIN_PASSWORD`: Password dell'amministratore di default
- `CORS_ORIGINS`: Origini consentite per CORS (separate da virgola)
- `PORT`: Porta del server (default: 5001)
- `DEBUG`: Modalità debug (False in produzione)

### Note di Sicurezza

- ⚠️ **Non committare mai il file `.env` nel repository**
- 🔐 **Usa password sicure in produzione** (almeno 12 caratteri, maiuscole, minuscole, numeri, simboli)
- 🔑 **Cambia sempre la `SECRET_KEY` in produzione**
- 🌐 **Configura `CORS_ORIGINS` solo con i domini necessari**
- 🚫 **Disabilita `DEBUG=False` in produzione**