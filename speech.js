/**
 * Azure Cognitive Services Speech - JavaScript Module
 * Replaces speech.py with uninterrupted speech synthesis & playback
 */

import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

// Active speech state management to prevent overlaps & interruptions
let currentSynthesizer = null;
let currentPlayer = null;

/**
 * Strips raw markdown, links, and code blocks so the speech engine reads natural text
 * without stuttering or interruptions on syntax characters.
 * 
 * @param {string} text - Raw text/markdown
 * @returns {string} Cleaned speakable text
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    // Replace code blocks with brief description
    .replace(/```[\s\S]*?```/g, ' [code snippet omitted] ')
    // Replace inline code `code` with code
    .replace(/`([^`]+)`/g, '$1')
    // Replace markdown links [label](url) with label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold/italic/strike marks
    .replace(/[*_~]{1,3}/g, '')
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes (> quote)
    .replace(/^>\s+/gm, '')
    // Remove bullet points / list markers
    .replace(/^[\s*-+]+(?=\S)/gm, '')
    // Replace multiple newlines or spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates Azure SpeechConfig from subscription key/region or auth token.
 * 
 * @param {object} config - Configuration options
 * @returns {speechSdk.SpeechConfig}
 */
export function createSpeechConfig({
  key = (typeof process !== 'undefined' ? (process.env?.azure_speech_key || process.env?.AZURE_SPEECH_KEY) : null),
  region = (typeof process !== 'undefined' ? (process.env?.azure_speech_region || process.env?.AZURE_SPEECH_REGION) : 'centralindia'),
  token = null,
  voiceName = 'en-US-JennyMultilingualNeural',
} = {}) {
  let speechConfig;
  if (token) {
    speechConfig = speechSdk.SpeechConfig.fromAuthorizationToken(token, region || 'centralindia');
  } else if (key && region) {
    speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
  } else {
    throw new Error('Azure Speech configuration requires either (key + region) or (token + region).');
  }
  speechConfig.speechSynthesisVoiceName = voiceName;
  return speechConfig;
}

/**
 * Speaks text using Azure Speech without interruptions.
 * In browser environments, uses SpeakerAudioDestination and resolves ONLY when
 * audio playback has completely finished, preventing early cutoffs.
 * 
 * @param {string} text - The text to be spoken
 * @param {object} options - Options including voiceName, token, key, region, onStart, onEnd
 * @returns {Promise<{duration: number, reason: string}>}
 */
export function speak(text, options = {}) {
  // Stop any previously playing speech to prevent audio collision
  stopSpeak();

  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    return Promise.resolve({ duration: 0, reason: 'EmptyText' });
  }

  const isBrowser = typeof window !== 'undefined';
  const voiceName = options.voiceName || 'en-US-JennyMultilingualNeural';

  const speechConfig = options.speechConfig || createSpeechConfig({
    key: options.key,
    region: options.region,
    token: options.token,
    voiceName: voiceName
  });

  return new Promise((resolve, reject) => {
    let player = null;
    let audioConfig = null;
    let audioDurationSeconds = 0;
    let isPlaybackFinished = false;

    if (isBrowser) {
      // Browser: Use SpeakerAudioDestination with Web Audio API for seamless playback
      player = new speechSdk.SpeakerAudioDestination();
      currentPlayer = player;
      audioConfig = speechSdk.AudioConfig.fromSpeakerOutput(player);

      // Playback started
      player.onAudioStart = () => {
        if (options.onStart) options.onStart();
      };

      // CRITICAL FOR UNINTERRUPTED FEEDBACK:
      // SpeakSynthesizer.speakTextAsync resolves when synthesis completes (data received),
      // NOT when playback finishes. We resolve and cleanup ONLY when the speaker has
      // played the full audio buffer to the very end!
      player.onAudioEnd = () => {
        if (!isPlaybackFinished) {
          isPlaybackFinished = true;
          cleanup();
          if (options.onEnd) options.onEnd();
          resolve({ duration: audioDurationSeconds, reason: 'Completed' });
        }
      };
    } else {
      // Node.js environment
      try {
        audioConfig = speechSdk.AudioConfig.fromDefaultSpeakerOutput();
      } catch (e) {
        audioConfig = null;
      }
    }

    const synthesizer = new speechSdk.SpeechSynthesizer(speechConfig, audioConfig);
    currentSynthesizer = synthesizer;

    function cleanup() {
      if (currentSynthesizer === synthesizer) {
        currentSynthesizer = null;
      }
      if (currentPlayer === player) {
        currentPlayer = null;
      }
      try {
        synthesizer.close();
      } catch (_) {}
    }

    synthesizer.speakTextAsync(
      cleanedText,
      result => {
        if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
          audioDurationSeconds = (result.audioDuration || 0) / (10000 * 1000); // 100ns units to seconds

          // In Node.js (or non-browser), finish here since player.onAudioEnd is browser-only
          if (!isBrowser) {
            cleanup();
            if (options.onEnd) options.onEnd();
            resolve({ duration: audioDurationSeconds, reason: 'Completed' });
          }
        } else if (result.reason === speechSdk.ResultReason.Canceled) {
          const cancellation = speechSdk.CancellationDetails.fromResult(result);
          console.warn('[Azure Speech] Synthesis canceled:', cancellation.reason, cancellation.errorDetails);
          cleanup();
          if (options.onEnd) options.onEnd();
          resolve({ duration: 0, reason: 'Canceled', details: cancellation.errorDetails });
        } else {
          cleanup();
          if (options.onEnd) options.onEnd();
          resolve({ duration: 0, reason: result.reason });
        }
      },
      error => {
        console.error('[Azure Speech] Synthesis error:', error);
        cleanup();
        if (options.onEnd) options.onEnd();
        reject(error);
      }
    );
  });
}

/**
 * Stops any currently active speech synthesis and playback immediately without error.
 */
export function stopSpeak() {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
    } catch (_) {}
    currentPlayer = null;
  }
  if (currentSynthesizer) {
    try {
      currentSynthesizer.close();
    } catch (_) {}
    currentSynthesizer = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

export default {
  speak,
  stopSpeak,
  cleanTextForSpeech,
  createSpeechConfig,
};
