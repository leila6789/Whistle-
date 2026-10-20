/** ESPN clocks are either "M:SS" or a sub-minute value like "12.5". */
export function parseClock(clock: string): number {
  const c = clock.trim();
  if (!c) return 0;
  if (c.includes(":")) {
    const [m, s] = c.split(":");
    const min = Number(m);
    const sec = Number(s);
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return 0;
    return min * 60 + sec;
  }
  const n = Number(c);
  return Number.isFinite(n) ? n : 0;
}

export function prettyClock(clock: string): string {
  if (!clock) return "0:00";
  if (clock.includes(":")) return clock;
  const n = Number(clock);
  if (!Number.isFinite(n)) return clock;
  const whole = Math.floor(Math.max(0, n));
  const frac = clock.includes(".") ? clock.slice(clock.indexOf(".")) : "";
  return `0:${String(whole).padStart(2, "0")}${frac}`;
}

export function clockLeft(clock: string): string {
  if (!clock || clock === "0.0" || clock === "0.00" || clock === "0:00") {
    return "no time left";
  }
  if (clock.includes(":")) return `${clock} left`;
  const n = Number(clock);
  if (!Number.isFinite(n) || n <= 0) return "no time left";
  const label = Number.isInteger(n) ? String(n) : String(n);
  return `${label} ${n === 1 ? "second" : "seconds"} left`;
}

export function periodShort(period: number): string {
  if (period <= 0) return "Pre";
  if (period <= 4) return `Q${period}`;
  if (period === 5) return "OT";
  return `${period - 4}OT`;
}

export function periodName(period: number): string {
  if (period <= 0) return "the game";
  if (period === 1) return "the 1st quarter";
  if (period === 2) return "the 2nd quarter";
  if (period === 3) return "the 3rd quarter";
  if (period === 4) return "the 4th quarter";
  if (period === 5) return "overtime";
  const n = period - 4;
  if (n === 2) return "2nd overtime";
  if (n === 3) return "3rd overtime";
  return `${n}th overtime`;
}

export function quarterHeadline(period: number): string {
  if (period <= 0) return "Pregame";
  if (period === 1) return "1st quarter";
  if (period === 2) return "2nd quarter";
  if (period === 3) return "3rd quarter";
  if (period === 4) return "4th quarter";
  if (period === 5) return "Overtime";
  const n = period - 4;
  if (n === 2) return "2nd overtime";
  if (n === 3) return "3rd overtime";
  return `${n}th overtime`;
}

export function clockLabel(period: number, clock: string): string {
  return `${periodShort(period)} · ${prettyClock(clock)}`;
}

const ET = "America/New_York";

export function formatTip(iso: string | undefined): string {
  if (!iso) return "Time TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatTipTime(iso: string | undefined): string {
  if (!iso) return "TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatDay(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
