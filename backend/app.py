import os
import logging
from datetime import datetime
from flask import Flask, jsonify

from config import config
from extensions import db, jwt, bcrypt, cors

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    logging.basicConfig(level=logging.INFO)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', ['*']),
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs(app.config.get('REPORTS_FOLDER', 'reports'), exist_ok=True)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "code": "INVALID_TOKEN"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization required", "code": "AUTH_REQUIRED"}), 401

    from routes.auth    import auth_bp
    from routes.predict import predict_bp
    from routes.history import history_bp
    from routes.report  import report_bp
    from routes.chat    import chat_bp
    from routes.admin   import admin_bp

    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(predict_bp,  url_prefix='/api')
    app.register_blueprint(history_bp,  url_prefix='/api')
    app.register_blueprint(report_bp,   url_prefix='/api')
    app.register_blueprint(chat_bp,     url_prefix='/api/chat')
    app.register_blueprint(admin_bp,    url_prefix='/api/admin')

    with app.app_context():
        db.create_all()

        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('users')]

            if 'auth_provider' not in columns:
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'"
                ))
                db.session.commit()
                logging.info("✅ Migration: Added auth_provider column")
        except Exception as e:
            db.session.rollback()
            logging.warning(f"Migration skipped (table may not exist yet): {e}")

    @app.route('/health')
    def health():
        from model.model_loader import model_loaded, load_model_once
        
        # Try to ensure model is loaded
        model_status = "unknown"
        model_error = None
        
        try:
            if not model_loaded:
                logging.info("Health check: Attempting to load model...")
                load_model_once()
            
            if model_loaded:
                model_status = "loaded"
            else:
                model_status = "failed_to_load"
                model_error = "Model loading returned False"
        except Exception as e:
            model_status = "error"
            model_error = str(e)
            logging.error(f"Health check model load error: {e}")
        
        return jsonify({
            "status": "ok",
            "model_loaded": model_loaded,
            "model_status": model_status,
            "model_error": model_error,
            "timestamp": datetime.utcnow().isoformat()
        }), 200 if model_loaded else 503

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found",       "code": "NOT_FOUND"}),      404

    @app.errorhandler(500)
    def server_error(e):
        import traceback
        logging.error(f"500 Error: {e}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            "error": "Internal server error", 
            "code": "INTERNAL_ERROR",
            "details": str(e) if app.debug else "Server error occurred"
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        logging.error(f"Unhandled exception: {type(e).__name__}: {e}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            "error": f"Error: {str(e)}", 
            "code": "SERVER_ERROR"
        }), 500

    return app


# ─── Create app ───────────────────────────────────────────────────────────────
app = create_app()

# ─── Configure Model Path ─────────────────────────────────────────────────────
# Do NOT load the model on startup - it takes too long on Render (32MB, ~20-30s)
# Instead, load it lazily on first prediction request
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "orange_mtl_model.keras")
os.environ.setdefault("MODEL_PATH", MODEL_PATH)

logging.info(f"Model path configured: {MODEL_PATH}")
logging.info("ML model will be loaded on first prediction request (lazy loading)")

# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)