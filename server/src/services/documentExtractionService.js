const path = require('path');

const SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

// Provider-independent extraction boundary. Demo deployments may return structured
// metadata from a configured provider, but extraction never verifies a document.
const extractDocumentData = async ({ documentType, fileName, mimeType }) => {
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) return null;

  if (process.env.DOCUMENT_EXTRACTION_PROVIDER !== 'openai_compatible' || !process.env.DOCUMENT_EXTRACTION_API_URL || !process.env.DOCUMENT_EXTRACTION_API_KEY) {
    return null;
  }

  const endpoint = process.env.DOCUMENT_EXTRACTION_API_URL.replace(/\/$/, '');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DOCUMENT_EXTRACTION_API_KEY}`,
    },
    body: JSON.stringify({
      documentType,
      fileName: path.basename(fileName),
      mimeType,
      mode: 'structured_extraction_only',
    }),
  });

  if (!response.ok) throw new Error(`Document extraction provider returned ${response.status}`);
  return response.json();
};

module.exports = { extractDocumentData, SUPPORTED_MIME_TYPES };