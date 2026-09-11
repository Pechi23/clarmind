import { scoreVoice, chooseVoice, VoiceLike } from '../voiceSelect';

const voices: VoiceLike[] = [
  { identifier: 'com.apple.voice.compact.en-US.Fred', name: 'Fred', language: 'en-US', quality: 'Default' },
  { identifier: 'com.apple.voice.enhanced.en-US.Samantha', name: 'Samantha', language: 'en-US', quality: 'Enhanced' },
  { identifier: 'com.apple.voice.compact.en-US.Samantha', name: 'Samantha', language: 'en-US', quality: 'Default' },
  { identifier: 'ro-ro-x-rod-network', name: 'Romanian Male', language: 'ro-RO', quality: 'Default' },
  { identifier: 'ro-ro-x-rof-network', name: 'Romanian Female', language: 'ro-RO', quality: 'Default' },
];

describe('scoreVoice', () => {
  it('rejects a wrong-language voice with -Infinity', () => {
    expect(scoreVoice(voices[3], 'en-US')).toBe(-Infinity);
  });
  it('scores a female voice above a male one for the same locale', () => {
    const fem = scoreVoice(voices[1], 'en-US'); // Samantha enhanced
    const male = scoreVoice(voices[0], 'en-US'); // Fred
    expect(fem).toBeGreaterThan(male);
  });
  it('prefers enhanced quality among same-gender voices', () => {
    const enhanced = scoreVoice(voices[1], 'en-US');
    const plain = scoreVoice(voices[2], 'en-US');
    expect(enhanced).toBeGreaterThan(plain);
  });
});

describe('chooseVoice', () => {
  it('picks the enhanced female voice for en-US', () => {
    expect(chooseVoice(voices, 'en-US')).toBe('com.apple.voice.enhanced.en-US.Samantha');
  });
  it('picks the female voice for ro-RO by the name hint', () => {
    expect(chooseVoice(voices, 'ro-RO')).toBe('ro-ro-x-rof-network');
  });
  it('returns undefined when no voice matches the language', () => {
    expect(chooseVoice(voices, 'ja-JP')).toBeUndefined();
  });
  it('falls back to a same-language voice when none look female', () => {
    const only = [{ identifier: 'de-de-x-dea-local', name: 'de-DE', language: 'de-DE' }];
    expect(chooseVoice(only, 'de-DE')).toBe('de-de-x-dea-local');
  });
});
