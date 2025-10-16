import logging
import logging.handlers
import os
from datetime import datetime

def setup_logging(app=None, log_level='INFO'):
    """
    Configura il sistema di logging per l'applicazione ristorante
    
    Args:
        app: Istanza Flask (opzionale)
        log_level: Livello di logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    
    # Crea directory logs se non esiste
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Configurazione base del logging
    log_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s - [%(filename)s:%(lineno)d]'
    )
    
    # Logger principale
    logger = logging.getLogger('restaurant_app')
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Rimuovi handler esistenti per evitare duplicati
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 1. Handler per file generale (con rotazione)
    general_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'app.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    general_handler.setFormatter(log_format)
    general_handler.setLevel(logging.INFO)
    logger.addHandler(general_handler)
    
    # 2. Handler per errori (file separato)
    error_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'errors.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3,
        encoding='utf-8'
    )
    error_handler.setFormatter(log_format)
    error_handler.setLevel(logging.ERROR)
    logger.addHandler(error_handler)
    
    # 3. Handler per sicurezza (login, accessi)
    security_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'security.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=5,
        encoding='utf-8'
    )
    security_handler.setFormatter(log_format)
    security_handler.setLevel(logging.WARNING)
    
    # Logger specifico per sicurezza
    security_logger = logging.getLogger('restaurant_app.security')
    security_logger.addHandler(security_handler)
    security_logger.setLevel(logging.WARNING)
    
    # 4. Handler per business (ordini, vendite)
    business_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'business.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    business_handler.setFormatter(log_format)
    business_handler.setLevel(logging.INFO)
    
    # Logger specifico per business
    business_logger = logging.getLogger('restaurant_app.business')
    business_logger.addHandler(business_handler)
    business_logger.setLevel(logging.INFO)
    
    # 5. Handler console (solo per sviluppo)
    if log_level.upper() == 'DEBUG':
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(levelname)s - %(message)s'
        ))
        console_handler.setLevel(logging.DEBUG)
        logger.addHandler(console_handler)
    
    # Configurazione Flask se fornita
    if app:
        app.logger.handlers = []
        app.logger.addHandler(general_handler)
        app.logger.addHandler(error_handler)
        app.logger.setLevel(getattr(logging, log_level.upper()))
    
    # Log di inizializzazione
    logger.info("Sistema di logging inizializzato")
    logger.info(f"Livello logging: {log_level}")
    logger.info(f"Directory logs: {os.path.abspath(log_dir)}")
    
    return logger

def get_logger(name='restaurant_app'):
    """
    Ottieni un logger configurato
    
    Args:
        name: Nome del logger
    
    Returns:
        Logger configurato
    """
    return logging.getLogger(name)

def get_security_logger():
    """
    Ottieni il logger per eventi di sicurezza
    
    Returns:
        Logger per sicurezza
    """
    return logging.getLogger('restaurant_app.security')

def get_business_logger():
    """
    Ottieni il logger per eventi business
    
    Returns:
        Logger per business
    """
    return logging.getLogger('restaurant_app.business')

# Funzioni helper per logging specifico
def log_user_action(user_id, action, details=None):
    """Log azioni utente"""
    business_logger = get_business_logger()
    message = f"User {user_id}: {action}"
    if details:
        message += f" - {details}"
    business_logger.info(message)

def log_security_event(event_type, ip_address, details=None):
    """Log eventi di sicurezza"""
    security_logger = get_security_logger()
    message = f"Security Event: {event_type} from {ip_address}"
    if details:
        message += f" - {details}"
    security_logger.warning(message)

def log_error(error, context=None):
    """Log errori con contesto"""
    logger = get_logger()
    message = f"Error: {str(error)}"
    if context:
        message += f" - Context: {context}"
    logger.error(message, exc_info=True)

def log_performance(operation, duration, details=None):
    """Log metriche di performance"""
    logger = get_logger()
    message = f"Performance: {operation} completed in {duration:.3f}s"
    if details:
        message += f" - {details}"
    logger.info(message)