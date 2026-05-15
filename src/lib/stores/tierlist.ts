// PATH: src/lib/stores/tierlist.ts

import { writable, derived } from 'svelte/store';
import type { UniClass, Tier } from '$lib/types/Class';
import type { Vote } from '$lib/types/Vote';

export const classes = writable<UniClass[]>([]);
export const myVotes = writable<Vote[]>([]);
export const votingBlocked = writable<boolean>(false);

export const classesByTier = derived(classes, ($classes) => {
  const tiers: Record<Tier, UniClass[]> = { S: [], A: [], B: [], C: [], D: [], NONE: [] };
  for (const c of $classes) {
    if (c.tier !== 'NONE') tiers[c.tier].push(c);
  }
  return tiers;
});

export async function fetchClasses(token: string) {
  try {
    const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    classes.set(Array.isArray(data) ? data : []);
  } catch { classes.set([]); }
}

export async function fetchMyVotes(token: string) {
  try {
    const res = await fetch('/api/votes/mine', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    myVotes.set(Array.isArray(data) ? data : []);
  } catch { myVotes.set([]); }
}

export async function fetchVotingStatus(token: string) {
  try {
    const res = await fetch('/api/voting-status', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    votingBlocked.set(data.blocked);
  } catch {}
}