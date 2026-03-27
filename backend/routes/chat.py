from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Conversation, ChatMessage
from extensions import db
from google import genai
from google.genai import types

chat_bp = Blueprint('chat', __name__)

SYSTEM_PROMPT = """You are Dr. Orange, an expert AI assistant for 
orange farming and citrus disease management. 

You are an expert agricultural assistant. Always format responses in clean Markdown:
* Use headings (##, ###)
* Use bullet points
* Use numbered lists when needed
* Highlight important terms using **bold**
* Keep responses clean and readable
* Avoid long paragraphs
* Use spacing properly

Your expertise covers:
- Orange diseases: Citrus Canker (Xanthomonas citri), Melanose (Diaporthe citri), Huanglongbing/Greening (Candidatus Liberibacter), Black Spot (Phyllosticta citricarpa)
- Quality grading: APEDA standards, export grading A/B/C, Brix levels
- Shelf life optimization and post-harvest management
- Nagpur mandarin (Citrus reticulata) farming in Maharashtra
- Organic farming techniques and IPM for citrus
- Indian agriculture context: climate, seasons, local treatments

Communication style:
- Keep responses under 200 words
- Be practical and farmer-friendly
- Use simple English with occasional Hindi words for familiarity
- Reference Maharashtra/Nagpur context when relevant
- For disease treatments, always recommend consulting local agriculture officers for official guidance
- Never provide medical advice for humans
"""

FALLBACK_RESPONSES = {
    "canker": "Citrus Canker is caused by Xanthomonas citri bacteria. It forms raised, corky lesions. Immediate treatment with copper-based bactericides (like 1% Bordeaux mixture) is recommended.",
    "melanose": "Melanose is a fungal disease causing small, dark, raised scab-like spots. Treat with carbendazim or mancozeb during the spring flush period.",
    "greening": "Greening (Huanglongbing) is a severe bacterial disease spread by psyllid insects. Uproot infected plants immediately and use imidacloprid to control vectors.",
    "black spot": "Black Spot is fungal. Remove affected fruits and maintain grove hygiene. Use copper-based fungicides regularly.",
    "default": "Namaste! I am Dr. Orange. I specialize in orange diseases, harvest timing, and post-harvest quality. How can I help with your citrus farm today?"
}

@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())
    convs = Conversation.query.filter_by(user_id=user_id).order_by(
        Conversation.updated_at.desc().nullslast(),
        Conversation.created_at.desc()
    ).all()
    return jsonify({"conversations": [c.to_dict() for c in convs]}), 200

@chat_bp.route('/conversation', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    title = data.get('title', 'New Chat')
    
    conv = Conversation(user_id=user_id, title=title)
    db.session.add(conv)
    db.session.commit()
    return jsonify({"conversation": conv.to_dict()}), 201

@chat_bp.route('/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_chat_history(conversation_id):
    user_id = int(get_jwt_identity())
    conv = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
        
    messages = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at.asc()).all()
    return jsonify({
        "conversation": conv.to_dict(),
        "messages": [m.to_dict() for m in messages]
    }), 200

@chat_bp.route('/<int:conversation_id>', methods=['POST'])
@jwt_required()
def chat_with_history(conversation_id):
    user_id = int(get_jwt_identity())
    
    conv = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
        
    if request.is_json:
        message = (request.get_json() or {}).get("message", "").strip()
    else:
        message = request.form.get("message", "").strip()

    images = request.files.getlist("images")
    if len(images) > 3:
        return jsonify({"error": "Maximum 3 images allowed", "code": "TOO_MANY_IMAGES"}), 400

    if not message and not images:
        return jsonify({"error": "Message or images required", "code": "MISSING_INPUT"}), 400

    if len(message) > 1000:
        return jsonify({"error": "Message too long (max 1000 chars)", "code": "MESSAGE_TOO_LONG"}), 400

    import os
    import io
    from PIL import Image
    from werkzeug.utils import secure_filename

    upload_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'chat_images')
    os.makedirs(upload_folder, exist_ok=True)
    
    image_parts = []
    
    for img in images:
        if img.filename:
            filename = secure_filename(img.filename)
            filepath = os.path.join(upload_folder, f"{conversation_id}_{filename}")
            img.save(filepath)
            pil_img = Image.open(filepath)
            image_parts.append(pil_img)

    api_key = current_app.config.get('GEMINI_API_KEY')
    print(f"📩 Chat request for conversation {conversation_id}")
    print(f"📩 Message: {message[:50]}...")
    print(f"🔑 API Key present: {bool(api_key)}")

    # Update title if it's "New Chat"
    title_source = message if message else "Image analysis"
    if conv.title == "New Chat":
        conv.title = title_source[:40] + ("..." if len(title_source) > 40 else "")

    reply = ""

    if not api_key:
        print("⚠️ No GEMINI_API_KEY found in config. Using fallback.")
        reply = handle_fallback_text(message)
    else:
        try:
            print("🚀 Calling Gemini API (gemini-1.5-flash)...")
            client = genai.Client(api_key=api_key)
            
            # Using the official google-genai SDK 
            
            # Build previous history from DB (latest 10 message pairs)
            db_messages = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at.asc()).all()
            gemini_history = []
            for m in db_messages[-10:]:
                gemini_history.append(types.Content(role="user", parts=[types.Part.from_text(text=m.message)]))
                gemini_history.append(types.Content(role="model", parts=[types.Part.from_text(text=m.response)]))

            # Start chat with history
            chat_config = types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7
            )
            chat = client.chats.create(model="gemini-2.5-flash", config=chat_config, history=gemini_history)
            
            contents = image_parts + [message] if message else image_parts
            response = chat.send_message(contents)
            
            if response and response.text:
                reply = response.text
                print(f"✅ Gemini response received ({len(reply)} chars)")
            else:
                print("⚠️ Gemini returned empty response. Using fallback.")
                reply = handle_fallback_text(message)

        except Exception as e:
            print(f"❌ Gemini API error: {str(e)}")
            import traceback
            traceback.print_exc()
            current_app.logger.error(f"Gemini API error: {e}", exc_info=True)
            reply = f"⚠️ Error generating response: {str(e)}" if current_app.debug else handle_fallback_text(message)

    # Save to db & touch updated_at so conversation floats to top of sidebar
    from datetime import datetime as _dt
    db_msg_text = message if message else "[Image Uploaded]"
    chat_msg = ChatMessage(conversation_id=conversation_id, user_id=user_id, message=db_msg_text, response=reply)
    conv.updated_at = _dt.utcnow()
    db.session.add(chat_msg)
    db.session.commit()

    return jsonify({"response": reply, "message_id": chat_msg.id}), 200


def handle_fallback_text(message):
    message_lower = message.lower()
    for key, reply in FALLBACK_RESPONSES.items():
        if key in message_lower and key != "default":
            return reply
            
    return FALLBACK_RESPONSES["default"]
