#!/usr/bin/env python3
"""
Quick diagnostic script to test backend predict endpoint
Run this locally to see what's actually happening
"""

import requests
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_local_backend():
    """Test backend running locally"""
    print("=" * 60)
    print("TESTING LOCAL BACKEND")
    print("=" * 60)
    
    # Test 1: Import and startup
    print("\n[1] Testing Flask app startup...")
    try:
        from backend.app import app, create_app
        print("[OK] Flask app imports successfully")
    except Exception as e:
        print(f"[ERROR] Flask app import failed: {e}")
        return False
    
    # Test 2: Model loading
    print("\n[2] Testing model loading...")
    try:
        from backend.model.model_loader import load_model_once, model_loaded
        print(f"   Current model_loaded state: {model_loaded}")
        
        result = load_model_once()
        print(f"   load_model_once() returned: {result}")
        
        from backend.model.model_loader import model
        if model is not None:
            print(f"[OK] Model loaded successfully")
            print(f"   Input shape: {model.input_shape}")
            print(f"   Outputs: {[o.name for o in model.outputs]}")
        else:
            print(f"[ERROR] Model is None after loading")
            return False
    except Exception as e:
        print(f"[ERROR] Model loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Health endpoint
    print("\n[3] Testing health endpoint...")
    try:
        with app.test_client() as client:
            response = client.get('/health')
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.get_json()}")
            if response.status_code == 200:
                print("[OK] Health endpoint returns 200")
            else:
                print(f"[WARN] Health endpoint returns {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Health endpoint test failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("ALL LOCAL TESTS PASSED")
    print("=" * 60)
    return True


def test_remote_backend(backend_url="https://dr-orange.onrender.com"):
    """Test backend running on Render"""
    print("\n" + "=" * 60)
    print(f"TESTING REMOTE BACKEND: {backend_url}")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n[1] Testing /health endpoint...")
    try:
        response = requests.get(f"{backend_url}/health", timeout=30)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            model_loaded = data.get('model_loaded')
            model_status = data.get('model_status')
            print(f"   Model loaded: {model_loaded}")
            print(f"   Model status: {model_status}")
            
            if not model_loaded:
                print(f"[WARN] Model is NOT loaded on Render!")
                if data.get('model_error'):
                    print(f"   Error: {data.get('model_error')}")
            else:
                print("[OK] Model is loaded on Render")
        else:
            print(f"[ERROR] Health endpoint returned {response.status_code}")
            print(f"   Response: {response.text[:500]}")
    except requests.Timeout:
        print(f"[ERROR] Request timed out (30s). Backend may be stuck loading model.")
    except requests.ConnectionError as e:
        print(f"[ERROR] Connection failed: {e}")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    print("\n[BACKEND DIAGNOSTICS]\n")
    
    # Test local first
    local_ok = test_local_backend()
    
    # Then test remote
    test_remote_backend()
    
    print("\n[TROUBLESHOOTING TIPS]:")
    print("   - If local tests pass but remote fails: Check Render environment variables")
    print("   - If model loading fails: Check if model file exists or can download from HuggingFace")
    print("   - If 502 error: Check Render logs for detailed error messages")
    print("   - Check that GEMINI_API_KEY is set in Render environment")
    print()
