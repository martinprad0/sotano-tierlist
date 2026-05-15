<!-- PATH: src/routes/components/MyVoteHistory.svelte -->

<script lang="ts">
  let { token, onClose }: { token: string; onClose: () => void } = $props();

  let days = $state<any[]>([]);
  let expandedDay = $state<string | null>(null);
  let loading = $state(true);

  const voteIcon = (type: string) => type === 'up' ? '↑' : type === 'down' ? '↓' : '—';
  const voteColor = (type: string) => type === 'up' ? '#64ff96' : type === 'down' ? '#ff6464' : '#aaa';

  $effect(() => {
    fetch('/api/votes/history', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { days = d; loading = false; });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
    <div class="modal-header">
      <span class="modal-title">Mi historial de votos</span>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    {#if loading}
      <p class="empty">Cargando...</p>
    {:else if days.length === 0}
      <p class="empty">Sin historial</p>
    {:else}
      <div class="day-list">
        {#each days as day}
          <div class="day-row">
            <button class="day-header" onclick={() => expandedDay = expandedDay === day.date ? null : day.date}>
              <span class="day-date">{day.date}</span>
              <span class="day-count">{day.votes.length} voto{day.votes.length !== 1 ? 's' : ''}</span>
              <span class="chevron">{expandedDay === day.date ? '▲' : '▼'}</span>
            </button>
            {#if expandedDay === day.date}
              <div class="vote-list">
                {#each day.votes as vote}
                  <div class="vote-entry">
                    <span class="class-name">{vote.class_name ?? vote.class_id}</span>
                    <span class="vote-type" style="color:{voteColor(vote.type)}">{voteIcon(vote.type)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
  .overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; }
  .modal { background:#0d0d1a; border:1px solid rgba(255,255,255,0.1); border-radius:2px; padding:28px 32px; width:440px; max-height:80vh; display:flex; flex-direction:column; gap:16px; font-family:'DM Sans',sans-serif; overflow:hidden; }
  .modal-header { display:flex; justify-content:space-between; align-items:center; }
  .modal-title { font-size:15px; color:#fff; letter-spacing:1px; }
  .close-btn { background:none; border:none; color:rgba(255,255,255,0.3); font-size:16px; cursor:pointer; }
  .close-btn:hover { color:#fff; }
  .day-list { overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:4px; }
  .day-row { border:1px solid rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
  .day-header { width:100%; display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:none; cursor:pointer; padding:10px 14px; color:#e8e8e8; font-family:'DM Sans',sans-serif; text-align:left; transition:background 0.15s; }
  .day-header:hover { background:rgba(255,255,255,0.07); }
  .day-date { font-size:12px; color:rgba(255,255,255,0.5); flex:1; }
  .day-count { font-size:11px; color:rgba(255,255,255,0.3); }
  .chevron { font-size:10px; color:rgba(255,255,255,0.3); }
  .vote-list { padding:8px 14px 12px; display:flex; flex-direction:column; gap:6px; }
  .vote-entry { display:flex; align-items:center; justify-content:space-between; font-size:13px; }
  .class-name { color:rgba(255,255,255,0.7); }
  .vote-type { font-size:15px; font-weight:bold; }
  .empty { color:rgba(255,255,255,0.3); font-size:13px; }
</style>