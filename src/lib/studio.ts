/** Only same-site relative paths may be used as a post-login redirect (blocks open redirects). */
export const safeRedirect = (value: string | null | undefined, fallback = '/dashboard') =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
