const fs = require('fs');
const pdf = require('pdf-parse');
const { generateAudioForChunk } = require('./tts.service');

// Helper function to chunk text roughly by sentences up to a max length
const chunkText = (text, maxLen = 800) => {
  // Replace newlines with spaces and multiple spaces with a single space
  const cleanText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Split roughly by sentence endings
  const sentences = cleanText.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
  
  const chunks = [];
  let currentChunk = "";
  for (let s of sentences) {
    if ((currentChunk.length + s.length) > maxLen && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += s + " ";
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  
  return chunks;
};

/**
 * Service to handle PDF processing logic.
 * Extracts text, chunks it, and generates audio for each chunk.
 */
const processPdf = async (filePath) => {
  try {
    console.log(`Processing PDF at: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    // Chunk the extracted text
    const chunks = chunkText(data.text);
    
    const pages = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      if (!chunkText || chunkText.trim() === '') continue;
      
      pages.push({
        pageNum: i + 1,
        text: chunkText,
        // Audio will be fetched on demand by the frontend
        audioUrl: null
      });
    }
    
    return {
      success: true,
      message: 'PDF processed successfully',
      pages: pages,
      totalPages: pages.length
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error('Failed to process PDF');
  }
};

module.exports = {
  processPdf
};
