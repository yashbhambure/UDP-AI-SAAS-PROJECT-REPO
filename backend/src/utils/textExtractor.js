/**
 * textExtractor.js — dispatches raw text extraction by file type.
 *
 * Supported:
 *  - PDF      → pdf-parse
 *  - DOCX     → mammoth
 *  - Image    → tesseract.js (OCR)
 *  - Text     → raw buffer toString
 *
 * Returns a plain string of extracted text, never throws on empty result —
 * callers should check for empty string themselves.
 */

const path = require('path');
const logger = require('./logger');

/**
 * extractText — main dispatcher
 * @param {Buffer} buffer   - Raw file content
 * @param {string} mimetype - MIME type from multer
 * @param {string} originalname - Original filename (used for type hints)
 * @returns {Promise<string>}
 */
const extractText = async (buffer, mimetype, originalname) => {
  const mime = (mimetype || '').toLowerCase();
  const ext = path.extname(originalname || '').toLowerCase();

  logger.debug(`[textExtractor] mime="${mime}" ext="${ext}" size=${buffer.length}`);

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (mime === 'application/pdf' || ext === '.pdf') {
    return extractFromPDF(buffer);
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return extractFromDOCX(buffer);
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (mime === 'text/plain' || ext === '.txt') {
    return buffer.toString('utf-8').trim();
  }

  // ── Images (OCR) ─────────────────────────────────────────────────────────
  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'].includes(ext)) {
    return extractFromImage(buffer);
  }

  // ── Fallback: try raw UTF-8 decode ────────────────────────────────────────
  logger.warn(`[textExtractor] Unknown MIME "${mime}", attempting UTF-8 decode`);
  return buffer.toString('utf-8').trim();
};

// ── PDF extraction ────────────────────────────────────────────────────────────
const extractFromPDF = async (buffer) => {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch (err) {
    logger.error(`[textExtractor] PDF extraction failed: ${err.message}`);
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
};

// ── DOCX extraction ───────────────────────────────────────────────────────────
const extractFromDOCX = async (buffer) => {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  } catch (err) {
    logger.error(`[textExtractor] DOCX extraction failed: ${err.message}`);
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
};

// ── Image OCR ─────────────────────────────────────────────────────────────────
const extractFromImage = async (buffer) => {
  try {
    const Tesseract = require('tesseract.js');
    logger.info('[textExtractor] Starting OCR — this may take 5-15 seconds...');
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`[OCR] ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return (text || '').trim();
  } catch (err) {
    logger.error(`[textExtractor] OCR failed: ${err.message}`);
    throw new Error(`OCR failed: ${err.message}`);
  }
};

/**
 * detectFileType — maps MIME/extension to our Document.fileType enum.
 * @returns {'pdf'|'docx'|'txt'|'image'|'text'}
 */
const detectFileType = (mimetype, originalname) => {
  const mime = (mimetype || '').toLowerCase();
  const ext = path.extname(originalname || '').toLowerCase();

  if (mime === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) return 'docx';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'text/plain' || ext === '.txt') return 'txt';
  return 'text';
};

module.exports = { extractText, detectFileType };
