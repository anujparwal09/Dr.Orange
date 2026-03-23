import io
import os
import numpy as np
from PIL import Image
from huggingface_hub import hf_hub_download

# ==============================
# GLOBAL MODEL
# ==============================
model = None
model_loaded = False

# ==============================
# CONFIG
# ==============================
HF_REPO_ID = "anujparwal09/dr-orange-model"
MODEL_FILENAME = "orange_mtl_model.keras"
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), MODEL_FILENAME)

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
# LOAD MODEL (AUTO DOWNLOAD)
# ==============================
def load_model_once():
    global model, model_loaded

    try:
        import tensorflow as tf

        # 📥 Download from Hugging Face if not exists
        if not os.path.exists(LOCAL_MODEL_PATH):
            print("⬇️ Downloading model from Hugging Face...")

            model_file = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=MODEL_FILENAME
            )

            os.makedirs(os.path.dirname(LOCAL_MODEL_PATH), exist_ok=True)
            os.replace(model_file, LOCAL_MODEL_PATH)

            print("✅ Model downloaded")

        # 🚀 Load model
        if model is None:
            print("🚀 Loading ML model...")
            model = tf.keras.models.load_model(LOCAL_MODEL_PATH)
            model_loaded = True
            print("✅ Model loaded successfully")

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

    # MobileNetV2 preprocessing
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

    return np.expand_dims(img_array, axis=0)


# ==============================
# REAL MODEL PREDICTION
# ==============================
def real_predict(image_bytes: bytes) -> dict:
    global model

    try:
        img_array = preprocess_image(image_bytes)

        outputs = model.predict(img_array, verbose=0)

        # Handle MTL outputs
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
        confidence = float(disease_probs[disease_idx]) * 100

        print(f"🔍 Prediction: {disease} ({confidence:.2f}%)")

        all_probabilities = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(DISEASE_CLASSES, disease_probs)
        }

        # ==============================
        # QUALITY
        # ==============================
        quality_score = float(np.clip(quality_raw * 9 + 1, 1, 10))

        # ==============================
        # SHELF LIFE
        # ==============================
        shelf_life_days = int(np.clip(round(shelf_raw * 30), 1, 30))
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

        return {
            "disease": disease,
            "disease_confidence": round(confidence, 2),
            "all_probabilities": all_probabilities,
            "quality_score": round(quality_score, 2),
            "shelf_life_days": shelf_life_days,
            "estimated_age_days": estimated_age_days,
            "ripeness_stage": ripeness_stage,
            "ripeness_probabilities": ripeness_probabilities,
            "model_used": "ml_model"
        }

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return mock_predict()


# ==============================
# MOCK FALLBACK
# ==============================
def mock_predict():
    print("⚠️ Using fallback prediction")

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
    if not model_loaded:
        load_model_once()

    if model_loaded:
        return real_predict(image_bytes)
    else:
        return mock_predict()