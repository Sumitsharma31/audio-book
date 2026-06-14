const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const clientOptions = {};
if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your_api_key_here') {
  clientOptions.apiKey = process.env.GOOGLE_API_KEY;
}
const client = new textToSpeech.TextToSpeechClient(clientOptions);

/**
 * Converts text into an MP3 file using official @google-cloud/text-to-speech
 * @param {string} text - The text to convert to speech.
 * @param {string} filename - The name of the resulting mp3 file.
 * @param {string} voiceModel - The requested voice model (e.g. 'en-US-Journey-F').
 * @returns {Promise<string>} - The URL to access the audio file.
 */
const generateAudioForChunk = async (text, filename, voiceModel = 'en-US-Journey-F') => {
  try {
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_api_key_here') {
      throw new Error("Missing Google Cloud API Key! Please set GOOGLE_API_KEY in the backend/.env file.");
    }

    // Dynamically extract the language code (e.g., en-US from en-US-Journey-F, en-GB from en-GB-Standard-B)
    const languageCode = voiceModel.includes('-')
      ? voiceModel.split('-').slice(0, 2).join('-')
      : 'en-US';

    // Helper to escape XML characters to construct valid SSML
    const escapeXml = (unsafeText) => {
      return unsafeText.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const ssmlText = `<speak><break time="500ms"/>${escapeXml(text)}</speak>`;

    const request = {
      input: { ssml: ssmlText },
      voice: { languageCode: languageCode, name: voiceModel },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);

    const tempDir = path.join(__dirname, '..', 'temp');
    const filePath = path.join(tempDir, filename);
    
    fs.writeFileSync(filePath, response.audioContent, 'binary');

    const PORT = process.env.PORT || 5000;
    const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
    return `${BASE_URL}/temp/${filename}`;
  } catch (err) {
    console.error('Error generating audio with Google Cloud API:', err);
    throw new Error(err.message || 'TTS Generation failed');
  }
};

module.exports = {
  generateAudioForChunk
};
