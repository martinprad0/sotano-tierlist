<!-- PATH: src/routes/components/VoteInfo.svelte -->

<script lang="ts">
  import type { Day } from '$lib/types/Vote';

  let { classId, className, onClose }: {
    classId: string;
    className: string;
    onClose: () => void;
  } = $props();

  let day = $state<Day | null>(null);
  let loading = $state(true);

  $effect(() => {
    if (!classId) return;
    loading = true;
    fetch(`/api/classes/${classId}/today`)
      .then(r => r.json())
      .then(d => { day = d; loading = false; });
  });

  const voteIcon = (type: string) => type === 'up' ? '↑' : type === 'down' ? '↓' : '—';
  const voteColor = (type: string) => type === 'up' ? '#64ff96' : type === 'down' ? '#ff6464' : '#aaa';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
    <div class="modal-header">
      <span class="modal-title">{className}</span>
      <span class="modal-sub">Votos de hoy</span>
    </div>

    {#if loading}
      <p class="empty">Cargando...</p>
    {:else if !day || day.votes.length === 0}
      <p class="empty">Sin votos hoy</p>
    {:else}
      <div class="vote-list">
        {#each day.votes as vote}
          <div class="vote-row" class:banned={vote.shadow_banned}>
            <span class="voter">{vote.voter_name}</span>
            <span class="vote-type" style="color:{voteColor(vote.type)}">{voteIcon(vote.type)}</span>
          </div>
        {/each}
      </div>
      <div class="summary">
        <span class="up">↑ {day.votes.filter(v => v.type === 'up').length}</span>
        <span class="stay">— {day.votes.filter(v => v.type === 'stay').length}</span>
        <span class="down">↓ {day.votes.filter(v => v.type === 'down').length}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
  }
  .modal {
    background: #0f0f1a; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2px; padding: 28px 32px; min-width: 280px;
  }
  .modal-header { margin-bottom: 20px; }
  .modal-title { font-size: 16px; color: #fff; letter-spacing: 1px; display: block; }
  .modal-sub { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.3); }
  .vote-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .vote-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
  .vote-row.banned { opacity: 0.3; text-decoration: line-through; }
  .voter { color: rgba(255,255,255,0.7); }
  .vote-type { font-size: 16px; font-weight: bold; }
  .summary { display: flex; gap: 16px; font-size: 13px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; }
  .up { color: #64ff96; }
  .stay { color: #aaa; }
  .down { color: #ff6464; }
  .empty { color: rgba(255,255,255,0.3); font-size: 13px; }
</style>