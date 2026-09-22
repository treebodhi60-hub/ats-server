// Parses one email body into one or more job-description "blocks".
//
// The VMS-style template looks like:
//   Request ID: 110228-1
//   Start/End Dates: 10/16/2026 - 4/16/2027
//   Tax Work Location: IND Default
//   Job Title: Information Technology_IND - IND_Developer
//   Job Description: Job Description: <Role>, Location : <City>, Exp: <Years>
//   <...long free-text description...>
//
// A single email can contain several "Request ID:" sections (a digest), so we
// split on that marker and parse each section independently. Emails that
// don't follow the template at all (plain JD text, role only in the subject)
// fall back to a single block built from the whole body + subject.

function grab(regex, text) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function cleanSubjectAsRole(subject) {
  if (!subject) return null;
  return subject.replace(/^\s*job\s*description\s*[:\-]?\s*/i, '').trim() || null;
}

function extractFieldsFromBlock(blockText, subject) {
  const requestId = grab(/Request ID:\s*([^\n]+)/i, blockText);
  const dateRange = grab(/Start\/End Dates:\s*([^\n]+)/i, blockText);
  const taxLocation = grab(/Tax Work Location:\s*([^\n]+)/i, blockText);
  const jobTitleHeader = grab(/Job Title:\s*([^\n]+)/i, blockText);
  const experienceRequired = grab(/Experience Required:\s*([^\n]+)/i, blockText);

  // "Job Description: [Job Description:] <Role>, Location : <City>, Exp: <Years>"
  const inlineMatch = blockText.match(
    /Job Description:\s*(?:Job Description:\s*)?([^\n,]+),\s*Location\s*:\s*([^\n,]+),\s*Exp\.?:?\s*([^\n]+)/i
  );

  const role = (inlineMatch && inlineMatch[1].trim()) || jobTitleHeader || cleanSubjectAsRole(subject);
  const location = (inlineMatch && inlineMatch[2].trim()) || taxLocation || null;
  const experience = (inlineMatch && inlineMatch[3].trim()) || experienceRequired || null;

  return {
    requestId,
    role: role || null,
    experience,
    location,
    dateRange,
    description: blockText.trim(),
  };
}

function parseJobBlocks(bodyText, subject) {
  const normalized = (bodyText || '').replace(/\r\n/g, '\n');

  if (!normalized.trim()) {
    return [
      {
        requestId: null,
        role: cleanSubjectAsRole(subject),
        experience: null,
        location: null,
        dateRange: null,
        description: '',
      },
    ];
  }

  const requestIdRegex = /Request ID:\s*[^\n]+/gi;
  const matches = [...normalized.matchAll(requestIdRegex)];

  if (matches.length === 0) {
    return [extractFieldsFromBlock(normalized, subject)];
  }

  const blocks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    blocks.push(extractFieldsFromBlock(normalized.slice(start, end), subject));
  }
  return blocks;
}

module.exports = { parseJobBlocks };
