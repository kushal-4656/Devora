import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration 
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("CRITICAL SECURITY ERROR: 'JWT_SECRET' environment variable is missing. ")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
if not JWT_ALGORITHM:
    raise RuntimeError("CRITICAL SECURITY ERROR: 'JWT_ALGORITHM' environment variable is missing. ")

jwt_expire_raw = os.getenv("JWT_EXPIRE_DAYS")
if not jwt_expire_raw:
    raise RuntimeError("CRITICAL SECURITY ERROR: 'JWT_EXPIRE_DAYS' environment variable is missing. ")

try:
    JWT_EXPIRE_DAYS = int(jwt_expire_raw)
except ValueError:
    raise ValueError("Configuration error: 'JWT_EXPIRE_DAYS' must be a valid integer.")

# Azure Speech Service Configuration 
SPEECH_KEY = os.getenv("azure_speech_key") or os.getenv("AZURE_SPEECH_KEY")
SPEECH_REGION = os.getenv("azure_speech_region") or os.getenv("AZURE_SPEECH_REGION")

# CORS Configuration 
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]
