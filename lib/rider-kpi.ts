// Pure helpers — importable from both server and client

export type RiderTier = "bronze" | "silver" | "gold" | "diamond";

export type BadgeId =
  | "first_job" | "jobs_10" | "jobs_50" | "jobs_100"
  | "km_500" | "km_1000" | "km_5000"
  | "streak_7" | "streak_30" | "acceptance_pro";

export type Badge = { id: BadgeId; label: string; emoji: string; earned: boolean };

export function computeTier(lifetimeCompleted: number): RiderTier {
  if (lifetimeCompleted >= 100) return "diamond";
  if (lifetimeCompleted >= 50)  return "gold";
  if (lifetimeCompleted >= 20)  return "silver";
  return "bronze";
}

export function computeStreak(
  shifts: Array<{ clocked_in_at: string; jobs_completed: number }>
): number {
  const workDays = new Set(
    shifts
      .filter(s => (s.jobs_completed ?? 0) > 0)
      .map(s => {
        const d = new Date(new Date(s.clocked_in_at).getTime() + 7 * 3600 * 1000);
        return d.toISOString().slice(0, 10);
      })
  );
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (workDays.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

const BADGE_DEFS: Array<{
  id: BadgeId; label: string; emoji: string;
  condition: (args: {
    lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
    monthAcceptanceRate: number | null; monthAttempted: number;
  }) => boolean;
}> = [
  { id: "first_job",      label: "งานแรก",     emoji: "🎯", condition: s => s.lifetimeCompleted >= 1   },
  { id: "jobs_10",        label: "10 งาน",      emoji: "⭐", condition: s => s.lifetimeCompleted >= 10  },
  { id: "jobs_50",        label: "50 งาน",      emoji: "🏆", condition: s => s.lifetimeCompleted >= 50  },
  { id: "jobs_100",       label: "100 งาน",     emoji: "💯", condition: s => s.lifetimeCompleted >= 100 },
  { id: "km_500",         label: "500 กม.",     emoji: "🛵", condition: s => s.lifetimeDistanceKm >= 500  },
  { id: "km_1000",        label: "1,000 กม.",   emoji: "🚀", condition: s => s.lifetimeDistanceKm >= 1000 },
  { id: "km_5000",        label: "5,000 กม.",   emoji: "🏍", condition: s => s.lifetimeDistanceKm >= 5000 },
  { id: "streak_7",       label: "7 วันติด",   emoji: "🔥", condition: s => s.currentStreak >= 7  },
  { id: "streak_30",      label: "30 วันติด",  emoji: "💎", condition: s => s.currentStreak >= 30 },
  { id: "acceptance_pro", label: "Pro รับงาน", emoji: "⚡", condition: s => (s.monthAcceptanceRate ?? 0) >= 0.95 && s.monthAttempted >= 5 },
];

export function computeBadges(args: {
  lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
  monthAcceptanceRate: number | null; monthAttempted: number;
}): Badge[] {
  return BADGE_DEFS.map(b => ({ id: b.id, label: b.label, emoji: b.emoji, earned: b.condition(args) }));
}
