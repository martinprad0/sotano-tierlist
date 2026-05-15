<!-- PATH: src/routes/components/ClassEditor.svelte -->

<script lang="ts">
  import type { UniClass, Tier, Category } from '$lib/types/Class';
  import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_COLORS_LIGHT } from '$lib/types/Class';
  import type { Vote } from '$lib/types/Vote';

  const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];
  const CATEGORIES: Category[] = ['algebra', 'geometry', 'applied', 'analysis', 'logic'];

  let {
    uniClass, isAdmin = false, token = '',
    onClose, onSave, onDelete
  }: {
    uniClass: UniClass; isAdmin: boolean; token: string;
    onClose: () => void;
    onSave: (id: string, name: string, abbr: string, tier: Tier, category: Category) => void;
    onDelete: (id: string) => void;
  } = $props();

  let name = $state(uniClass.name);
  let abbr = $state(uniClass.abbr);
  let tier = $state<Tier>(uniClass.tier);
  let category = $state<Category>(uniClass.category);
  let days = $state<any[]>([]);
  let expandedDay = $state<string | null>(null);
  let loading = $state(true);
  let confirmDelete = $state(false);

  const voteIcon = (type: string) => type === 'up' ? '↑' : type === 'down' ? '↓' : '—';
  const voteColor = (type: string) => type === 'up' ? '#64ff96' : type === 'down' ? '#ff6464' : '#aaa';

  function computeWinner(votes: Vote[]) {
    const active = votes.filter((v: any) => !v.shadow_banned);
    const up = active.filter((v: any) => v.type === 'up').length;
    const down = active.filter((v: any) => v.type === 'down').length;
    const stay = active.filter((v: any) => v.type === 'stay').length;
    if (up === 0 && down === 0 && stay === 0) return '—';
    if (up >= down && up >= stay) return '↑ Subió';
    if (down > up && down > stay) return '↓ Bajó';
    return '— Se quedó';
  }

  $effect(() => {
    fetch(`/api/classes/${uniClass.id}/days`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { days = d; loading = false; });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="document">

    <div class="modal-header">
      <div class="header-left">
        <div class="class-id">ID: {uniClass.id}</div>
        {#if isAdmin}
          <div class="field-row">
            <input class="name-input" bind:value={name} placeholder="Nombre" />
            <input class="abbr-input" bind:value={abbr} placeholder="Abrev." maxlength={6} />
            <select class="tier-select" bind:value={tier}>
              {#each TIERS as t}<option value={t}>{t}</option>{/each}
            </select>
            <button class="save-btn" onclick={() => onSave(uniClass.id, name, abbr, tier, category)}>Guardar</button>
          </div>
          <div class="category-row">
            {#each CATEGORIES as cat}
              <button
                class="cat-btn"
                class:selected={category === cat}
                style="background:{category === cat ? CATEGORY_COLORS_LIGHT[cat!] : CATEGORY_COLORS[cat!]}; color: {category === cat ? '#111' : '#eee'};"
                title={CATEGORY_LABELS[cat!]}
                onclick={() => category = cat}
              >
                {CATEGORY_LABELS[cat!].slice(0, 3).toUpperCase()}
              </button>
            {/each}
            <button class="cat-btn" class:selected={!category} onclick={() => category = null} title="Sin categoría">—</button>
          </div>
        {:else}
          <div class="class-title">{uniClass.name} <span class="class-abbr">({uniClass.abbr})</span></div>
          <div class="class-meta">
            Tier: <strong>{uniClass.tier}</strong>
            {#if uniClass.category}
              &nbsp;·&nbsp;
              <span class="cat-tag" style="color:{CATEGORY_COLORS_LIGHT[uniClass.category]}">{CATEGORY_LABELS[uniClass.category]}</span>
            {/if}
          </div>
        {/if}
      </div>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <div class="section-title">Historial de votos</div>
    <div class="day-list">
      {#if loading}
        <p class="empty">Cargando...</p>
      {:else if days.length === 0}
        <p class="empty">Sin historial</p>
      {:else}
        {#each days as day}
          <div class="day-row">
            <button class="day-header" onclick={() => expandedDay = expandedDay === day.date ? null : day.date}>
              <span class="day-date">{day.date}</span>
              <span class="day-winner">{computeWinner(day.votes)}</span>
              {#if day.tier_before !== undefined}
                <span class="day-pos">{day.tier_before} → {day.tier_after ?? '?'}</span>
              {/if}
              <span class="day-chevron">{expandedDay === day.date ? '▲' : '▼'}</span>
            </button>
            {#if expandedDay === day.date}
              <div class="vote-list">
                <div class="winner-row">Winner: {computeWinner(day.votes)}</div>
                {#each day.votes as vote}
                  <div class="vote-row" class:banned={vote.shadow_banned}>
                    <span class="voter">{vote.voter_name}</span>
                    <span class="vote-type" style="color:{voteColor(vote.type)}">{voteIcon(vote.type)}</span>
                    {#if vote.shadow_banned}<span class="banned-tag">shadow ban</span>{/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    {#if isAdmin}
      <div class="delete-section">
        {#if confirmDelete}
          <span class="confirm-text">¿Seguro? Los votos se moverán a None.</span>
          <button class="danger-btn" onclick={() => onDelete(uniClass.id)}>Confirmar</button>
          <button class="cancel-btn" onclick={() => confirmDelete = false}>Cancelar</button>
        {:else}
          <button class="danger-btn" onclick={() => confirmDelete = true}>Borrar clase</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
  .overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; }
  .modal { background:#0d0d1a; border:1px solid rgba(255,255,255,0.1); border-radius:2px; padding:28px 32px; width:500px; max-height:80vh; display:flex; flex-direction:column; gap:16px; font-family:'DM Sans',sans-serif; overflow:hidden; }
  .modal-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .header-left { flex:1; }
  .class-id { font-size:10px; letter-spacing:1px; color:rgba(255,255,255,0.2); margin-bottom:10px; font-family:monospace; }
  .field-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  .category-row { display:flex; gap:6px; flex-wrap:wrap; }
  .cat-btn { border:1px solid rgba(255,255,255,0.1); border-radius:2px; padding:4px 10px; font-size:11px; letter-spacing:1px; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
  .cat-btn.selected { border-color: rgba(255,255,255,0.4); }
  .name-input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#e8e8e8; border-radius:2px; padding:7px 10px; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; flex:1; min-width:120px; }
  .abbr-input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#e8e8e8; border-radius:2px; padding:7px 10px; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; width:72px; }
  .tier-select { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#e8e8e8; border-radius:2px; padding:7px 10px; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; cursor:pointer; }
  .save-btn { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e8e8e8; border-radius:2px; padding:7px 14px; font-size:12px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; }
  .save-btn:hover { background:rgba(255,255,255,0.15); }
  .class-title { font-size:16px; color:#fff; margin-bottom:4px; }
  .class-abbr { color:rgba(255,255,255,0.4); font-size:13px; }
  .class-meta { font-size:12px; color:rgba(255,255,255,0.4); }
  .cat-tag { font-size:12px; }
  .close-btn { background:none; border:none; color:rgba(255,255,255,0.3); font-size:16px; cursor:pointer; padding:0; flex-shrink:0; }
  .close-btn:hover { color:#fff; }
  .section-title { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.3); border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; }
  .day-list { overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:4px; }
  .day-row { border:1px solid rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
  .day-header { width:100%; display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:none; cursor:pointer; padding:10px 14px; color:#e8e8e8; font-family:'DM Sans',sans-serif; text-align:left; transition:background 0.15s; }
  .day-header:hover { background:rgba(255,255,255,0.07); }
  .day-date { font-size:12px; color:rgba(255,255,255,0.5); flex:1; }
  .day-winner { font-size:12px; color:rgba(255,255,255,0.7); }
  .day-pos { font-size:11px; color:rgba(180,180,255,0.6); letter-spacing:1px; }
  .day-chevron { font-size:10px; color:rgba(255,255,255,0.3); }
  .vote-list { padding:8px 14px 12px; display:flex; flex-direction:column; gap:6px; }
  .winner-row { font-size:11px; letter-spacing:1px; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:6px; }
  .vote-row { display:flex; align-items:center; justify-content:space-between; font-size:13px; }
  .vote-row.banned { opacity:0.3; }
  .voter { color:rgba(255,255,255,0.7); }
  .vote-type { font-size:15px; font-weight:bold; }
  .banned-tag { font-size:9px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,100,100,0.5); border:1px solid rgba(255,100,100,0.2); border-radius:2px; padding:1px 5px; }
  .delete-section { display:flex; align-items:center; gap:10px; border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; }
  .confirm-text { font-size:12px; color:rgba(255,180,100,0.8); flex:1; }
  .danger-btn { background:none; border:1px solid rgba(255,80,80,0.3); color:rgba(255,80,80,0.7); border-radius:2px; padding:7px 14px; font-size:12px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
  .danger-btn:hover { border-color:rgba(255,80,80,0.7); color:rgba(255,80,80,1); }
  .cancel-btn { background:none; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); border-radius:2px; padding:7px 14px; font-size:12px; cursor:pointer; font-family:'DM Sans',sans-serif; }
  .empty { color:rgba(255,255,255,0.25); font-size:13px; }
</style>