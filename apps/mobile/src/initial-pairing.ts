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

export async function initializeWorkspaceFromLaunch(options: {
  candidates: Array<string | null | undefined>;
  connectFromPairingUri: (pairingUri: string) => Promise<void>;
  initialize: () => Promise<void>;
  onConnected?: () => void;
  onError?: () => void;
}) {
  const pairingUri = resolveInitialPairingUri(options.candidates);
  if (!pairingUri) {
    await options.initialize();
    return "initialized";
  }

  try {
    await options.connectFromPairingUri(pairingUri);
    options.onConnected?.();
    return "paired";
  } catch {
    options.onError?.();
    await options.initialize();
    return "initialized-after-pairing-error";
  }
}
