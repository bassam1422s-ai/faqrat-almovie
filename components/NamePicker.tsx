import type { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  onSelect: (participant: Participant) => void;
};

export function NamePicker({ participants, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {participants.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="animate-blur-fade-up liquid-glass rounded-xl px-4 py-4 text-base font-medium text-white hover:bg-white/5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
