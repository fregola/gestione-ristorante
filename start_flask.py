#!/usr/bin/env python3
"""
Script di avvio per Flask in produzione
Avvia l'applicazione Flask direttamente senza Gunicorn
"""

import os
import sys
from app import app, socketio, init_db

def main():
    """Avvia l'applicazione Flask"""
    
    # Inizializza il database
    print("Inizializzazione database...")
    init_db()
    print("Database inizializzato con successo!")
    
    # Configurazione per produzione
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Avvio Flask server su {host}:{port}")
    print(f"Debug mode: {debug}")
    print("Premi CTRL+C per fermare il server")
    
    try:
        # Avvia il server Flask con SocketIO
        socketio.run(
            app, 
            debug=debug, 
            host=host, 
            port=port,
            allow_unsafe_werkzeug=True,
            use_reloader=False  # Disabilita il reloader in produzione
        )
    except KeyboardInterrupt:
        print("\nServer fermato dall'utente")
        sys.exit(0)
    except Exception as e:
        print(f"Errore durante l'avvio del server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()