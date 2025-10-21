#!/usr/bin/env python3
"""
Script per ottimizzare il database di produzione con gli indici necessari
"""

import sqlite3
import sys

def create_indices(db_path):
    """Crea gli indici necessari per ottimizzare le performance"""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Lista degli indici da creare
    indices_to_create = [
        'CREATE INDEX IF NOT EXISTS idx_prodotti_categoria_id ON prodotti(categoria_id)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_attivo ON prodotti(attivo)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_disponibile ON prodotti(disponibile)',
        'CREATE INDEX IF NOT EXISTS idx_categorie_parent_id ON categorie(parent_id)',
        'CREATE INDEX IF NOT EXISTS idx_categorie_attiva ON categorie(attiva)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_allergeni_prodotto_id ON prodotti_allergeni(prodotto_id)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_allergeni_allergene_id ON prodotti_allergeni(allergene_id)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_ingredienti_prodotto_id ON prodotti_ingredienti(prodotto_id)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_ingredienti_ingrediente_id ON prodotti_ingredienti(ingrediente_id)',
        'CREATE INDEX IF NOT EXISTS idx_allergeni_attivo ON allergeni(attivo)',
        'CREATE INDEX IF NOT EXISTS idx_ingredienti_attivo ON ingredienti(attivo)',
        # Indici compositi per query più complesse
        'CREATE INDEX IF NOT EXISTS idx_prodotti_attivo_disponibile ON prodotti(attivo, disponibile)',
        'CREATE INDEX IF NOT EXISTS idx_prodotti_categoria_attivo ON prodotti(categoria_id, attivo)',
    ]
    
    print(f'Ottimizzazione database: {db_path}')
    print('Creazione indici in corso...')
    
    created_count = 0
    for i, sql in enumerate(indices_to_create, 1):
        try:
            cursor.execute(sql)
            index_name = sql.split(' ')[-1].split('(')[0]
            print(f'{i:2d}. {index_name} - OK')
            created_count += 1
        except Exception as e:
            print(f'{i:2d}. Errore: {e}')
    
    conn.commit()
    
    # Verifica gli indici creati
    cursor.execute('SELECT name FROM sqlite_master WHERE type="index" AND name LIKE "idx_%"')
    indices = cursor.fetchall()
    
    print(f'\nRisultato:')
    print(f'- Indici creati in questa sessione: {created_count}')
    print(f'- Totale indici personalizzati: {len(indices)}')
    
    # Analizza le tabelle per aggiornare le statistiche
    print('\nAggiornamento statistiche tabelle...')
    tables = ['prodotti', 'categorie', 'prodotti_allergeni', 'prodotti_ingredienti', 'allergeni', 'ingredienti']
    for table in tables:
        try:
            cursor.execute(f'ANALYZE {table}')
            print(f'- {table} - OK')
        except Exception as e:
            print(f'- {table} - Errore: {e}')
    
    conn.commit()
    conn.close()
    
    print('\nOttimizzazione completata!')

if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'ristorante.db'
    create_indices(db_path)