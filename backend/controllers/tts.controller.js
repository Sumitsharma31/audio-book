const { generateAudioForChunk } = require('../services/tts.service');

const handleTts = async (req, res) => {
  try {
    const { text, pageNum, voiceModel } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const filename = `page-${pageNum}-${Date.now()}.mp3`;
    const audioUrl = await generateAudioForChunk(text, filename, voiceModel);

    res.status(200).json({ audioUrl });
  } catch (error) {
    console.error('Error in TTS controller:', error.message || error);
    const isMissingKey = error.message && error.message.includes('Missing Google Cloud API Key');
    res.status(isMissingKey ? 400 : 500).json({ 
      error: error.message || 'Failed to generate audio',
      code: isMissingKey ? 'MISSING_API_KEY' : 'GENERATE_FAILED'
    });
  }
};

module.exports = {
  handleTts
};
