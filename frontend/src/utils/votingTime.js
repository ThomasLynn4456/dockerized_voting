export async function fetchVotingTime() {
  const res = await fetch("/api/titles/voting-time");
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Failed to load voting schedule (${res.status})`);
  }
  return await res.json();
}

export async function saveVotingTime(payload) {
  const res = await fetch("/api/titles/voting-time", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update voting schedule");
  }
  return await res.json();
}

export function formatRemainingTime(deadlineStr, serverTimeOffset = 0) {
  if (!deadlineStr) return null;
  const target = new Date(deadlineStr).getTime();
  if (Number.isNaN(target)) return null;

  const now = Date.now() + serverTimeOffset;
  const diff = target - now;
  if (diff <= 0) {
    return { expired: true, text: "00:00:00", totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n) => String(n).padStart(2, "0");
  const text = days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { expired: false, text, totalMs: diff, days, hours, minutes, seconds };
}
