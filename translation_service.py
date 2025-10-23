import os
import json
import time
import requests
import sqlite3
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime

try:
    from google.cloud import translate_v2 as translate
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    GOOGLE_TRANSLATE_AVAILABLE = False
    translate = None

logger = logging.getLogger(__name__)

class TranslationService:
    """
    Servizio di traduzione che utilizza Google Translate API con sistema di fallback
    Salva le traduzioni direttamente nelle tabelle del database ristorante.db
    """
    
    def __init__(self):
        self.db_path = 'ristorante.db'
        self.api_key = os.getenv('GOOGLE_TRANSLATE_API_KEY')
        self.base_url = 'https://translation.googleapis.com/language/translate/v2'
        self.cache = {}
        self.fallback_translations = {
            'it': {
                'Pizza Margherita': 'Pizza Margherita',
                'Bruschetta': 'Bruschetta',
                'Antipasti': 'Appetizers',
                'Primi Piatti': 'First Courses',
                'Secondi Piatti': 'Main Courses',
                'Dolci': 'Desserts',
                'Bevande': 'Beverages',
                'pesce': 'fish',
                'carne': 'meat',
                'pollo': 'chicken',
                'verdure': 'vegetables',
                'formaggio': 'cheese',
                'pomodoro': 'tomato',
                'basilico': 'basil',
                'aglio': 'garlic',
                'olio': 'oil',
                'sale': 'salt',
                'pepe': 'pepper',
                'pasta': 'pasta',
                'riso': 'rice',
                'pane': 'bread',
                'vino': 'wine',
                'acqua': 'water',
                'latte': 'milk',
                'uova': 'eggs',
                'burro': 'butter',
                'zucchero': 'sugar',
                'farina': 'flour'
            },
            'en': {
                'Pizza Margherita': 'Pizza Margherita',
                'Bruschetta': 'Bruschetta',
                'Appetizers': 'Antipasti',
                'First Courses': 'Primi Piatti',
                'Main Courses': 'Secondi Piatti',
                'Desserts': 'Dolci',
                'Beverages': 'Bevande',
                'fish': 'pesce',
                'meat': 'carne',
                'chicken': 'pollo',
                'vegetables': 'verdure',
                'cheese': 'formaggio',
                'tomato': 'pomodoro',
                'basil': 'basilico',
                'garlic': 'aglio',
                'oil': 'olio',
                'salt': 'sale',
                'pepper': 'pepe',
                'pasta': 'pasta',
                'rice': 'riso',
                'bread': 'pane',
                'wine': 'vino',
                'water': 'acqua',
                'milk': 'latte',
                'eggs': 'uova',
                'butter': 'burro',
                'sugar': 'zucchero',
                'flour': 'farina'
            }
        }
    
    def translate_text(self, text: str, target_lang: str = 'en') -> str:
        """Traduce un testo usando Google Translate API o fallback"""
        if not text or not text.strip():
            return text
        
        text = text.strip()
        
        # Controlla cache in memoria
        cache_key = f"{text}_{target_lang}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Controlla fallback locale
        if target_lang in self.fallback_translations:
            if text in self.fallback_translations[target_lang]:
                translation = self.fallback_translations[target_lang][text]
                self.cache[cache_key] = translation
                return translation
        
        # Prova Google Translate API gratuita (senza chiave)
        try:
            # Usa l'endpoint pubblico di Google Translate
            url = "https://translate.googleapis.com/translate_a/single"
            params = {
                'client': 'gtx',
                'sl': 'it',  # source language
                'tl': target_lang,  # target language
                'dt': 't',  # return translation
                'q': text
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result and len(result) > 0 and len(result[0]) > 0:
                    translation = result[0][0][0]
                    self.cache[cache_key] = translation
                    return translation
                        
        except Exception as e:
            logger.warning(f"Errore Google Translate gratuito: {e}")
        
        # Prova Google Translate API con chiave (se disponibile)
        if self.api_key:
            try:
                params = {
                    'key': self.api_key,
                    'q': text,
                    'target': target_lang,
                    'source': 'it'
                }
                
                response = requests.get(self.base_url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'data' in data and 'translations' in data['data']:
                        translation = data['data']['translations'][0]['translatedText']
                        self.cache[cache_key] = translation
                        return translation
                        
            except Exception as e:
                logger.warning(f"Errore Google Translate API: {e}")
        
        # Fallback: restituisce il testo originale
        self.cache[cache_key] = text
        return text

    def translate_and_save_product(self, product_id: int, nome: str, descrizione: str = None) -> Dict[str, str]:
        """
        Traduce e salva le traduzioni di un prodotto direttamente nella tabella prodotti
        """
        translations = {}
        
        # Traduci nome
        nome_en = self.translate_text(nome, 'en')
        translations['nome_en'] = nome_en
        
        # Traduci descrizione se presente
        descrizione_en = None
        if descrizione and descrizione.strip():
            descrizione_en = self.translate_text(descrizione, 'en')
            translations['descrizione_en'] = descrizione_en
        
        # Salva nel database
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if descrizione_en:
                cursor.execute('''
                    UPDATE prodotti 
                    SET nome_en = ?, descrizione_en = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (nome_en, descrizione_en, product_id))
            else:
                cursor.execute('''
                    UPDATE prodotti 
                    SET nome_en = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (nome_en, product_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Traduzioni salvate per prodotto {product_id}: {translations}")
            
        except Exception as e:
            logger.error(f"Errore nel salvare traduzioni prodotto {product_id}: {e}")
        
        return translations

    def translate_and_save_category(self, category_id: int, nome: str, descrizione: str = None) -> Dict[str, str]:
        """
        Traduce e salva le traduzioni di una categoria direttamente nella tabella categorie
        """
        translations = {}
        
        # Traduci nome
        nome_en = self.translate_text(nome, 'en')
        translations['nome_en'] = nome_en
        
        # Traduci descrizione se presente
        descrizione_en = None
        if descrizione and descrizione.strip():
            descrizione_en = self.translate_text(descrizione, 'en')
            translations['descrizione_en'] = descrizione_en
        
        # Salva nel database
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if descrizione_en:
                cursor.execute('''
                    UPDATE categorie 
                    SET nome_en = ?, descrizione_en = ?
                    WHERE id = ?
                ''', (nome_en, descrizione_en, category_id))
            else:
                cursor.execute('''
                    UPDATE categorie 
                    SET nome_en = ?
                    WHERE id = ?
                ''', (nome_en, category_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Traduzioni salvate per categoria {category_id}: {translations}")
            
        except Exception as e:
            logger.error(f"Errore nel salvare traduzioni categoria {category_id}: {e}")
        
        return translations

    def translate_and_save_allergen(self, allergen_id: int, nome: str, descrizione: str = None) -> Dict[str, str]:
        """
        Traduce e salva le traduzioni di un allergene direttamente nella tabella allergeni
        """
        translations = {}
        
        # Traduci nome
        nome_en = self.translate_text(nome, 'en')
        translations['nome_en'] = nome_en
        
        # Traduci descrizione se presente
        descrizione_en = None
        if descrizione and descrizione.strip():
            descrizione_en = self.translate_text(descrizione, 'en')
            translations['descrizione_en'] = descrizione_en
        
        # Salva nel database
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if descrizione_en:
                cursor.execute('''
                    UPDATE allergeni 
                    SET nome_en = ?, descrizione_en = ?
                    WHERE id = ?
                ''', (nome_en, descrizione_en, allergen_id))
            else:
                cursor.execute('''
                    UPDATE allergeni 
                    SET nome_en = ?
                    WHERE id = ?
                ''', (nome_en, allergen_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Traduzioni salvate per allergene {allergen_id}: {translations}")
            
        except Exception as e:
            logger.error(f"Errore nel salvare traduzioni allergene {allergen_id}: {e}")
        
        return translations

    def translate_and_save_ingredient(self, ingredient_id: int, nome: str, descrizione: str = None) -> Dict[str, str]:
        """
        Traduce e salva le traduzioni di un ingrediente direttamente nella tabella ingredienti
        """
        translations = {}
        
        # Traduci nome
        nome_en = self.translate_text(nome, 'en')
        translations['nome_en'] = nome_en
        
        # Traduci descrizione se presente
        descrizione_en = None
        if descrizione and descrizione.strip():
            descrizione_en = self.translate_text(descrizione, 'en')
            translations['descrizione_en'] = descrizione_en
        
        # Salva nel database
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if descrizione_en:
                cursor.execute('''
                    UPDATE ingredienti 
                    SET nome_en = ?, descrizione_en = ?
                    WHERE id = ?
                ''', (nome_en, descrizione_en, ingredient_id))
            else:
                cursor.execute('''
                    UPDATE ingredienti 
                    SET nome_en = ?
                    WHERE id = ?
                ''', (nome_en, ingredient_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Traduzioni salvate per ingrediente {ingredient_id}: {translations}")
            
        except Exception as e:
            logger.error(f"Errore nel salvare traduzioni ingrediente {ingredient_id}: {e}")
        
        return translations

    def get_translations(self, table: str, item_id: int, lang: str = 'en') -> Dict[str, str]:
        """
        Recupera le traduzioni per un elemento specifico dal database
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if lang == 'en':
                cursor.execute(f'''
                    SELECT nome, nome_en, descrizione, descrizione_en 
                    FROM {table} 
                    WHERE id = ?
                ''', (item_id,))
            else:
                cursor.execute(f'''
                    SELECT nome, descrizione 
                    FROM {table} 
                    WHERE id = ?
                ''', (item_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                if lang == 'en' and len(result) == 4:
                    return {
                        'nome': result[1] or result[0],  # nome_en o nome
                        'descrizione': result[3] or result[2]  # descrizione_en o descrizione
                    }
                else:
                    return {
                        'nome': result[0],
                        'descrizione': result[1] if len(result) > 1 else None
                    }
            
        except Exception as e:
            logger.error(f"Errore nel recuperare traduzioni da {table} per ID {item_id}: {e}")
        
        return {}

    def batch_translate_table(self, table: str, force_retranslate: bool = False) -> int:
        """
        Traduce tutti gli elementi di una tabella in batch
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Seleziona elementi da tradurre
            if force_retranslate:
                cursor.execute(f'SELECT id, nome, descrizione FROM {table}')
            else:
                cursor.execute(f'SELECT id, nome, descrizione FROM {table} WHERE nome_en IS NULL OR nome_en = ""')
            
            items = cursor.fetchall()
            conn.close()
            
            translated_count = 0
            
            for item_id, nome, descrizione in items:
                if table == 'prodotti':
                    self.translate_and_save_product(item_id, nome, descrizione)
                elif table == 'categorie':
                    self.translate_and_save_category(item_id, nome, descrizione)
                elif table == 'allergeni':
                    self.translate_and_save_allergen(item_id, nome, descrizione)
                elif table == 'ingredienti':
                    self.translate_and_save_ingredient(item_id, nome, descrizione)
                
                translated_count += 1
                
                # Pausa per evitare rate limiting
                time.sleep(0.1)
            
            logger.info(f"Tradotti {translated_count} elementi dalla tabella {table}")
            return translated_count
            
        except Exception as e:
            logger.error(f"Errore nella traduzione batch della tabella {table}: {e}")
            return 0

# Istanza globale del servizio
translation_service = TranslationService()