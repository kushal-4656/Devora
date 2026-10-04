/**
 * Azure Cognitive Services Speech & Web Audio Engine
 * Provides robust speech synthesis, distinct personality sounds, and automatic fallbacks for Devora Chat
 */

import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

// Active speech state management to prevent overlaps & interruptions
let currentSynthesizer = null;
let currentPlayer = null;
let activeUtterance = null;
let isStopping = false;

/**
 * Personality Profiles defining distinct sounds, Azure voices, and Web Speech parameters.
 */
export const PERSONALITY_PROFILES = {
  Teacher: {
    name: 'Teacher',
    azureVoice: 'en-US-DavisNeural',
    azureProsody: { rate: '-4%', pitch: '0%' },
    browserPitch: 0.98,
    browserRate: 0.95,
    browserVoiceKeywords: ['davis', 'george', 'daniel', 'oliver', 'ryan', 'mark', 'teacher', 'en-gb'],
    soundType: 'teacher-bell',
    description: 'Clear, structured, instructional cadence with an academic focus bell.'
  },
  Friend: {
    name: 'Friend',
    azureVoice: 'en-US-AriaNeural',
    azureProsody: { rate: '+6%', pitch: '+5%' },
    browserPitch: 1.16,
    browserRate: 1.05,
    browserVoiceKeywords: ['aria', 'jenny', 'samantha', 'victoria', 'zira', 'karen', 'female', 'natural'],
    soundType: 'friend-pop',
    description: 'Warm, energetic, lively cadence with a cheerful melodic chime.'
  },
  Mentor: {
    name: 'Mentor',
    azureVoice: 'en-US-GuyNeural',
    azureProsody: { rate: '-8%', pitch: '-8%' },
    browserPitch: 0.82,
    browserRate: 0.90,
    browserVoiceKeywords: ['guy', 'alex', 'david', 'mark', 'richard', 'daniel', 'male'],
    soundType: 'mentor-zen',
    description: 'Deep, calm, resonant cadence with a warm acoustic wisdom chord.'
  }
};

/**
 * Returns personality profile with fallback to 'Friend'.
 */
export function getPersonalityConfig(personality = 'Friend') {
  return PERSONALITY_PROFILES[personality] || PERSONALITY_PROFILES.Friend;
}

/**
 * Plays a distinct signature sound (chime / earcon) for each personality using Web Audio API.
 * This also primes and unlocks the browser's AudioContext within user gesture events.
 * 
 * @param {string} personality - 'Teacher', 'Friend', or 'Mentor'
 * @returns {Promise<void>}
 */
export function playPersonalityChime(personality = 'Friend') {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return resolve();

    try {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      if (personality === 'Teacher') {
        // Teacher: Crisp dual harmonic chime (Focus / School Bell: C5 523.25Hz -> E5 659.25Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.09);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.5, now);
        osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.09);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.34);
        osc2.stop(now + 0.34);
        setTimeout(() => {
          try { ctx.close(); } catch (_) {}
          resolve();
        }, 300);

      } else if (personality === 'Mentor') {
        // Mentor: Deep, warm resonant wisdom fifth (A3 220Hz + E4 330Hz) with gentle ambient swell
        const freqs = [220, 330];
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.14, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.46);
        });

        setTimeout(() => {
          try { ctx.close(); } catch (_) {}
          resolve();
        }, 360);

      } else {
        // Friend: Cheerful ascending major triad chime (A4 440Hz -> C#5 554.37Hz -> E5 659.25Hz)
        const notes = [
          { f: 440, t: 0.0 },
          { f: 554.37, t: 0.07 },
          { f: 659.25, t: 0.14 }
        ];

        notes.forEach(({ f, t }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.12, now + t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + 0.23);
        });

        setTimeout(() => {
          try { ctx.close(); } catch (_) {}
          resolve();
        }, 320);
      }
    } catch (e) {
      console.debug('Chime synthesis bypass:', e);
      resolve();
    }
  });
}

/**
 * Strips raw markdown, links, and code blocks so the speech engine reads natural text.
 * 
 * @param {string} text - Raw text/markdown
 * @returns {string} Cleaned speakable text
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[\s*-+]+(?=\S)/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Selects the optimal browser voice for the selected personality.
 */
function pickBrowserVoice(personality = 'Friend') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const config = getPersonalityConfig(personality);
  const keywords = config.browserVoiceKeywords || [];

  for (const kw of keywords) {
    const matched = voices.find(v => 
      v.lang && v.lang.toLowerCase().startsWith('en') && 
      v.name.toLowerCase().includes(kw)
    );
    if (matched) return matched;
  }

  const anyEnglish = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (anyEnglish) return anyEnglish;

  return voices[0] || null;
}

/**
 * Speaks text using the browser's native Web Speech API (speechSynthesis).
 */
export function speakWithBrowserSynthesis(text, options = {}) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (options.onEnd) options.onEnd();
      return resolve({ duration: 0, reason: 'SpeechSynthesisNotSupported' });
    }

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
      if (options.onEnd) options.onEnd();
      return resolve({ duration: 0, reason: 'EmptyText' });
    }

    window.speechSynthesis.cancel();

    const personality = options.personality || 'Friend';
    const config = getPersonalityConfig(personality);

    const sentences = cleanedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanedText];
    let currentIdx = 0;
    isStopping = false;

    if (options.onStart) options.onStart();

    const speakNextSentence = () => {
      if (isStopping || currentIdx >= sentences.length) {
        activeUtterance = null;
        if (options.onEnd) options.onEnd();
        return resolve({ duration: 0, reason: 'Completed' });
      }

      const sentenceText = sentences[currentIdx].trim();
      currentIdx++;

      if (!sentenceText) {
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      activeUtterance = utterance;

      const voice = pickBrowserVoice(personality);
      if (voice) utterance.voice = voice;

      utterance.pitch = config.browserPitch;
      utterance.rate = config.browserRate;

      utterance.onend = () => {
        if (!isStopping) {
          speakNextSentence();
        }
      };

      utterance.onerror = (err) => {
        console.warn('[Web Speech] Sentence error:', err);
        if (!isStopping) {
          speakNextSentence();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNextSentence();
      };
      setTimeout(() => {
        if (!activeUtterance) speakNextSentence();
      }, 100);
    } else {
      speakNextSentence();
    }
  });
}

/**
 * Creates Azure SpeechConfig from subscription key/region or auth token.
 */
export function createSpeechConfig({
  token = null,
  key = null,
  region = 'centralindia',
  voiceName = 'en-US-JennyMultilingualNeural',
} = {}) {
  let speechConfig;
  if (token) {
    speechConfig = speechSdk.SpeechConfig.fromAuthorizationToken(token, region || 'centralindia');
  } else if (key) {
    speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region || 'centralindia');
  } else {
    throw new Error('Azure Speech configuration requires an authorization token or key.');
  }
  speechConfig.speechSynthesisVoiceName = voiceName;
  return speechConfig;
}

/**
 * Speaks text using Azure Speech SDK with uninterrupted speaker destination.
 */
async function speakWithAzure(text, options = {}) {
  const personality = options.personality || 'Friend';
  const config = getPersonalityConfig(personality);
  const voiceName = options.voiceName || config.azureVoice;

  const speechConfig = options.speechConfig || createSpeechConfig({
    token: options.token,
    key: options.key,
    region: options.region,
    voiceName: voiceName
  });

  const cleanedText = cleanTextForSpeech(text);

  return new Promise((resolve, reject) => {
    let audioDurationSeconds = 0;
    let isPlaybackFinished = false;

    const player = new speechSdk.SpeakerAudioDestination();
    currentPlayer = player;
    const audioConfig = speechSdk.AudioConfig.fromSpeakerOutput(player);

    if (typeof player.onAudioStart === 'function' || player.onAudioStart === null) {
      player.onAudioStart = () => {
        if (options.onStart) options.onStart();
      };
    }

    player.onAudioEnd = () => {
      if (!isPlaybackFinished) {
        isPlaybackFinished = true;
        cleanup();
        if (options.onEnd) options.onEnd();
        resolve({ duration: audioDurationSeconds, reason: 'Completed' });
      }
    };

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

    const escapedText = cleanedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${voiceName}">
    <prosody rate="${config.azureProsody.rate}" pitch="${config.azureProsody.pitch}">
      ${escapedText}
    </prosody>
  </voice>
</speak>`;

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
          audioDurationSeconds = (result.audioDuration || 0) / (10000 * 1000);
        } else if (result.reason === speechSdk.ResultReason.Canceled) {
          const cancellation = speechSdk.CancellationDetails.fromResult(result);
          console.warn('[Azure Speech] Synthesis canceled, falling back to Web Speech:', cancellation.errorDetails);
          cleanup();
          speakWithBrowserSynthesis(text, options).then(resolve).catch(reject);
        } else {
          cleanup();
          speakWithBrowserSynthesis(text, options).then(resolve).catch(reject);
        }
      },
      error => {
        console.warn('[Azure Speech] Synthesis error, falling back to Web Speech:', error);
        cleanup();
        speakWithBrowserSynthesis(text, options).then(resolve).catch(reject);
      }
    );
  });
}

/**
 * Universal Speak Function
 */
export async function speak(text, options = {}) {
  stopSpeak();

  const cleanedText = cleanTextForSpeech(text);
  if (!cleanedText) {
    if (options.onEnd) options.onEnd();
    return Promise.resolve({ duration: 0, reason: 'EmptyText' });
  }

  const personality = options.personality || 'Friend';

  if (options.playChime !== false) {
    await playPersonalityChime(personality);
  }

  if (options.token || options.key) {
    try {
      return await speakWithAzure(text, { ...options, personality });
    } catch (azureErr) {
      console.warn('[Speech] Azure speak failed, using browser synthesis:', azureErr);
      return await speakWithBrowserSynthesis(text, { ...options, personality });
    }
  }

  return await speakWithBrowserSynthesis(text, { ...options, personality });
}

/**
 * Stops any currently active speech synthesis immediately.
 */
export function stopSpeak() {
  isStopping = true;
  activeUtterance = null;

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
  playPersonalityChime,
  getPersonalityConfig,
  cleanTextForSpeech,
  createSpeechConfig,
  speakWithBrowserSynthesis,
  PERSONALITY_PROFILES,
};
