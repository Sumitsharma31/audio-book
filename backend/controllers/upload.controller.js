const { processPdf } = require('../services/pdf.service');

const handleUpload = async (req, res) => {
  try {
    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file format' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Call service to process the PDF
    const result = await processPdf(filePath);

    res.status(200).json({
      message: 'File uploaded and processed successfully',
      file: {
        name: originalName,
        path: filePath,
        size: req.file.size
      },
      processResult: result
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    res.status(500).json({ error: 'An error occurred during file upload and processing' });
  }
};

module.exports = {
  handleUpload
};
