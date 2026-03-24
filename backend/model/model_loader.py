import io
import os
import shutil
import logging
import numpy as np
from PIL import Image

# ==============================
# GLOBAL STATE
# ==============================
model        = None
model_loaded = False

# ==============================
# CONFIG
# ==============================
HF_REPO_ID          = "anujparwal09/dr-orange-model"
MODEL_FILENAME      = "orange_mtl_model.h5"
FALLBACK_FILENAME   = "orange_mtl_model.keras"

# Where to cache the model on Render's disk
LOCAL_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    MODEL_FILENAME
)
FALLBACK_LOCAL_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    FALLBACK_FILENAME
)

# ==============================
# CLASS LABELS — must match training order exactly
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
# LOAD MODEL
# ==============================
def load_model_once(model_path: str = None):
    """
    Load the Keras MTL model exactly once.

    Priority order for finding the model file:
      1. model_path argument  (passed from app.py if needed)
      2. MODEL_PATH env var   (set in Render dashboard)
      3. LOCAL_MODEL_PATH     (same folder as this file)
      4. Auto-download from Hugging Face
    """
    global model, model_loaded

    if model_loaded and model is not None:
        logging.info("✅ Model already loaded — skipping")
        return True

    import tensorflow as tf

    # ── Resolve the final path ─────────────────────────────────────────────
    resolved_path = (
        model_path
        or os.environ.get("MODEL_PATH")
        or LOCAL_MODEL_PATH
    )

    # fallback to .keras file if H5 is missing locally
    if not os.path.exists(resolved_path) and os.path.exists(FALLBACK_LOCAL_MODEL_PATH):
        logging.warning(f"⚠️  Primary model not found at {resolved_path}, falling back to {FALLBACK_LOCAL_MODEL_PATH}")
        resolved_path = FALLBACK_LOCAL_MODEL_PATH

    logging.info(f"🔍 Resolved model path: {resolved_path}")
    logging.info(f"📂 Checking if file exists at: {resolved_path}")

    # ── Download from Hugging Face if file is missing ──────────────────────
    if not os.path.exists(resolved_path):
        logging.info(f"⚠️  Model not found at {resolved_path}")
        logging.info(f"⬇️  Attempting download from HuggingFace: {HF_REPO_ID}/{MODEL_FILENAME}")

        try:
            from huggingface_hub import hf_hub_download

            downloaded_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=MODEL_FILENAME,
                local_dir=os.path.dirname(os.path.abspath(resolved_path))
            )

            # hf_hub_download with local_dir already places the file correctly
            # but if it landed somewhere else, copy it
            if os.path.abspath(downloaded_path) != os.path.abspath(resolved_path):
                os.makedirs(os.path.dirname(os.path.abspath(resolved_path)), exist_ok=True)
                shutil.copy2(downloaded_path, resolved_path)

            logging.info(f"✅ Model downloaded to: {resolved_path}")
            logging.info(f"📊 File size: {os.path.getsize(resolved_path) / (1024*1024):.1f} MB")

        except Exception as e:
            logging.error(f"❌ Hugging Face download failed for H5: {type(e).__name__}: {e}")
            # Attempt fallback download with .keras format
            try:
                logging.info(f"⬇️  Attempting fallback download from HuggingFace: {HF_REPO_ID}/{FALLBACK_FILENAME}")
                downloaded_path = hf_hub_download(
                    repo_id=HF_REPO_ID,
                    filename=FALLBACK_FILENAME,
                    local_dir=os.path.dirname(os.path.abspath(resolved_path))
                )
                if os.path.abspath(downloaded_path) != os.path.abspath(resolved_path):
                    os.makedirs(os.path.dirname(os.path.abspath(resolved_path)), exist_ok=True)
                    shutil.copy2(downloaded_path, resolved_path)
                logging.info(f"✅ Fallback model downloaded to: {resolved_path}")
            except Exception as e2:
                logging.error(f"❌ Fallback download failed as well: {type(e2).__name__}: {e2}")
                model_loaded = False
                return False

    # ── Verify file exists before loading ────────────────────────────────
    if not os.path.exists(resolved_path):
        logging.error(f"❌ Model file still missing after download attempt: {resolved_path}")
        model_loaded = False
        return False

    try:
        file_mb = os.path.getsize(resolved_path) / (1024 * 1024)
        logging.info(f"🚀 Loading Keras model: {resolved_path} ({file_mb:.1f} MB)...")

        model = tf.keras.models.load_model(
            resolved_path,
            compile=False
        )
        model_loaded = True

        # Recompile for inference/consistency with training configuration
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss={
                'disease': 'categorical_crossentropy',
                'quality_score': 'mse',
                'shelf_life': 'mse',
                'ripeness': 'categorical_crossentropy'
            },
            loss_weights={
                'disease': 1.0,
                'quality_score': 0.5,
                'shelf_life': 0.3,
                'ripeness': 0.7
            }
        )

        output_names = [o.name for o in model.outputs]
        logging.info(f"✅ Model successfully loaded")
        logging.info(f"📊 Model outputs: {output_names}")
        logging.info(f"📐 Input shape: {model.input_shape}")
        return True

    except Exception as e:
        logging.error(f"❌ Model load failed: {type(e).__name__}: {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        model_loaded = False
        return False


def get_model():
    """Return the loaded model. Call load_model_once() first."""
    return model


# ==============================
# IMAGE PREPROCESSING
# ==============================
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Resize to 224×224, apply MobileNetV2 preprocessing,
    return shape (1, 224, 224, 3).
    """
    import tensorflow as tf

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224), Image.Resampling.LANCZOS)

    img_array = np.array(img, dtype=np.float32)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

    return np.expand_dims(img_array, axis=0)   # → (1, 224, 224, 3)


# ==============================
# REAL MODEL PREDICTION
# ==============================
def real_predict(image_bytes: bytes) -> dict:
    global model

    try:
        img_array = preprocess_image(image_bytes)
        outputs   = model.predict(img_array, verbose=0)

        # ── Unpack outputs — handles both dict and list format ─────────────
        if isinstance(outputs, dict):
            disease_probs  = np.array(outputs["disease"][0])
            quality_raw    = float(outputs["quality_score"][0][0])
            shelf_raw      = float(outputs["shelf_life"][0][0])
            ripeness_probs = np.array(outputs["ripeness"][0])
        else:
            disease_probs  = np.array(outputs[0][0])
            quality_raw    = float(outputs[1][0][0])
            shelf_raw      = float(outputs[2][0][0])
            ripeness_probs = np.array(outputs[3][0])

        # ── Disease ────────────────────────────────────────────────────────
        disease_idx  = int(np.argmax(disease_probs))

        # Guard against index out of range
        if disease_idx >= len(DISEASE_CLASSES):
            disease_idx = 0

        disease    = DISEASE_CLASSES[disease_idx]
        confidence = round(float(disease_probs[disease_idx]) * 100, 2)

        all_probabilities = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(DISEASE_CLASSES, disease_probs)
        }

        logging.info(f"🔍 Disease: {disease} ({confidence:.2f}%)")

        # ── Quality score  (sigmoid output 0–1 → scale to 1–10) ───────────
        quality_score = round(float(np.clip(quality_raw * 9 + 1, 1.0, 10.0)), 2)

        # ── Shelf life  (regression output 0–1 → scale to 1–30 days) ──────
        shelf_life_days    = int(np.clip(round(shelf_raw * 30), 1, 30))
        estimated_age_days = max(1, 30 - shelf_life_days)

        # ── Ripeness ───────────────────────────────────────────────────────
        ripeness_idx = int(np.argmax(ripeness_probs))

        if ripeness_idx >= len(RIPENESS_CLASSES):
            ripeness_idx = 0

        ripeness_stage = RIPENESS_CLASSES[ripeness_idx]

        ripeness_probabilities = {
            cls: round(float(p) * 100, 2)
            for cls, p in zip(RIPENESS_CLASSES, ripeness_probs)
        }

        return {
            "disease":                disease,
            "disease_confidence":     confidence,
            "all_probabilities":      all_probabilities,
            "quality_score":          quality_score,
            "shelf_life_days":        shelf_life_days,
            "estimated_age_days":     estimated_age_days,
            "ripeness_stage":         ripeness_stage,
            "ripeness_probabilities": ripeness_probabilities,
            "model_used":             "ml_model"
        }

    except Exception as e:
        logging.error(f"❌ Prediction error: {e}")
        return mock_predict()


# ==============================
# MOCK FALLBACK
# ==============================
def mock_predict() -> dict:
    """
    Returns realistic fake data when the model isn't loaded.
    Used during development or if the model file is missing on Render.
    """
    logging.warning("⚠️  Using mock prediction — model not loaded")

    return {
        "disease":            "Citrus_Canker",
        "disease_confidence": 94.2,
        "all_probabilities": {
            "Healthy":              2.1,
            "Citrus_Canker":        94.2,
            "Black_Spot":           1.8,
            "Nutrient_Deficiency":  1.2,
            "Multiple_Diseases":    0.5,
            "Rotten":               0.2
        },
        "quality_score":          7.4,
        "shelf_life_days":        14,
        "estimated_age_days":     8,
        "ripeness_stage":         "Ripe",
        "ripeness_probabilities": {
            "Unripe":    3.0,
            "Near_Ripe": 12.0,
            "Ripe":      79.0,
            "Overripe":  6.0
        },
        "model_used": "mock"
    }


# ==============================
# MAIN ENTRY — called from routes
# ==============================
def get_prediction(image_bytes: bytes) -> dict:
    """
    Main function called by /api/predict route.
    Auto-loads the model if not already loaded.
    Falls back to mock if loading fails.
    """
    global model_loaded

    if not model_loaded:
        load_model_once()

    if model_loaded and model is not None:
        return real_predict(image_bytes)
    else:
        logging.warning("Model not available — returning mock prediction")
        return mock_predict()