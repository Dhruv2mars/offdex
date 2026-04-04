import { extractOffdexPairingUri } from "./pairing-scan";

export function resolveInitialPairingUri(
  candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    const pairingUri = extractOffdexPairingUri(candidate);
    if (pairingUri) {
      return pairingUri;
    }
  }

  return null;
}
