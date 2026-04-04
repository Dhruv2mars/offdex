export function createLaunchUrlGate() {
  const seen = new Set<string>();

  return (value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      return null;
    }

    seen.add(normalized);
    return normalized;
  };
}
