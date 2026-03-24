import os
import uuid
import json
import logging

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from models import Scan
from extensions import db
from model.model_loader import load_model_once, get_prediction

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==============================
# BLUEPRINT
# ==============================
predict_bp = Blueprint('predict', __name__)

# ==============================
# CONFIG
# ==============================
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==============================
# ROUTE
# ==============================
@predict_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():

    # ==============================
    # CHECK IMAGE
    # ==============================
    if 'image' not in request.files and 'file' not in request.files:
        logger.warning("❌ No image in request")
        return jsonify({
            "error": "No image provided",
            "code": "NO_IMAGE"
        }), 400

    file = request.files.get('image') or request.files.get('file')

    if file.filename == '':
        logger.warning("❌ Empty filename")
        return jsonify({
            "error": "Empty filename",
            "code": "EMPTY_FILENAME"
        }), 400

    if not allowed_file(file.filename):
        logger.warning(f"❌ Invalid file type: {file.filename}")
        return jsonify({
            "error": "Invalid file type",
            "code": "INVALID_FILE_TYPE"
        }), 400

    # ==============================
    # SAVE IMAGE
    # ==============================
    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')

    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    try:
        logger.info(f"📄 Image saved: {filename}")
        
        # ==============================
        # LOAD MODEL (ONCE)
        # ==============================
        try:
            logger.info("🔨 Loading model...")
            model_loaded = load_model_once()
            
            if not model_loaded:
                error_msg = "Failed to load ML model. Please try again in a few moments."
                logger.error(f"❌ {error_msg}")
                raise Exception(error_msg)
                
        except Exception as model_err:
            logger.error(f"❌ Model loading error: {type(model_err).__name__}: {str(model_err)}")
            raise Exception(f"Model loading failed: {str(model_err)}")

        # ==============================
        # READ IMAGE
        # ==============================
        logger.info("📖 Reading image bytes...")
        with open(file_path, 'rb') as f:
            image_bytes = f.read()

        # ==============================
        # PREDICTION
        # ==============================
        logger.info("🧠 Running prediction...")
        from model.inference import get_full_prediction
        from model.model_loader import model
        
        if model is None:
            error_msg = "Model is not loaded. Cannot perform prediction."
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
            
        result = get_full_prediction(image_bytes, model)
        logger.info(f"✅ Prediction complete: disease={result.get('disease')}, confidence={result.get('disease_confidence')}")

        # ==============================
        # SAVE TO DATABASE
        # ==============================
        logger.info("💾 Saving scan to database...")
        user_id = int(get_jwt_identity())
        
        print(f"DEBUG: Saving scan for user_id: {user_id}")

        scan = Scan(
            user_id=user_id,
            image_path=file_path,
            disease=result.get('disease'),
            disease_confidence=result.get('disease_confidence'),
            all_probabilities=json.dumps(result.get('all_probabilities')),
            quality_score=result.get('quality_score'),
            shelf_life_days=result.get('shelf_life_days'),
            estimated_age_days=result.get('estimated_age_days'),
            ripeness_stage=result.get('ripeness_stage'),
            ripeness_probabilities=json.dumps(result.get('ripeness_probabilities')),
            gemini_report=json.dumps(result.get('gemini_report')) if result.get('gemini_report') else None
        )

        db.session.add(scan)
        db.session.commit()
        logger.info(f"✅ Scan saved with ID: {scan.id}")
        
        print(f"DEBUG: Scan saved with ID: {scan.id} for user_id: {user_id}")

        # ==============================
        # RESPONSE FORMATTING FOR FRONTEND
        # ==============================
        gemini_data = result.get('gemini_report') if isinstance(result.get('gemini_report'), dict) else {}
        
        # Generate default description if no Gemini report
        if not gemini_data or 'overview' not in gemini_data:
            default_description = f"Orange image analyzed with ML model. Detected: {result.get('disease')} with {round(result.get('disease_confidence', 0) * 100, 1)}% confidence. Quality score: {result.get('quality_score')}/10. Regular monitoring recommended."
        else:
            default_description = gemini_data.get('overview')
        
        response = {
            "scan_id": scan.id,
            "disease": result.get('disease'),
            "confidence": round(result.get('disease_confidence', 0) * 100, 1),
            "quality_score": result.get('quality_score'),
            "shelf_life": result.get('shelf_life_days'),
            "days_since_harvest": result.get('estimated_age_days'),
            "ripeness": result.get('ripeness_stage'),
            "description": default_description,
            "treatment": gemini_data.get('treatment', []),
            "hindi_summary": gemini_data.get('hindi_summary', ""),
            "confidence_breakdown": {
                k: round(v * 100, 1) for k, v in result.get('all_probabilities', {}).items()
            },
            "model_used": result.get('model_used', 'local_mtl'),
            "gemini_used": result.get('gemini_used', False),
            "fallback_used": result.get('fallback_used', False)
        }

        return jsonify(response), 200

    except Exception as e:
        # ==============================
        # ERROR HANDLING
        # ==============================
        logger.error(f"🔴 Prediction error: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"📍 Traceback: {traceback.format_exc()}")
        
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"🗑️ Cleaned up image: {filename}")

        return jsonify({
            "error": f"Failed to process image: {str(e)}",
            "code": "PREDICTION_FAILED"
        }), 500