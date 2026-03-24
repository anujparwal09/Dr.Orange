from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import re
import requests as http_requests
import logging
from models import User
from extensions import db

auth_bp = Blueprint('auth', __name__)

GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
logger = logging.getLogger(__name__)

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)


@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """Authenticate a user via Google ID token (sign in or sign up)."""
    data = request.get_json()
    if not data or not data.get('credential'):
        logger.warning("❌ Google auth: Missing credential")
        return jsonify({"error": "Missing Google credential"}), 400

    credential = data['credential']
    logger.info("🔐 Google auth: Verifying token...")

    try:
        # Verify the Google ID token via Google's tokeninfo endpoint (increased timeout to 15s)
        logger.info(f"🌐 Calling Google tokeninfo endpoint...")
        resp = http_requests.get(
            GOOGLE_TOKENINFO_URL,
            params={'id_token': credential},
            timeout=15
        )

        if resp.status_code != 200:
            logger.error(f"❌ Google tokeninfo returned {resp.status_code}: {resp.text[:200]}")
            return jsonify({"error": f"Invalid Google token (status {resp.status_code})"}), 401

        google_data = resp.json()
        email = google_data.get('email')
        name = google_data.get('name', email.split('@')[0] if email else 'User')
        
        if not email:
            logger.error("❌ Google tokeninfo: No email in response")
            return jsonify({"error": "Could not retrieve email from Google"}), 400

        logger.info(f"✅ Google verified email: {email}")

        # Check if user already exists
        user = User.query.filter_by(email=email).first()

        if user:
            logger.info(f"👤 Existing user found: {email}")
            # Existing user — link to Google if not already
            if user.auth_provider == 'local':
                user.auth_provider = 'google'
                db.session.commit()
                logger.info(f"🔗 User {email} now linked to Google")
        else:
            # Create new user via Google
            logger.info(f"🆕 Creating new user from Google: {email}")
            user = User(name=name, email=email, auth_provider='google')
            db.session.add(user)
            db.session.commit()
            logger.info(f"✅ User created: {email} (ID: {user.id})")

        token = create_access_token(identity=str(user.id))
        logger.info(f"🎟️  JWT token generated for user: {email}")

        return jsonify({
            "message": "Google authentication successful",
            "data": {
                "token": token,
                "user": user.to_dict()
            }
        }), 200

    except http_requests.exceptions.Timeout:
        logger.error("⏱️ Google verification timed out after 15s")
        return jsonify({"error": "Google verification timed out. Please check your internet connection and try again."}), 504
    except http_requests.exceptions.ConnectionError as e:
        logger.error(f"🔌 Connection error to Google: {str(e)}")
        return jsonify({"error": "Cannot reach Google verification service. Please check your internet."}), 503
    except Exception as e:
        db.session.rollback()
        logger.error(f"🔴 Google auth exception: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"📍 Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Google authentication failed: {str(e)}"}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400
        
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    try:
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        
        return jsonify({
            "message": "User created successfully",
            "data": {
                "token": token,
                "user": user.to_dict()
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create user"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "data": {
            "token": token,
            "user": user.to_dict()
        }
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "message": "Profile retrieved successfully",
        "data": {
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "id": user.id
        }
    }), 200

