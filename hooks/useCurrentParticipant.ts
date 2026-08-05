"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredParticipant } from "@/lib/participant";

export function useCurrentParticipant() {
  const [participant, setParticipant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setParticipant(getStoredParticipant());
  }, []);

  useEffect(() => {
    // Reads localStorage post-mount to avoid an SSR hydration mismatch
    // (server always renders "no participant chosen yet").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    setReady(true);
  }, [refresh]);

  return { participant, ready, refresh };
}
