import os
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types

api_key = os.environ.get('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

config = types.GenerateContentConfig(
    system_instruction="You are a helpful assistant."
)

history = [
    types.Content(role="user", parts=[types.Part.from_text(text="Hello!")]),
    types.Content(role="model", parts=[types.Part.from_text(text="Hi! How can I help?")])
]

try:
    chat = client.chats.create(model="gemini-1.5-flash", config=config, history=history)
    response = chat.send_message("What is 2+2?")
    print("CHAT SUCCESS:", response.text)
except Exception as e:
    print("CHAT ERROR:", e)

try:
    contents = history + [types.Content(role="user", parts=[types.Part.from_text(text="What is 2+2?")])]
    response2 = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=contents,
        config=config
    )
    print("GENERATE SUCCESS:", response2.text)
except Exception as e:
    print("GENERATE ERROR:", e)
