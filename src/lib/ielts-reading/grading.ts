export function normalizeReadingAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function gradeReadingAnswer(value: string, accepted: string[], wordLimit: number) {
  const normalized = normalizeReadingAnswer(value);
  return normalized.length > 0 && normalized.split(' ').length <= wordLimit &&
    accepted.some(answer => normalizeReadingAnswer(answer) === normalized);
}
