const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const sanitizeHtml = require('sanitize-html');
const { JobPosting, AllowedSender, SyncState } = require('../models');
const { parseJobBlocks } = require('./jdParser');
const aiClassifier = require('./aiClassifier.service');

// Email HTML is untrusted content - strip scripts/handlers/tracking pixels
// before it is stored and later rendered in the browser.
function sanitizeEmailHtml(html) {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.filter((tag) => tag !== 'img'),
    allowedAttributes: {
      a: ['href', 'name', 'target'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

// Re-check a small overlap window on every run so a message that arrived
// right at the edge of the previous sync is never missed.
const LOOKBACK_BUFFER_MS = 10 * 60 * 1000;

function getImapClient() {
  return new ImapFlow({
    host: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.GMAIL_IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });
}

async function ensureSyncStateRow() {
  const [state] = await SyncState.findOrCreate({ where: { id: 1 }, defaults: {} });
  return state;
}

async function getSinceDate(state) {
  if (state.lastSuccessfulSyncAt) {
    return new Date(state.lastSuccessfulSyncAt.getTime() - LOOKBACK_BUFFER_MS);
  }
  const lookbackDays = Number(process.env.INITIAL_SYNC_LOOKBACK_DAYS) || 30;
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  return since;
}

// Blocks that matched the known VMS template (they carry a requestId) are
// trusted to the regex parser directly - no AI call, no cost, no latency.
// Anything else is ambiguous (could be a differently-formatted JD, or not a
// JD at all), so - only if a Groq API key is configured - it's handed to the
// AI to classify and, if it really is a job description, extract fields
// from. Emails the AI rejects are dropped instead of imported as noise.
// If no key is configured, behaviour is unchanged: everything is imported.
async function resolveBlocks(blocks, subject, bodyText, uid) {
  if (!aiClassifier.isEnabled()) {
    return blocks;
  }

  const resolved = [];
  for (const block of blocks) {
    if (block.requestId) {
      resolved.push(block);
      continue;
    }

    try {
      const aiResult = await aiClassifier.classifyAndExtract(subject, bodyText);
      if (!aiResult || !aiResult.isJobDescription) {
        continue;
      }
      resolved.push({
        ...block,
        role: aiResult.role || block.role,
        experience: aiResult.experience || block.experience,
        location: aiResult.location || block.location,
        dateRange: aiResult.dateRange || block.dateRange,
      });
    } catch (err) {
      console.error(`[sync] AI classification failed for uid ${uid}, importing as-is:`, err.message);
      resolved.push(block);
    }
  }
  return resolved;
}

async function runSync() {
  const state = await ensureSyncStateRow();

  if (state.lastStatus === 'running') {
    return { skipped: true, reason: 'A sync is already running' };
  }

  const senders = await AllowedSender.findAll({ where: { active: true } });
  if (senders.length === 0) {
    return { skipped: true, reason: 'No active senders configured yet' };
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not configured in server/.env');
  }

  await state.update({ lastStatus: 'running', lastSyncStartedAt: new Date(), lastError: null });

  const client = getImapClient();
  let importedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });

    try {
      const since = await getSinceDate(state);
      const uidSet = new Set();

      for (const sender of senders) {
        const uids = await client.search({ from: sender.email, since }, { uid: true });
        uids.forEach((uid) => uidSet.add(uid));
      }

      if (uidSet.size > 0) {
        for await (const message of client.fetch(
          Array.from(uidSet),
          { source: true, envelope: true },
          { uid: true }
        )) {
          try {
            const parsed = await simpleParser(message.source);
            const fromAddress = (parsed.from?.value?.[0]?.address || '').toLowerCase();
            const fromName = parsed.from?.value?.[0]?.name || null;
            const messageId = parsed.messageId || `no-id-uid-${message.uid}`;
            const subject = parsed.subject || '(no subject)';
            const receivedAt = parsed.date || new Date();
            const sanitizedHtml = sanitizeEmailHtml(parsed.html);

            const rawBlocks = parseJobBlocks(parsed.text, subject);
            const blocks = await resolveBlocks(rawBlocks, subject, parsed.text, message.uid);

            for (let i = 0; i < blocks.length; i += 1) {
              const block = blocks[i];
              const dedupeKey = `${messageId}::${block.requestId || `block${i}`}`;

              try {
                await JobPosting.create({
                  messageId,
                  dedupeKey,
                  requestId: block.requestId,
                  role: block.role,
                  experience: block.experience,
                  location: block.location,
                  dateRange: block.dateRange,
                  senderEmail: fromAddress,
                  senderName: fromName,
                  subject,
                  bodyText: block.description || parsed.text || null,
                  // HTML splitting per JD block isn't reliable, so only keep
                  // the rendered HTML when the email held a single posting.
                  bodyHtml: blocks.length === 1 ? sanitizedHtml : null,
                  receivedAt,
                });
                importedCount += 1;
              } catch (err) {
                if (err.name !== 'SequelizeUniqueConstraintError') {
                  console.error(
                    `[sync] Failed to import block ${i} of message uid ${message.uid}:`,
                    err.message
                  );
                }
              }
            }
          } catch (err) {
            console.error(`[sync] Failed to parse message uid ${message.uid}:`, err.message);
          }
        }
      }

      await state.update({
        lastStatus: 'success',
        lastSyncCompletedAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        lastImportedCount: importedCount,
      });

      return { skipped: false, importedCount };
    } finally {
      lock.release();
    }
  } catch (err) {
    await state.update({
      lastStatus: 'error',
      lastSyncCompletedAt: new Date(),
      lastError: err.message,
    });
    throw err;
  } finally {
    try {
      await client.logout();
    } catch (_) {
      // connection may already be closed - safe to ignore
    }
  }
}

module.exports = { runSync };
