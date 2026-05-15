<!-- PATH: src/routes/components/ClassCard.svelte -->

<script lang="ts">
  import type { UniClass } from '$lib/types/Class';
  import { CATEGORY_COLORS } from '$lib/types/Class';
  import type { Vote, VoteType } from '$lib/types/Vote';

  let {
    uniClass,
    myVote = null,
    isAdmin = false,
    votingBlocked = false,
    onVote,
    onRemoveVote,
    onInfoClick,
    draggable = false
  }: {
    uniClass: UniClass;
    myVote: Vote | null;
    isAdmin: boolean;
    votingBlocked: boolean;
    onVote: (classId: string, type: VoteType) => void;
    onRemoveVote: (classId: string) => void;
    onInfoClick: (classId: string) => void;
    draggable: boolean;
  } = $props();

  let locked = $state(false);
  let hovered = $state(false);
  let showTooltip = $derived(locked || hovered);
  let cardEl = $state<HTMLElement | null>(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  const canVoteUp = uniClass.tier !== 'S';
  const canVoteDown = uniClass.tier !== 'D';
  const showVoting = !isAdmin && !votingBlocked;
  const bgColor = uniClass.category ? CATEGORY_COLORS[uniClass.category] : 'rgba(255,255,255,0.06)';

  function updateTooltipPos() {
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    tooltipX = rect.left + rect.width / 2;
    tooltipY = rect.bottom + 6;
  }

  function handleClick(e: MouseEvent) {
    updateTooltipPos();
    locked = !locked;
  }

  function handleMouseEnter() {
    updateTooltipPos();
    hovered = true;
  }

  function handleInfoClick(e: MouseEvent) {
    e.stopPropagation();
    locked = false;
    onInfoClick(uniClass.id);
  }

  function handleVoteClick(e: MouseEvent, type: VoteType) {
    e.stopPropagation();
    locked = false;
    onVote(uniClass.id, type);
  }

  function handleRemoveClick(e: MouseEvent) {
    e.stopPropagation();
    locked = false;
    onRemoveVote(uniClass.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={cardEl}
  class="class-card"
  class:locked
  class:voted={!!myVote}
  class:admin={isAdmin}
  style="background:{bgColor};"
  {draggable}
  role="button"
  tabindex="0"
  onclick={handleClick}
  onmouseenter={handleMouseEnter}
  onmouseleave={() => { if (!locked) hovered = false; }}
>
  <span class="abbr">{uniClass.abbr}</span>

  {#if myVote}
    <div class="vote-indicator" title="Tu voto">
      {myVote.type === 'up' ? '↑' : myVote.type === 'down' ? '↓' : '—'}
    </div>
  {/if}
</div>

{#if showTooltip}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="tooltip"
    style="left:{tooltipX}px; top:{tooltipY}px;"
    onclick={(e) => e.stopPropagation()}
    onmouseenter={() => hovered = true}
    onmouseleave={() => { if (!locked) hovered = false; }}
    role="tooltip"
  >
    <span class="tooltip-name">{uniClass.name}</span>
    <div class="actions">
      <button class="action-btn info" onclick={handleInfoClick} title={isAdmin ? 'Editar' : 'Ver votos'}>
        {isAdmin ? '✎' : 'i'}
      </button>
      {#if showVoting}
        {#if myVote}
          <button class="action-btn remove" onclick={handleRemoveClick} title="Quitar voto">✕</button>
        {:else}
          {#if canVoteUp}
            <button class="action-btn up" onclick={(e) => handleVoteClick(e, 'up')} title="Subir">↑</button>
          {/if}
          <button class="action-btn stay" onclick={(e) => handleVoteClick(e, 'stay')} title="Mantener">—</button>
          {#if canVoteDown}
            <button class="action-btn down" onclick={(e) => handleVoteClick(e, 'down')} title="Bajar">↓</button>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .class-card {
    position: relative; display: inline-flex; align-items: center;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 2px;
    padding: 8px 12px; cursor: pointer; min-width: 60px;
    transition: border-color 0.15s, filter 0.15s; user-select: none;
  }
  .class-card:hover { filter: brightness(1.3); border-color: rgba(255,255,255,0.25); }
  .class-card.voted { border-color: rgba(180,180,255,0.4); }
  .class-card.locked { border-color: rgba(255,220,100,0.7); box-shadow: 0 0 0 1px rgba(255,220,100,0.3); }
  .class-card.admin { cursor: grab; }

  .abbr { font-size: 12px; letter-spacing: 1px; color: rgba(255,255,255,0.9); text-transform: uppercase; font-weight: 500; }

  .tooltip {
    position: fixed;
    transform: translateX(-50%);
    background: rgba(10,10,20,0.97);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 2px; padding: 8px 12px;
    z-index: 9999; white-space: nowrap;
    display: flex; flex-direction: column; gap: 6px; align-items: center;
    pointer-events: all;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .tooltip-name { font-size: 12px; color: rgba(255,255,255,0.8); letter-spacing: 0.5px; }
  .actions { display: flex; gap: 4px; }

  .action-btn { background: none; border: none; cursor: pointer; font-size: 15px; padding: 3px 7px; border-radius: 2px; transition: background 0.15s; }
  .action-btn.up { color: rgba(100,255,150,0.9); }
  .action-btn.up:hover { background: rgba(100,255,150,0.15); }
  .action-btn.stay { color: rgba(255,255,255,0.6); }
  .action-btn.stay:hover { background: rgba(255,255,255,0.1); }
  .action-btn.down { color: rgba(255,100,100,0.9); }
  .action-btn.down:hover { background: rgba(255,100,100,0.15); }
  .action-btn.remove { color: rgba(255,100,100,0.7); }
  .action-btn.remove:hover { background: rgba(255,100,100,0.15); }
  .action-btn.info { color: rgba(180,180,255,0.7); font-style: italic; font-weight: bold; }
  .action-btn.info:hover { background: rgba(180,180,255,0.1); }

  .vote-indicator {
    position: absolute; top: -6px; right: -6px; font-size: 10px;
    background: rgba(180,180,255,0.3); border-radius: 50%;
    width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
  }
</style>