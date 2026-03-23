import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Scan
from extensions import db
from sqlalchemy import func

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
@history_bp.route('/user/scans', methods=['GET'])
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Bound limit
    if limit > 100:
        limit = 100
        
    scans = Scan.query.filter_by(user_id=user_id)\
                      .order_by(Scan.scanned_at.desc())\
                      .limit(limit)\
                      .offset(offset)\
                      .all()
                      
    # Calculate Dashboard Stats
    total_scans = Scan.query.filter_by(user_id=user_id).count()
    
    diseases_found = Scan.query.filter(
        Scan.user_id == user_id,
        Scan.disease != 'Healthy'
    ).count()
    
    healthy = Scan.query.filter_by(
        user_id=user_id,
        disease='Healthy'
    ).count()
    
    avg_quality = db.session.query(func.avg(Scan.quality_score)).filter_by(user_id=user_id).scalar()
    avg_quality_val = round(float(avg_quality), 1) if avg_quality else 0.0
    
    return jsonify({
        "scans": [scan.to_dict() for scan in scans],
        "total": total_scans,
        "diseases_found": diseases_found,
        "healthy": healthy,
        "avg_quality": avg_quality_val,
        "limit": limit,
        "offset": offset
    }), 200


@history_bp.route('/history/<int:scan_id>', methods=['DELETE'])
@jwt_required()
def delete_scan(scan_id):
    user_id = int(get_jwt_identity())
    
    scan = Scan.query.filter_by(id=scan_id, user_id=user_id).first()
    
    if not scan:
        return jsonify({"error": "Scan not found or unauthorized", "code": "NOT_FOUND"}), 404
        
    # Attempt to delete the file
    if scan.image_path and os.path.exists(scan.image_path):
        try:
            os.remove(scan.image_path)
        except OSError as e:
            # We skip file removal errors but delete db row anyway
            print(f"Error removing file {scan.image_path}: {e}")
            
    try:
        db.session.delete(scan)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete scan", "code": "DB_ERROR"}), 500
        
    return jsonify({
        "deleted": True,
        "scan_id": scan_id
    }), 200
