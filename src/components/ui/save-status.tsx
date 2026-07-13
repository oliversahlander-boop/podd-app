import { StatusBadge } from "./status-badge";
type State = "Ej sparat" | "Sparar…" | "Sparat" | "Sparat lokalt" | "Synkfel" | "Offline";
export function SaveStatus({ state }: { state: State }) { const tone = state === "Sparat" ? "success" : state === "Synkfel" ? "danger" : state === "Sparar…" || state === "Ej sparat" ? "warning" : "neutral"; return <StatusBadge tone={tone}>{state}</StatusBadge>; }
