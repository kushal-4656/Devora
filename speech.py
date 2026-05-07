from dotenv import load_dotenv
import os
import azure.cognitiveservices.speech as speechsdk

load_dotenv()
speech_key=os.getenv("azure_speech_key")
speech_region=os.getenv("azure_speech_region")
from dotenv import load_dotenv
import os
import azure.cognitiveservices.speech as speechsdk

load_dotenv()
speech_key=os.getenv("azure_speech_key")
speech_region=os.getenv("azure_speech_region")

speech_config = speechsdk.SpeechConfig(subscription=speech_key,region=speech_region)
speech_config.speech_synthesis_voice_name="en-US-JennyMultilingualNeural"

speech_synthisizer=speechsdk.SpeechSynthesizer(speech_config=speech_config)

def speak(text:str):
    result = speech_synthisizer.speak_text_async(text).get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_duration.total_seconds()
    if result.reason == speechsdk.ResultReason.Canceled:
        cancellation = result.cancellation_details
        print(f"Speech synthesis canceled: {cancellation.reason}")
        if cancellation.reason == speechsdk.CancellationReason.Error:
            print(f"Error details: {cancellation.error_details}")
    return 0

def stop_speak():
    speech_synthisizer.stop_speaking_async().get()
