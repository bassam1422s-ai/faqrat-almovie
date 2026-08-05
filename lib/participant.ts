const ID_KEY = "mn_participant_id";
const NAME_KEY = "mn_participant_name";

export function getStoredParticipant(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(ID_KEY);
  const name = localStorage.getItem(NAME_KEY);
  if (!id || !name) return null;
  return { id, name };
}

export function storeParticipant(id: string, name: string) {
  localStorage.setItem(ID_KEY, id);
  localStorage.setItem(NAME_KEY, name);
}

export function clearStoredParticipant() {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(NAME_KEY);
}
