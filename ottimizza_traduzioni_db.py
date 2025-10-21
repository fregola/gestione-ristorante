#!/usr/bin/env python3
"""
Script per ottimizzare le performance delle traduzioni nel database
Aggiunge indici specifici per le tabelle delle traduzioni
"""

import sqlite3
import sys

def ottimizza_traduzioni_db(db_path):
    """Ottimizza il database aggiungendo indici per le traduzioni"""
    
    print(f"Ottimizzazione traduzioni database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Indici per le traduzioni - critici per le performance
    indici_traduzioni = [
        # Prodotti traduzioni
        ("idx_prodotti_traduzioni_lookup", "CREATE INDEX IF NOT EXISTS idx_prodotti_traduzioni_lookup ON prodotti_traduzioni(prodotto_id, lingua)"),
        ("idx_prodotti_traduzioni_prodotto_id", "CREATE INDEX IF NOT EXISTS idx_prodotti_traduzioni_prodotto_id ON prodotti_traduzioni(prodotto_id)"),
        ("idx_prodotti_traduzioni_lingua", "CREATE INDEX IF NOT EXISTS idx_prodotti_traduzioni_lingua ON prodotti_traduzioni(lingua)"),
        
        # Categorie traduzioni
        ("idx_categorie_traduzioni_lookup", "CREATE INDEX IF NOT EXISTS idx_categorie_traduzioni_lookup ON categorie_traduzioni(categoria_id, lingua)"),
        ("idx_categorie_traduzioni_categoria_id", "CREATE INDEX IF NOT EXISTS idx_categorie_traduzioni_categoria_id ON categorie_traduzioni(categoria_id)"),
        ("idx_categorie_traduzioni_lingua", "CREATE INDEX IF NOT EXISTS idx_categorie_traduzioni_lingua ON categorie_traduzioni(lingua)"),
        
        # Allergeni traduzioni
        ("idx_allergeni_traduzioni_lookup", "CREATE INDEX IF NOT EXISTS idx_allergeni_traduzioni_lookup ON allergeni_traduzioni(allergene_id, lingua)"),
        ("idx_allergeni_traduzioni_allergene_id", "CREATE INDEX IF NOT EXISTS idx_allergeni_traduzioni_allergene_id ON allergeni_traduzioni(allergene_id)"),
        ("idx_allergeni_traduzioni_lingua", "CREATE INDEX IF NOT EXISTS idx_allergeni_traduzioni_lingua ON allergeni_traduzioni(lingua)"),
        
        # Ingredienti traduzioni
        ("idx_ingredienti_traduzioni_lookup", "CREATE INDEX IF NOT EXISTS idx_ingredienti_traduzioni_lookup ON ingredienti_traduzioni(ingrediente_id, lingua)"),
        ("idx_ingredienti_traduzioni_ingrediente_id", "CREATE INDEX IF NOT EXISTS idx_ingredienti_traduzioni_ingrediente_id ON ingredienti_traduzioni(ingrediente_id)"),
        ("idx_ingredienti_traduzioni_lingua", "CREATE INDEX IF NOT EXISTS idx_ingredienti_traduzioni_lingua ON ingredienti_traduzioni(lingua)"),
    ]
    
    print("Creazione indici per traduzioni in corso...")
    indici_creati = 0
    
    for i, (nome, sql) in enumerate(indici_traduzioni, 1):
        try:
            cursor.execute(sql)
            print(f"{i:2d}. {nome} - OK")
            indici_creati += 1
        except sqlite3.Error as e:
            if "already exists" in str(e):
                print(f"{i:2d}. {nome} - Già esistente")
            else:
                print(f"{i:2d}. {nome} - Errore: {e}")
    
    # Conta tutti gli indici personalizzati
    cursor.execute('''
        SELECT COUNT(*) FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ''')
    totale_indici = cursor.fetchone()[0]
    
    print(f"\nRisultato:")
    print(f"- Indici traduzioni creati in questa sessione: {indici_creati}")
    print(f"- Totale indici personalizzati: {totale_indici}")
    
    # Aggiorna le statistiche delle tabelle traduzioni
    print(f"\nAggiornamento statistiche tabelle traduzioni...")
    tabelle_traduzioni = ['prodotti_traduzioni', 'categorie_traduzioni', 'allergeni_traduzioni', 'ingredienti_traduzioni']
    
    for tabella in tabelle_traduzioni:
        try:
            cursor.execute(f'ANALYZE {tabella}')
            print(f"- {tabella} - OK")
        except sqlite3.Error as e:
            print(f"- {tabella} - Errore: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"\nOttimizzazione traduzioni completata!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python3 ottimizza_traduzioni_db.py <percorso_database>")
        sys.exit(1)
    
    db_path = sys.argv[1]
    ottimizza_traduzioni_db(db_path)