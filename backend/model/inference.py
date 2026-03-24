import io
import os
import json
import re
import numpy as np
import tensorflow as tf
from PIL import Image
from google import genai
from google.genai import types

# ---------------- CONFIG ----------------
DISEASE_CLASSES = [
    'Healthy', 'Citrus_Canker', 'Black_Spot',
    'Nutrient_Deficiency', 'Multiple_Diseases', 'Rotten'
]

RIPENESS_CLASSES = ['Unripe', 'Near_Ripe', 'Ripe', 'Overripe']

CONFIDENCE_THRESHOLD = 0.70


# ---------------- IMAGE PREPROCESS ----------------
def preprocess_image(image_input) -> np.ndarray:
    if isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        img = Image.open(image_input)
    elif isinstance(image_input, Image.Image):
        img = image_input
    else:
        img = Image.fromarray(image_input)

    img = img.convert('RGB')
    img = img.resize((224, 224), Image.Resampling.LANCZOS)

    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


# ---------------- LOCAL MODEL PREDICTION ----------------
def predict_local(image_input, model) -> dict:
    img_array = preprocess_image(image_input)
    outputs = model.predict(img_array, verbose=0)
    
    # 🎯 TASK 6: DEBUG LOGGING 
    print("================== ML DEBUG ==================")
    print("Raw Model Prediction:", outputs)

    # Handle both dict and list outputs
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

    # Disease
    disease_idx = int(np.argmax(disease_probs))
    disease = DISEASE_CLASSES[disease_idx]
    disease_confidence = float(np.max(disease_probs))
    
    print("Predicted Class Index:", disease_idx)
    print("Predicted Disease  :", disease)
    print("Confidence        :", disease_confidence)
    print("==============================================")

    # Quality (0-1 → 1-10)
    quality_score = float(np.clip(round(quality_raw * 9 + 1, 1), 1.0, 10.0))

    # Shelf life (0-1 → days)
    shelf_life_days = int(np.clip(round(shelf_raw * 30), 1, 30))

    estimated_age_days = max(1, 30 - shelf_life_days)

    # Ripeness
    ripeness_idx = int(np.argmax(ripeness_probs))
    ripeness_stage = RIPENESS_CLASSES[ripeness_idx]

    return {
        "disease": disease,
        "disease_confidence": round(disease_confidence, 4),
        "all_probabilities": {
            cls: round(float(p), 4)
            for cls, p in zip(DISEASE_CLASSES, disease_probs)
        },
        "quality_score": quality_score,
        "shelf_life_days": shelf_life_days,
        "estimated_age_days": estimated_age_days,
        "ripeness_stage": ripeness_stage,
        "ripeness_probabilities": {
            cls: round(float(p), 4)
            for cls, p in zip(RIPENESS_CLASSES, ripeness_probs)
        },
        "model_used": "local_mtl",
        "fallback_used": False,
        "gemini_report": None
    }


# ---------------- GEMINI PROMPT ----------------
def build_gemini_prompt(disease_name, confidence, quality_score, shelf_life_days, ripeness_stage, override_disease=True):
    if override_disease:
        condition_note = ""
        if disease_name in ["Rotten", "Multiple_Diseases"]:
            condition_note = f"\nNote: The ML model classified this as '{disease_name}'. Please analyze the image to identify the SPECIFIC underlying disease (e.g., Green Mold, Blue Mold, Sour Rot, Phytophthora, etc.) causing this condition."

        return f"""
You are an expert citrus pathologist.

Initial ML Detection:
- Classification: {disease_name}
- Confidence: {confidence*100:.1f}%
- Quality: {quality_score}/10
- Shelf Life: {shelf_life_days} days
- Ripeness: {ripeness_stage}{condition_note}

Based on the provided image and these metrics, identify the precise disease.
Return ONLY valid JSON:

{{
  "disease_name": "Specific disease name (do not just say Rotten)",
  "severity_level": "Low/Medium/High/Critical",
  "overview": "Detailed explanation of the condition and visible symptoms.",
  "treatment": ["step1", "step2"],
  "prevention": ["tip1", "tip2"]
}}
"""
    else:
        return f"""
You are an expert citrus pathologist.
The crop has been confirmed to have the following condition: {disease_name}.
- Quality: {quality_score}/10
- Shelf Life: {shelf_life_days} days
- Ripeness: {ripeness_stage}

Please provide a detailed summary and treatment plan for {disease_name} based on the visible severity in the image.
Return ONLY valid JSON:

{{
  "disease_name": "{disease_name}",
  "severity_level": "Low/Medium/High/Critical",
  "overview": "Detailed explanation of the condition and visible symptoms.",
  "treatment": ["step1", "step2"],
  "prevention": ["tip1", "tip2"]
}}
"""


# ---------------- GEMINI CALL ----------------
def call_gemini_vision(image_input, local_result, override_disease):
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        if isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, str):
            img = Image.open(image_input)
        else:
            img = image_input

        prompt = build_gemini_prompt(
            local_result['disease'],
            local_result['disease_confidence'],
            local_result['quality_score'],
            local_result['shelf_life_days'],
            local_result['ripeness_stage'],
            override_disease
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[img, prompt]
        )

        text = response.text

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())

        return {"error": "Invalid JSON from Gemini"}

    except Exception as e:
        return {"error": str(e)}


# ---------------- FINAL PIPELINE ----------------
def get_full_prediction(image_input, model, force_gemini=False):
    local_result = predict_local(image_input, model)

    confidence = local_result['disease_confidence']
    disease = local_result['disease']

    # Decide if Gemini should be called
    # Only call Gemini if:
    # 1. confidence is low (below threshold), OR
    # 2. disease needs clarification (Multiple_Diseases, Rotten, Unknown), OR
    # 3. force_gemini is True (dev/override mode)
    should_call_gemini = (
        force_gemini or
        confidence < CONFIDENCE_THRESHOLD or
        disease in ["Multiple_Diseases", "Rotten", "Unknown"]
    )
    
    print(f"🔍 Gemini decision: confidence={confidence:.4f}, threshold={CONFIDENCE_THRESHOLD}, should_call={should_call_gemini}")

    gemini_report = None
    if should_call_gemini:
        print(f"📞 Calling Gemini for: {disease} (confidence={confidence:.4f})")
        gemini_report = call_gemini_vision(image_input, local_result, confidence < CONFIDENCE_THRESHOLD)
        
        # Process valid Gemini results
        if gemini_report and "error" not in gemini_report:
            # For Rotten/Multiple_Diseases: ALWAYS use Gemini's specific disease name (not just low confidence)
            if disease in ["Rotten", "Multiple_Diseases"]:
                local_result["disease"] = gemini_report.get("disease_name", disease)
                local_result["fallback_used"] = True
                local_result["model_used"] = "gemini_vision"
            elif confidence < CONFIDENCE_THRESHOLD:
                # Low confidence: Override with Gemini's disease
                local_result["disease"] = gemini_report.get("disease_name", disease)
                local_result["fallback_used"] = True
                local_result["model_used"] = "gemini_vision"
            else:
                # Medium-high confidence: Keep local disease, just append the rich summary
                local_result["fallback_used"] = False
            
            local_result["gemini_report"] = gemini_report
            local_result["gemini_used"] = True
        else:
            print(f"⚠️ Gemini failed: {gemini_report}")
            local_result["gemini_used"] = False
            local_result["gemini_report"] = None
    else:
        # Confidence is high and disease is clear: Skip Gemini
        print(f"⏭️ Skipping Gemini: confidence is high ({confidence:.4f} >= {CONFIDENCE_THRESHOLD})")
        local_result["gemini_used"] = False
        local_result["gemini_report"] = None
        # Generate basic treatment from disease knowledge
        local_result["fallback_used"] = False

    return local_result