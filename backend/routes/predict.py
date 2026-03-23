import os
import uuid
import json

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from models import Scan
from extensions import db
from model.model_loader import load_model_once, get_prediction

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
        return jsonify({
            "error": "No image provided",
            "code": "NO_IMAGE"
        }), 400

    file = request.files.get('image') or request.files.get('file')

    if file.filename == '':
        return jsonify({
            "error": "Empty filename",
            "code": "EMPTY_FILENAME"
        }), 400

    if not allowed_file(file.filename):
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
        # ==============================
        # LOAD MODEL (ONCE)
        # ==============================
        load_model_once()

        # ==============================
        # READ IMAGE
        # ==============================
        with open(file_path, 'rb') as f:
            image_bytes = f.read()

        # ==============================
        # PREDICTION
        # ==============================
        from model.inference import get_full_prediction
        from model.model_loader import model
        
        if model is None:
            raise Exception("Model is not loaded. Cannot perform prediction.")
            
        result = get_full_prediction(image_bytes, model)

        # ==============================
        # SAVE TO DATABASE
        # ==============================
        user_id = int(get_jwt_identity())

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

        # ==============================
        # RESPONSE FORMATTING FOR FRONTEND
        # ==============================
        gemini_data = result.get('gemini_report') if isinstance(result.get('gemini_report'), dict) else {}
        
        response = {
            "scan_id": scan.id,
            "disease": result.get('disease'),
            "confidence": round(result.get('disease_confidence', 0) * 100, 1),
            "quality_score": result.get('quality_score'),
            "shelf_life": result.get('shelf_life_days'),
            "days_since_harvest": result.get('estimated_age_days'),
            "ripeness": result.get('ripeness_stage'),
            "description": gemini_data.get('overview', f"Standard analysis for {result.get('disease')}. Confidence is high, but always monitor crops regularly."),
            "treatment": gemini_data.get('treatment', []),
            "hindi_summary": gemini_data.get('hindi_summary', ""),
            "confidence_breakdown": {
                k: round(v * 100, 1) for k, v in result.get('all_probabilities', {}).items()
            }
        }

        return jsonify(response), 200

    except Exception as e:
        # ==============================
        # ERROR HANDLING
        # ==============================
        if os.path.exists(file_path):
            os.remove(file_path)

        current_app.logger.error(f"❌ Prediction error: {str(e)}")

        return jsonify({
            "error": "Failed to process image",
            "code": "PREDICTION_FAILED"
        }), 500