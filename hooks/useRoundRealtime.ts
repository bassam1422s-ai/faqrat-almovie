"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Rating, Round } from "@/lib/types";

type State = {
  round: Round | null;
  submittedIds: string[];
  ratings: Rating[];
  loading: boolean;
};

export function useRoundRealtime() {
  const [state, setState] = useState<State>({
    round: null,
    submittedIds: [],
    ratings: [],
    loading: true,
  });

  const refresh = useCallback(async () => {
    const { data: round } = await supabase
      .from("rounds")
      .select("*, movies(*)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!round) {
      setState({ round: null, submittedIds: [], ratings: [], loading: false });
      return;
    }

    const typedRound = round as unknown as Round;

    const { data: submissions } = await supabase
      .from("round_submissions")
      .select("participant_id")
      .eq("round_id", typedRound.id);

    let ratings: Rating[] = [];
    if (typedRound.status === "revealed") {
      const { data } = await supabase
        .from("ratings")
        .select("*, participants(*)")
        .eq("round_id", typedRound.id);
      ratings = (data as unknown as Rating[]) ?? [];
    }

    setState({
      round: typedRound,
      submittedIds: (submissions ?? []).map((s) => s.participant_id as string),
      ratings,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // Initial fetch on mount, then the subscription below keeps it live.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const channel = supabase
      .channel("rounds-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { ...state, refresh };
}
