import io
import os
import json
import re
import numpy as np
import tensorflow as tf
import PIL.Image
import google.generativeai as genai

# =========================
# CONSTANTS
# =========================
DISEASE_CLASSES = [
    'Healthy', 'Citrus_Canker', 'Black_Spot',
    'Nutrient_Deficiency', 'Multiple_Diseases', 'Rotten'
]

RIPENESS_CLASSES = ['Unripe', 'Near_Ripe', 'Ripe', 'Overripe']
CONFIDENCE_THRESHOLD = 0.70


# =========================
# IMAGE PREPROCESSING
# =========================
def preprocess_image(image_input) -> np.ndarray:
    if isinstance(image_input, bytes):
        img = PIL.Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        img = PIL.Image.open(image_input)
    elif isinstance(image_input, PIL.Image.Image):
        img = image_input
    else:
        img = PIL.Image.fromarray(image_input)

    img = img.convert('RGB')
    img = img.resize((224, 224), PIL.Image.LANCZOS)

    img_array = np.array(img, dtype=np.float32)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


# =========================
# LOCAL MODEL PREDICTION
# =========================
def predict_local(image_input, model) -> dict:
    img_array = preprocess_image(image_input)
    outputs = model.predict(img_array, verbose=0)

    if isinstance(outputs, dict):
        disease_probs = outputs['disease'][0]
        quality_raw = float(outputs['quality_score'][0][0])
        shelf_raw = float(outputs['shelf_life'][0][0])
        ripeness_probs = outputs['ripeness'][0]
    else:
        disease_probs = outputs[0][0]
        quality_raw = float(outputs[1][0][0])
        shelf_raw = float(outputs[2][0][0])
        ripeness_probs = outputs[3][0]

    disease_idx = int(np.argmax(disease_probs))
    disease = DISEASE_CLASSES[disease_idx]
    disease_confidence = float(disease_probs[disease_idx])

    quality_score = float(np.clip(quality_raw * 9 + 1, 1.0, 10.0))
    shelf_life_days = int(np.clip(round(shelf_raw * 30), 1, 30))
    estimated_age_days = max(1, 30 - shelf_life_days)

    ripeness_idx = int(np.argmax(ripeness_probs))
    ripeness_stage = RIPENESS_CLASSES[ripeness_idx]

    return {
        'disease': disease,
        'disease_confidence': round(disease_confidence, 4),
        'quality_score': round(quality_score, 1),
        'shelf_life_days': shelf_life_days,
        'estimated_age_days': estimated_age_days,
        'ripeness_stage': ripeness_stage,
        'model_used': 'local_mtl',
        'fallback_used': False,
        'gemini_report': None
    }


# =========================
# GEMINI PROMPT
# =========================
def build_gemini_prompt(disease_name, confidence, quality, shelf, ripeness):
    return f"""
Analyze this orange leaf image like an expert agricultural scientist.

Detected:
- Disease: {disease_name}
- Confidence: {confidence*100:.1f}%
- Quality: {quality}/10
- Shelf life: {shelf} days
- Ripeness: {ripeness}

Return ONLY valid JSON:

{{
  "disease_name": "",
  "severity": "",
  "description": "",
  "treatment": "",
  "prevention": ""
}}
"""


# =========================
# GEMINI CALL
# =========================
def call_gemini_vision(image_input, disease_name, local_result=None):
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    if not GEMINI_API_KEY:
        return {"error": "Missing Gemini API Key"}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Load image
    if isinstance(image_input, bytes):
        pil_img = PIL.Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        pil_img = PIL.Image.open(image_input)
    elif isinstance(image_input, PIL.Image.Image):
        pil_img = image_input
    else:
        pil_img = PIL.Image.fromarray(image_input)

    disease = local_result['disease'] if local_result else 'Unknown'
    confidence = local_result.get('disease_confidence', 0)
    quality = local_result.get('quality_score', 5.0)
    shelf = local_result.get('shelf_life_days', 14)
    ripeness = local_result.get('ripeness_stage', 'Unknown')

    prompt = build_gemini_prompt(disease, confidence, quality, shelf, ripeness)

    try:
        response = model.generate_content([pil_img, prompt])
        text = response.text

        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())

        return json.loads(text)

    except Exception as e:
        return {"error": str(e)}


# =========================
# FINAL PIPELINE
# =========================
def get_full_prediction(image_input, model, force_gemini=False):
    local_result = predict_local(image_input, model)

    confidence = local_result['disease_confidence']
    disease = local_result['disease']

    needs_gemini = (
        force_gemini or
        confidence < CONFIDENCE_THRESHOLD or
        disease == "Multiple_Diseases"
    )

    if needs_gemini:
        gemini_result = call_gemini_vision(image_input, disease, local_result)

        local_result['fallback_used'] = True
        local_result['gemini_report'] = gemini_result
        local_result['model_used'] = 'gemini_fallback'

        if gemini_result and 'disease_name' in gemini_result:
            local_result['disease'] = gemini_result['disease_name']

    return local_result