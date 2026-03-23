import os
import logging
from datetime import datetime
from flask import Flask, jsonify

from config import config
from extensions import db, jwt, bcrypt, cors

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Logging setup
    logging.basicConfig(level=logging.INFO)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Create directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['REPORTS_FOLDER'], exist_ok=True)

    # JWT Error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "code": "INVALID_TOKEN"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization required", "code": "AUTH_REQUIRED"}), 401

    # Register blueprints
    from routes.auth import auth_bp
    from routes.predict import predict_bp
    from routes.history import history_bp
    from routes.report import report_bp
    from routes.chat import chat_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')
    app.register_blueprint(report_bp, url_prefix='/api')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Create tables + migrate existing ones
    with app.app_context():
        db.create_all()

        # Migrate: add auth_provider column if missing, make password_hash nullable
        from sqlalchemy import text, inspect
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('users')]

        if 'auth_provider' not in columns:
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'"
            ))
            db.session.commit()
            logging.info("✅ Migration: Added 'auth_provider' column to users table")

        # Make password_hash nullable (for Google OAuth users)
        try:
            db.session.execute(text(
                "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"
            ))
            db.session.commit()
            logging.info("✅ Migration: Made 'password_hash' nullable")
        except Exception:
            db.session.rollback()  # Already nullable or SQLite (no-op)

    @app.route('/health')
    def health():
        from model.model_loader import model_loaded
        return jsonify({
            "status": "ok",
            "model_loaded": model_loaded,
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found", "code": "NOT_FOUND"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "code": "INTERNAL_ERROR"}), 500

    return app

# Load model at startup
from model.model_loader import load_model_once

app = create_app()

print("🚀 Loading ML model...")
load_model_once(os.path.join(os.path.dirname(__file__), "model", "orange_mtl_model.keras"))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
