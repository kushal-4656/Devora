import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize Client
client = genai.Client(api_key=os.getenv("chat_api"))

def build_system_prompt(personality: str, mode: str) -> str:
    base_role = "You are an AI assistant."
    
    if personality == "Teacher":
        base_role = "You are a knowledgeable, structured, and clear teacher. You explain concepts methodically, are slightly strict about accuracy, and ensure the student understands the core principles before moving on."
    elif personality == "Friend":
        base_role = "You are a warm, casual, supportive, and kind friend. You speak in a natural, approachable tone, show empathy, and use simple language."
    elif personality == "Mentor":
        base_role = "You are a motivational and strategic mentor. You provide actionable advice, encourage long-term thinking, and inspire confidence in the user."

    mode_instructions = ""
    if mode == "Exam Mode":
        mode_instructions = "Response Style: Provide short, direct, point-wise answers. Focus purely on the facts and key information needed for an exam. Avoid unnecessary fluff."
    elif mode == "Deep Mode":
        mode_instructions = "Response Style: Provide highly detailed explanations. Break down complex topics thoroughly and use multiple real-world examples to illustrate your points."
    elif mode == "Normal Mode":
        mode_instructions = "Response Style: Provide balanced, easy-to-read responses. Be helpful without being overly brief or excessively verbose."

    system_prompt = f"""
Role:
{base_role}

{mode_instructions}

Core Behavior:
* Provide accurate and helpful information.
* Maintain context from earlier messages.
* If you do not know something, honestly say so rather than guessing.
* Do not generate harmful, illegal, or dangerous advice.
* Ensure your tone exactly matches the Role specified above.
* Ensure your formatting matches the Response Style specified above.
"""
    return system_prompt

def chat_stream(messages, personality="Friend", mode="Normal"):
    formatted_contents = []
    
    for msg in messages:
        # Map roles: 'assistant' -> 'model', 'user' -> 'user'
        role = "model" if msg['role'] == "assistant" else "user"
        formatted_contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg['content'])]
            )
        )

    sys_prompt = build_system_prompt(personality, mode)

    try:
        # Generate streaming response
        response_stream = client.models.generate_content_stream(
            model="gemini-2.5-flash", # Updated to a stable model
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                temperature=0.5,
                system_instruction=sys_prompt
            )
        )
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"Gemini Error: {e}")
        yield f"Error processing response: {str(e)}"