import uuid
import os
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from dotenv import load_dotenv

load_dotenv()
endPoint=os.getenv("azure_cosmos_uri")
key=os.getenv("azure_cosmos_key")

# If Cosmos is not configured, we'll fail gracefully or let it crash to inform the user
client=CosmosClient(endPoint,credential=key)

try:
    database = client.create_database_if_not_exists(id="chat_db")
except Exception:
    database = client.get_database_client("chat_db")

try:
    messages_container = database.create_container_if_not_exists(
        id="messages", partition_key=PartitionKey(path="/conversation_id")
    )
except Exception:
    messages_container = database.get_container_client("messages")

try:
    sessions_container = database.create_container_if_not_exists(
        id="sessions", partition_key=PartitionKey(path="/id")
    )
except Exception:
    sessions_container = database.get_container_client("sessions")

try:
    chats_container = database.create_container_if_not_exists(
        id="chats", partition_key=PartitionKey(path="/id")
    )
except Exception:
    chats_container = database.get_container_client("chats")

try:
    users_container = database.create_container_if_not_exists(
        id="users_v2", partition_key=PartitionKey(path="/email")
    )
except Exception:
    users_container = database.get_container_client("users_v2")

def get_session(session_id: str) -> dict:
    try:
        response = sessions_container.read_item(item=session_id, partition_key=session_id)
        return response
    except CosmosResourceNotFoundError:
        new_session = {
            "id": session_id,
            "personality": "Friend",
            "mode": "Normal Mode",
            "current_chat_id": None
        }
        sessions_container.create_item(body=new_session)
        return new_session

def update_session(session_id: str, updates: dict):
    session = get_session(session_id)
    session.update(updates)
    sessions_container.upsert_item(body=session)
    return session

def create_chat(title: str = "New Chat", email: str = None) -> str:
    chat_id = str(uuid.uuid4())
    new_chat = {
        "id": chat_id,
        "title": title,
        "email": email
    }
    chats_container.create_item(body=new_chat)
    return chat_id

def get_chat(chat_id: str) -> dict:
    try:
        chat_item = chats_container.read_item(item=chat_id, partition_key=chat_id)
        # Fetch messages for this chat
        messages = get_chat_history(chat_id, turn=100) # Load history
        return {
            "id": chat_item["id"],
            "title": chat_item.get("title", "Chat"),
            "messages": messages
        }
    except CosmosResourceNotFoundError:
        return None

def get_all_chats(email: str = None) -> list:
    if email:
        query = "SELECT c.id, c.title FROM c WHERE c.email = @email"
        param = [{"name": "@email", "value": email}]
        items = list(chats_container.query_items(query=query, parameters=param, enable_cross_partition_query=True))
        return items
    query = "SELECT c.id, c.title FROM c"
    items = list(chats_container.query_items(query=query, enable_cross_partition_query=True))
    return items

def save_message(chat_id: str, role: str, content: str):
    item = {
        "id": str(uuid.uuid4()),
        "conversation_id": chat_id,
        "role": role,
        "content": content
    }
    messages_container.create_item(body=item)

def get_chat_history(chat_id: str, turn: int = 10) -> list:
    limit = turn * 2
    query = """
    SELECT TOP @limit * FROM c
    WHERE c.conversation_id = @conv_id
    ORDER BY c._ts DESC
    """
    param = [
        {"name": "@conv_id", "value": chat_id},
        {"name": "@limit", "value": limit}
    ]
    items = list(messages_container.query_items(query=query, parameters=param, partition_key=chat_id))
    items.reverse()
    chat_history = [
        {"id": msg["id"], "role": msg["role"], "content": msg["content"]} 
        for msg in items
    ]
    return chat_history

def truncate_chat_after(chat_id: str, message_id: str):
    query = "SELECT c.id, c._ts FROM c WHERE c.conversation_id = @conv_id"
    param = [{"name": "@conv_id", "value": chat_id}]
    items = list(messages_container.query_items(query=query, parameters=param, partition_key=chat_id))
    
    target_msg = next((m for m in items if m["id"] == message_id), None)
    if not target_msg:
        return
    
    target_ts = target_msg["_ts"]
    
    # Delete the target message and all subsequent messages
    for msg in items:
        if msg["_ts"] >= target_ts:
            messages_container.delete_item(item=msg["id"], partition_key=chat_id)

def create_user(email: str, password_hash: str):
    item = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash
    }
    users_container.create_item(body=item)
    return item

def get_user_by_email(email: str):
    query = "SELECT * FROM c WHERE c.email = @email"
    param = [{"name": "@email", "value": email}]
    items = list(users_container.query_items(query=query, parameters=param, partition_key=email))
    return items[0] if items else None

def update_user_password(email: str, new_password_hash: str):
    user = get_user_by_email(email)
    if user:
        user["password_hash"] = new_password_hash
        users_container.upsert_item(body=user)
        return True
    return False