import requests
from fastapi import HTTPException
from config import SPEECH_KEY, SPEECH_REGION

def issue_azure_speech_token() -> dict:
    """Issues a short-lived token for Azure Speech SDK authentication."""
    if not SPEECH_KEY or not SPEECH_REGION:
        raise HTTPException(status_code=503, detail="Azure speech credentials (key/region) are not configured")
    
    fetch_token_url = f"https://{SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    headers = {
        'Ocp-Apim-Subscription-Key': SPEECH_KEY
    }
    try:
        response = requests.post(fetch_token_url, headers=headers, timeout=5)
        if response.status_code == 200:
            return {"token": response.text, "region": SPEECH_REGION}
        else:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Failed to get speech token: {response.text}"
            )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Speech service unreachable: {str(e)}")
