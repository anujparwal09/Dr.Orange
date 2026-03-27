import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

def get_db_url():
    db_url = os.getenv('DATABASE_URL', 'sqlite:///dr_orange.db')
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return db_url

class DevelopmentConfig:
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = get_db_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '24')))
    
    # 10MB max upload
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_UPLOAD_SIZE_MB', '10')) * 1024 * 1024
    
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    REPORTS_FOLDER = os.getenv('REPORTS_FOLDER', 'reports')
    
    MODEL_PATH = os.getenv('MODEL_PATH', 'model/orange_mtl_model.h5')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,https://dr-orange.vercel.app').split(',')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

class ProductionConfig(DevelopmentConfig):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}
