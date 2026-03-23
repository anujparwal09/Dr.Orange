from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Scan
from extensions import db

admin_bp = Blueprint('admin', __name__)

def is_admin(user_id):
    user = User.query.get(user_id)
    return user and user.role == "admin"

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    user_id = int(get_jwt_identity())
    if not is_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403
    users = User.query.all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200

@admin_bp.route('/scans', methods=['GET'])
@jwt_required()
def get_all_scans():
    user_id = int(get_jwt_identity())
    if not is_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403
    scans = Scan.query.order_by(Scan.scanned_at.desc()).all()
    return jsonify({"scans": [s.to_dict() for s in scans]}), 200

@admin_bp.route('/user/<int:user_to_delete_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_to_delete_id):
    user_id = int(get_jwt_identity())
    if not is_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403
    
    # Do not let admin delete themselves
    if user_to_delete_id == user_id:
        return jsonify({"error": "Cannot delete your own admin account"}), 400

    user = User.query.get(user_to_delete_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

@admin_bp.route('/scan/<int:scan_id>', methods=['DELETE'])
@jwt_required()
def delete_scan(scan_id):
    user_id = int(get_jwt_identity())
    if not is_admin(user_id):
        return jsonify({"error": "Admin access required"}), 403
    scan = Scan.query.get(scan_id)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    db.session.delete(scan)
    db.session.commit()
    return jsonify({"message": "Scan deleted"}), 200
