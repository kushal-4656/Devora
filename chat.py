import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize Client
client = genai.Client(api_key=os.getenv("chat_api"))

def build_system_prompt(personality: str, mode: str, past_topics: list = None) -> str:
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

    topics_context = ""
    if past_topics and len(past_topics) > 0:
        topics_context = f"\nUser's Past Chat Topics: {', '.join(past_topics)}\nUse these past topics as context to personalize your responses when appropriate."

    system_prompt = f"""
Role:
{base_role}

{mode_instructions}
{topics_context}

Core Behavior:
* Provide accurate and helpful information.
* Maintain context from earlier messages.
* Content Filtering: If the user requests highly unsafe, illegal, erotic, or sexually explicit content, politely decline the request and state that you cannot provide such information.
* Multilingual Support: If the user speaks in a different language, reply fluently in that same language. Support multiple languages naturally.
* If you do not know something, honestly say so rather than guessing.
* Do not generate harmful, illegal, or dangerous advice.
* Ensure your tone exactly matches the Role specified above.
* Ensure your formatting matches the Response Style specified above.
"""
    return system_prompt

def chat_stream(messages, personality="Friend", mode="Normal", past_topics=None):
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

    sys_prompt = build_system_prompt(personality, mode, past_topics)

    try:
        # Generate streaming response with safety settings
        response_stream = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                temperature=0.5,
                system_instruction=sys_prompt,
                safety_settings=[
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                    )
                ]
            )
        )
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"Gemini Error: {e}")
        yield f"Error processing response: {str(e)}"