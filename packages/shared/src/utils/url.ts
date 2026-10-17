const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref',
  'xtok',
  'exln',
  'dlrf'
]);

/**
 * Extracts and sanitizes the primary URL from text if present.
 * Does not mutate original text; returns detected URL with tracking parameters stripped.
 */
export function extractAndSanitizeUrl(text: string): string | null {
  const trimmed = text.trim();
  
  // Check for https://, http://, www., or common domains
  let rawUrl: string | null = null;
  const httpMatch = trimmed.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  if (httpMatch) {
    rawUrl = httpMatch[0];
  } else {
    const wwwMatch = trimmed.match(/(?:^|\s)(www\.[^\s<>"{}|\\^`[\]]+)/i);
    if (wwwMatch) {
      rawUrl = `https://${wwwMatch[1]}`;
    } else {
      const domainMatch = trimmed.match(/(?:^|\s)([a-zA-Z0-9-]+\.(?:com|org|net|io|dev|app|edu|gov|co|in|ai|me)(?:\/[^\s<>"{}|\\^`[\]]*)?)/i);
      if (domainMatch) {
        rawUrl = `https://${domainMatch[1]}`;
      }
    }
  }

  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);

    // Filter tracking queries
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.has(lower) || lower.startsWith('utm_')) {
        paramsToDelete.push(key);
      }
    });

    for (const key of paramsToDelete) {
      parsed.searchParams.delete(key);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Checks if the text appears to be code or configuration.
 */
export function detectCodeSnippet(text: string): boolean {
  const codeIndicators = [
    /^(import|export|const|let|var|function|class|def|package|public|private)\s+/m,
    /[{}[\];]\s*$/m,
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/im,
    /^\s*(\{|\[)[\s\S]*(\}|\])\s*$/,
    /^\s*(version:|services:|FROM |RUN |WORKDIR )/m
  ];

  return codeIndicators.some((regex) => regex.test(text));
}
