from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import re
import requests as http_requests
from models import User
from extensions import db

auth_bp = Blueprint('auth', __name__)

GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)


@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """Authenticate a user via Google ID token (sign in or sign up)."""
    data = request.get_json()
    if not data or not data.get('credential'):
        return jsonify({"error": "Missing Google credential"}), 400

    credential = data['credential']

    try:
        # Verify the Google ID token via Google's tokeninfo endpoint
        resp = http_requests.get(
            GOOGLE_TOKENINFO_URL,
            params={'id_token': credential},
            timeout=10
        )

        if resp.status_code != 200:
            return jsonify({"error": "Invalid Google token"}), 401

        google_data = resp.json()
        email = google_data.get('email')
        name = google_data.get('name', email.split('@')[0] if email else 'User')
        
        if not email:
            return jsonify({"error": "Could not retrieve email from Google"}), 400

        # Check if user already exists
        user = User.query.filter_by(email=email).first()

        if user:
            # Existing user — link to Google if not already
            if user.auth_provider == 'local':
                user.auth_provider = 'google'
                db.session.commit()
        else:
            # Create new user via Google
            user = User(name=name, email=email, auth_provider='google')
            db.session.add(user)
            db.session.commit()

        token = create_access_token(identity=str(user.id))

        return jsonify({
            "message": "Google authentication successful",
            "data": {
                "token": token,
                "user": user.to_dict()
            }
        }), 200

    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Google verification timed out"}), 504
    except Exception as e:
        db.session.rollback()
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

