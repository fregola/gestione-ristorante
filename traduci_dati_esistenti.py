#!/usr/bin/env python3
"""
Script per tradurre automaticamente tutti i dati esistenti nel database
"""

import sqlite3
import requests
import json
import time

def traduci_testo(testo, lingua_destinazione='en'):
    """
    Traduce un testo usando Google Translate API
    """
    if not testo or not testo.strip():
        return testo
    
    try:
        # URL dell'API di Google Translate (gratuita)
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'it',  # lingua sorgente (italiano)
            'tl': lingua_destinazione,  # lingua destinazione
            'dt': 't',
            'q': testo
        }
        
        response = requests.get(url, params=params, timeout=10)
        result = response.json()
        
        if result and len(result) > 0 and len(result[0]) > 0:
            return result[0][0][0]
        else:
            return testo
            
    except Exception as e:
        print(f"Errore nella traduzione di '{testo}': {e}")
        return testo

def salva_traduzione(cursor, tabella, elemento_id, nome_it, descrizione_it=None, categoria_ingrediente_it=None):
    """
    Salva le traduzioni per un elemento
    """
    try:
        # Traduci in inglese
        nome_en = traduci_testo(nome_it, 'en')
        descrizione_en = traduci_testo(descrizione_it, 'en') if descrizione_it else None
        categoria_ingrediente_en = traduci_testo(categoria_ingrediente_it, 'en') if categoria_ingrediente_it else None
        
        print(f"  {nome_it} -> {nome_en}")
        if descrizione_it:
            print(f"  {descrizione_it} -> {descrizione_en}")
        
        # Inserisci o aggiorna la traduzione con i nomi di colonna corretti
        if tabella == 'ingredienti_traduzioni':
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                (ingrediente_id, lingua, nome, descrizione, categoria_ingrediente)
                VALUES (?, 'en', ?, ?, ?)
            ''', (elemento_id, nome_en, descrizione_en, categoria_ingrediente_en))
        elif tabella == 'categorie_traduzioni':
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                (categoria_id, lingua, nome, descrizione)
                VALUES (?, 'en', ?, ?)
            ''', (elemento_id, nome_en, descrizione_en))
        elif tabella == 'prodotti_traduzioni':
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                (prodotto_id, lingua, nome, descrizione)
                VALUES (?, 'en', ?, ?)
            ''', (elemento_id, nome_en, descrizione_en))
        elif tabella == 'allergeni_traduzioni':
            cursor.execute(f'''
                INSERT OR REPLACE INTO {tabella} 
                (allergene_id, lingua, nome, descrizione)
                VALUES (?, 'en', ?, ?)
            ''', (elemento_id, nome_en, descrizione_en))
        
        # Piccola pausa per evitare rate limiting
        time.sleep(0.5)
        
    except Exception as e:
        print(f"Errore nel salvare la traduzione per {nome_it}: {e}")

def main():
    print("🌐 Inizio traduzione dati esistenti...")
    
    conn = sqlite3.connect('ristorante.db')
    cursor = conn.cursor()
    
    try:
        # 1. Traduci categorie
        print("\n📁 Traduzione categorie...")
        cursor.execute("SELECT id, nome, descrizione FROM categorie WHERE attiva = 1")
        categorie = cursor.fetchall()
        
        for categoria_id, nome, descrizione in categorie:
            print(f"Categoria ID {categoria_id}:")
            salva_traduzione(cursor, 'categorie_traduzioni', categoria_id, nome, descrizione)
        
        # 2. Traduci prodotti
        print("\n🍝 Traduzione prodotti...")
        cursor.execute("SELECT id, nome, descrizione FROM prodotti WHERE attivo = 1")
        prodotti = cursor.fetchall()
        
        for prodotto_id, nome, descrizione in prodotti:
            print(f"Prodotto ID {prodotto_id}:")
            salva_traduzione(cursor, 'prodotti_traduzioni', prodotto_id, nome, descrizione)
        
        # 3. Traduci ingredienti
        print("\n🥬 Traduzione ingredienti...")
        cursor.execute("SELECT id, nome, descrizione, categoria_ingrediente FROM ingredienti WHERE attivo = 1")
        ingredienti = cursor.fetchall()
        
        for ingrediente in ingredienti:
            ingrediente_id, nome, descrizione, categoria_ingrediente = ingrediente
            print(f"Ingrediente ID {ingrediente_id}:")
            salva_traduzione(cursor, 'ingredienti_traduzioni', ingrediente_id, nome, descrizione, categoria_ingrediente)
        
        # 4. Traduci allergeni
        print("\n⚠️ Traduzione allergeni...")
        cursor.execute("SELECT id, nome, descrizione FROM allergeni WHERE attivo = 1")
        allergeni = cursor.fetchall()
        
        for allergene_id, nome, descrizione in allergeni:
            print(f"Allergene ID {allergene_id}:")
            salva_traduzione(cursor, 'allergeni_traduzioni', allergene_id, nome, descrizione)
        
        # Commit delle modifiche
        conn.commit()
        print("\n✅ Traduzione completata con successo!")
        
        # Mostra statistiche
        cursor.execute("SELECT COUNT(*) FROM categorie_traduzioni")
        cat_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM prodotti_traduzioni")
        prod_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM ingredienti_traduzioni")
        ing_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM allergeni_traduzioni")
        all_count = cursor.fetchone()[0]
        
        print(f"\n📊 Statistiche traduzioni:")
        print(f"  - Categorie: {cat_count}")
        print(f"  - Prodotti: {prod_count}")
        print(f"  - Ingredienti: {ing_count}")
        print(f"  - Allergeni: {all_count}")
        
    except Exception as e:
        print(f"❌ Errore durante la traduzione: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()