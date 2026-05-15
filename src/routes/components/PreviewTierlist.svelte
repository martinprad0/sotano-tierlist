<!-- PATH: src/routes/components/PreviewTierlist.svelte -->

<script lang="ts">
  import type { UniClass, Tier } from '$lib/types/Class';
  import { CATEGORY_COLORS } from '$lib/types/Class';

  const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];
  const TIER_ORDER: Tier[] = ['S', 'A', 'B', 'C', 'D'];

  const TIER_COLORS: Record<Tier, string> = {
    S: '#ff7f7f', A: '#ffb07f', B: '#ffdf7f', C: '#f0ff7f', D: '#aeff7f', NONE: 'transparent'
  };

  let { classes, token }: { classes: UniClass[]; token: string } = $props();

  type VoteSummary = { up: number; down: number; stay: number; total: number };

  let voteSummaries = $state<Record<string, VoteSummary>>({});
  let loading = $state(true);

  $effect(() => {
    Promise.all(
      classes.map(c =>
        fetch(`/api/classes/${c.id}/today`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => {
            const active = (d.votes ?? []).filter((v: any) => !v.shadow_banned);
            voteSummaries[c.id] = {
              up: active.filter((v: any) => v.type === 'up').length,
              down: active.filter((v: any) => v.type === 'down').length,
              stay: active.filter((v: any) => v.type === 'stay').length,
              total: active.length
            };
          })
      )
    ).then(() => loading = false);
  });

  function computeNewTier(c: UniClass, summary: VoteSummary): Tier {
    if (!summary || summary.total === 0) return c.tier;
    const { up, down, stay, total } = summary;
    const tidx = TIER_ORDER.indexOf(c.tier);

    let direction = 0;
    if (up > down && up > stay) direction = -1; // up = lower index
    else if (down > up && down > stay) direction = 1;
    // tie between up and down → stay
    if (up === down && up > stay) direction = 0;

    const double = total >= 3 && (
      (direction === -1 && up === total) ||
      (direction === 1 && down === total)
    );
    const steps = double ? 2 : direction !== 0 ? 1 : 0;
    const newIdx = Math.max(0, Math.min(TIER_ORDER.length - 1, tidx + direction * steps));
    return TIER_ORDER[newIdx];
  }

  let previewByTier = $derived.by(() => {
    const tiers: Record<Tier, (UniClass & { newTier: Tier; moved: boolean })[]> = {
      S: [], A: [], B: [], C: [], D: [], NONE: []
    };
    for (const c of classes) {
      const summary = voteSummaries[c.id] ?? { up: 0, down: 0, stay: 0, total: 0 };
      const newTier = computeNewTier(c, summary);
      tiers[newTier].push({ ...c, newTier, moved: newTier !== c.tier });
    }
    return tiers;
  });
</script>

<div class="preview">
  <div class="preview-title">Vista previa de resultados</div>
  {#if loading}
    <p class="loading">Calculando...</p>
  {:else}
    <div class="tierlist">
      {#each TIERS as tier}
        <div class="tier-row">
          <div class="tier-label" style="background:{TIER_COLORS[tier]}; color:#111">{tier}</div>
          <div class="tier-content">
            {#each previewByTier[tier] ?? [] as c}
              <div
                class="class-chip"
                class:moved={c.moved}
                style="background:{c.category ? CATEGORY_COLORS[c.category] : 'rgba(255,255,255,0.06)'};"
                title="{c.name}{c.moved ? ` (era ${c.tier})` : ''}"
              >
                <span class="chip-abbr">{c.abbr}</span>
                {#if c.moved}
                  <span class="moved-indicator">{c.tier} → {c.newTier}</span>
                {/if}
              </div>
            {/each}
            {#if (previewByTier[tier] ?? []).length === 0}
              <span class="empty-hint">—</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
  .preview { padding: 16px 0; }
  .preview-title { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:16px; }
  .tierlist { border:1px solid rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
  .tier-row { display:flex; border-bottom:1px solid rgba(255,255,255,0.05); min-height:56px; }
  .tier-label { width:56px; min-width:56px; display:flex; align-items:center; justify-content:center; font-family:'Bebas Neue',sans-serif; font-size:24px; letter-spacing:2px; border-right:1px solid rgba(255,255,255,0.08); }
  .tier-content { flex:1; display:flex; flex-wrap:wrap; align-content:flex-start; gap:6px; padding:8px 10px; }
  .class-chip { display:inline-flex; flex-direction:column; align-items:center; border:1px solid rgba(255,255,255,0.08); border-radius:2px; padding:5px 10px; min-width:50px; }
  .class-chip.moved { border-color:rgba(255,220,100,0.5); }
  .chip-abbr { font-size:11px; letter-spacing:1px; color:rgba(255,255,255,0.9); text-transform:uppercase; }
  .moved-indicator { font-size:9px; color:rgba(255,220,100,0.8); letter-spacing:0.5px; margin-top:2px; }
  .empty-hint { color:rgba(255,255,255,0.1); font-size:13px; align-self:center; }
  .loading { color:rgba(255,255,255,0.3); font-size:13px; }
</style>