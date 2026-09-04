// Native: use the real expo-speech-recognition module.
// The web build resolves speechRecognition.web.ts (Web Speech API) instead.
export { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
export const speechRecognitionAvailable = true;
