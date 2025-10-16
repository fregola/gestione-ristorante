#!/bin/bash

# Script per avviare l'applicazione in modalità produzione con Gunicorn
# Uso: ./start_production.sh

echo "🚀 Avvio applicazione in modalità produzione..."

# Controlla se il virtual environment è attivo
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Attenzione: Virtual environment non attivo"
    echo "   Attiva il virtual environment prima di continuare"
    exit 1
fi

# Controlla se Gunicorn è installato
if ! command -v gunicorn &> /dev/null; then
    echo "❌ Gunicorn non trovato. Installalo con: pip install gunicorn"
    exit 1
fi

# Controlla se il file di configurazione esiste
if [ ! -f "gunicorn_config.py" ]; then
    echo "❌ File di configurazione gunicorn_config.py non trovato"
    exit 1
fi

# Carica le variabili d'ambiente
if [ -f ".env" ]; then
    echo "📄 Caricamento variabili d'ambiente da .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  File .env non trovato, usando valori di default"
fi

# Inizializza il database se necessario
echo "🗄️  Inizializzazione database..."
python -c "from app import init_db; init_db()"

# Avvia Gunicorn
echo "🌟 Avvio Gunicorn con configurazione ottimizzata..."
echo "📡 Server disponibile su: http://0.0.0.0:5001"
echo "🛑 Premi Ctrl+C per fermare il server"
echo ""

# Esegui Gunicorn con la configurazione personalizzata
gunicorn -c gunicorn_config.py app:app

echo "👋 Server fermato"