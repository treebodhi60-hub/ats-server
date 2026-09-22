// Classifies an email as "job description or not" and extracts the 4 key
// fields, using Groq's free hosted inference (OpenAI-compatible API) over an
// open-source model. Used only as a fallback for emails that don't match the
// known VMS template (see jdParser.js) - those are trusted to the regex
// parser directly, keeping the common case free and instant.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const REQUEST_TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `You classify inbox emails for a recruiting tool. Given an email's subject and body, decide whether it is a genuine job description / job requirement / hiring need (e.g. a role a recruiter is trying to fill), as opposed to anything else (meeting invites, invoices, newsletters, personal messages, automated notifications unrelated to a specific role, etc.).

Respond with ONLY a single compact JSON object, no prose, no markdown fences, in exactly this shape:
{"isJobDescription": true or false, "role": string or null, "experience": string or null, "location": string or null, "dateRange": string or null}

Field rules:
- isJobDescription: true only if the email is about a specific open role/requirement.
- role: the job title (e.g. "DevOps Engineer"), or null if not determinable.
- experience: years of experience mentioned (e.g. "5+ Yrs"), or null.
- location: work location/city mentioned, or null.
- dateRange: contract or assignment start/end dates as written, or null.
If isJobDescription is false, set the other fields to null.`;

function isEnabled() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function classifyAndExtract(subject, bodyText) {
  if (!isEnabled()) return null;

  const bodySnippet = (bodyText || '').slice(0, 4000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Subject: ${subject}\n\nBody:\n${bodySnippet}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq response missing message content');

    const parsed = JSON.parse(content);
    return {
      isJobDescription: Boolean(parsed.isJobDescription),
      role: parsed.role || null,
      experience: parsed.experience || null,
      location: parsed.location || null,
      dateRange: parsed.dateRange || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { classifyAndExtract, isEnabled };
