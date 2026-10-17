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
  // Check if text is predominantly a URL
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
  const match = trimmed.match(urlRegex);

  if (!match) {
    return null;
  }

  try {
    const rawUrl = match[0];
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
