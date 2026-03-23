import io
import os
import numpy as np
from PIL import Image

# ==============================
# GLOBAL MODEL
# ==============================
model = None
model_loaded = False

# ==============================
# CLASS LABELS (MUST MATCH TRAINING)
# ==============================
DISEASE_CLASSES = [
    "Healthy",
    "Citrus_Canker",
    "Black_Spot",
    "Nutrient_Deficiency",
    "Multiple_Diseases",
    "Rotten"
]

RIPENESS_CLASSES = ["Unripe", "Near_Ripe", "Ripe", "Overripe"]

# ==============================
# LOAD MODEL (ONLY ONCE)
# ==============================
def load_model_once(model_path: str = None) -> bool:
    global model, model_loaded

    try:
        import tensorflow as tf

        # Default path (auto-detect inside backend/model/)
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__),
                "orange_mtl_model.keras"
            )

        if model is None:
            print("🚀 Loading ML model...")
            model = tf.keras.models.load_model(model_path)
            model_loaded = True
            print(f"✅ Model loaded from {model_path}")

    except FileNotFoundError:
        print("⚠️ Model not found — using mock predictions")
        model_loaded = False

    except Exception as e:
        print(f"❌ Model load error: {e}")
        model_loaded = False

    return model_loaded


# ==============================
# IMAGE PREPROCESSING
# ==============================
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    import tensorflow as tf

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224), Image.Resampling.LANCZOS)

    img_array = np.array(img, dtype=np.float32)

    # 🔥 IMPORTANT: MobileNetV2 preprocessing
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

    img_array = np.expand_dims(img_array, axis=0)
    return img_array


# ==============================
# REAL MODEL PREDICTION
# ==============================
def real_predict(image_bytes: bytes) -> dict:
    global model

    try:
        img_array = preprocess_image(image_bytes)
        outputs = model.predict(img_array, verbose=0)

        # Handle MTL outputs (dict OR list)
        if isinstance(outputs, dict):
            disease_probs  = outputs["disease"][0]
            quality_raw    = float(outputs["quality_score"][0][0])
            shelf_raw      = float(outputs["shelf_life"][0][0])
            ripeness_probs = outputs["ripeness"][0]
        else:
            disease_probs  = outputs[0][0]
            quality_raw    = float(outputs[1][0][0])
            shelf_raw      = float(outputs[2][0][0])
            ripeness_probs = outputs[3][0]

        # ==============================
        # DISEASE
        # ==============================
        disease_idx = int(np.argmax(disease_probs))
        disease = DISEASE_CLASSES[disease_idx]
        disease_confidence = float(disease_probs[disease_idx]) * 100

        all_probabilities = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(DISEASE_CLASSES, disease_probs)
        }

        # ==============================
        # QUALITY
        # ==============================
        quality_score = round(float(quality_raw) * 9 + 1, 1)
        quality_score = float(np.clip(quality_score, 1.0, 10.0))

        # ==============================
        # SHELF LIFE
        # ==============================
        shelf_life_days = int(round(float(shelf_raw) * 30))
        shelf_life_days = int(np.clip(shelf_life_days, 1, 30))

        estimated_age_days = max(1, 30 - shelf_life_days)

        # ==============================
        # RIPENESS
        # ==============================
        ripeness_idx = int(np.argmax(ripeness_probs))
        ripeness_stage = RIPENESS_CLASSES[ripeness_idx]

        ripeness_probabilities = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(RIPENESS_CLASSES, ripeness_probs)
        }

        # ==============================
        # FINAL RESPONSE
        # ==============================
        return {
            "disease": disease,
            "disease_confidence": round(disease_confidence, 2),
            "all_probabilities": all_probabilities,
            "quality_score": quality_score,
            "shelf_life_days": shelf_life_days,
            "estimated_age_days": estimated_age_days,
            "ripeness_stage": ripeness_stage,
            "ripeness_probabilities": ripeness_probabilities,
            "model_used": "local_mtl"
        }

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return mock_predict()


# ==============================
# MOCK FALLBACK
# ==============================
def mock_predict() -> dict:
    return {
        "disease": "Citrus_Canker",
        "disease_confidence": 94.2,
        "all_probabilities": {
            "Healthy": 2.1,
            "Citrus_Canker": 94.2,
            "Black_Spot": 1.8,
            "Nutrient_Deficiency": 1.2,
            "Multiple_Diseases": 0.5,
            "Rotten": 0.2
        },
        "quality_score": 7.4,
        "shelf_life_days": 14,
        "estimated_age_days": 8,
        "ripeness_stage": "Ripe",
        "ripeness_probabilities": {
            "Unripe": 3.0,
            "Near_Ripe": 12.0,
            "Ripe": 79.0,
            "Overripe": 6.0
        },
        "model_used": "mock"
    }


# ==============================
# MAIN ENTRY FUNCTION
# ==============================
def get_prediction(image_bytes: bytes) -> dict:
    if model_loaded:
        return real_predict(image_bytes)
    else:
        return mock_predict()