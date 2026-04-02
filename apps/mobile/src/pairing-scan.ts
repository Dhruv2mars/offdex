export function extractOffdexPairingUri(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed?.startsWith("offdex://pair?")) {
    return null;
  }

  return trimmed;
}
