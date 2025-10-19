# Sicurezza

## Configurazione delle Credenziali

Per motivi di sicurezza, le credenziali di default non sono più hardcoded nel codice. 

### Configurazione Iniziale

1. Copia il file `.env.example` in `.env`:
   ```bash
   cp .env.example .env
   ```

2. Modifica il file `.env` con le tue credenziali:
   ```
   SECRET_KEY=your-secret-key-here
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   CORS_ORIGINS=http://localhost:5001,http://127.0.0.1:5001
   ```

### Variabili d'Ambiente

- `SECRET_KEY`: Chiave segreta per Flask (obbligatoria in produzione)
- `DEFAULT_ADMIN_USERNAME`: Username dell'amministratore di default
- `DEFAULT_ADMIN_PASSWORD`: Password dell'amministratore di default
- `CORS_ORIGINS`: Origini consentite per CORS (separate da virgola)

### Note di Sicurezza

- Non committare mai il file `.env` nel repository
- Usa password sicure in produzione
- Cambia la `SECRET_KEY` in produzione
- Configura `CORS_ORIGINS` solo con i domini necessari