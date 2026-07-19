/**
 * extractionPrompt.js — LLM prompt template for structured content extraction.
 *
 * Edit this file to tune how the LLM interprets uploaded documents.
 * The prompt is intentionally kept separate from the service logic so you
 * can iterate on wording without touching the pipeline.
 *
 * Returns a function that accepts the raw document text and returns a
 * { systemPrompt, userPrompt } pair ready for llmService.callLLM().
 */

/**
 * buildExtractionPrompt
 * @param {string} rawText - The extracted text from the document
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
const buildExtractionPrompt = (rawText) => {
  const systemPrompt = `You are an expert document analyst and project manager.
Your job is to read a document and extract all structured, actionable information from it.
You always respond with ONLY a single valid JSON object — no markdown, no explanation, no code fences.
If a field cannot be determined from the document, use null for dates, empty string for text, or empty array for lists.
Never fabricate information that isn't clearly implied by the document text.`;

  const userPrompt = `Analyze the following document and extract all relevant information.
Return ONLY a JSON object matching this EXACT schema — do not add extra keys:

{
  "title": "A concise, descriptive title for this opportunity or document (string, max 100 chars)",
  "summary": "A 2-3 sentence plain-English summary of what this document is about (string)",
  "importantDates": [
    { "label": "human-readable label, e.g. 'Application Deadline'", "date": "ISO 8601 date string or null" }
  ],
  "deadline": "The single most important deadline as ISO 8601 date string, or null if none found",
  "requiredDocuments": ["list of documents or materials that must be submitted or prepared (strings)"],
  "actionItems": ["list of concrete actions that need to be taken (verb phrases, e.g. 'Submit application form')"],
  "priority": "one of: low | medium | high — based on urgency, stakes, and deadline proximity",
  "category": "e.g. Funding, Hackathon, Client Requirement, Job Application, Event, Contract, Other",
  "suggestedAssignee": "name or role of the most suitable person to handle this, or empty string if unclear"
}

DOCUMENT TEXT:
---
${rawText.slice(0, 15000)}
---

Remember: respond with ONLY the JSON object. No extra text.`;

  return { systemPrompt, userPrompt };
};

module.exports = { buildExtractionPrompt };
