<!-- PATH: src/routes/components/TierRow.svelte -->

<script lang="ts">
  import type { UniClass, Tier } from '$lib/types/Class';
  import type { Vote, VoteType } from '$lib/types/Vote';
  import ClassCard from './ClassCard.svelte';

  const TIER_COLORS: Record<Tier, string> = {
    S: '#ff7f7f', A: '#ffb07f', B: '#ffdf7f', C: '#f0ff7f', D: '#aeff7f', NONE: 'transparent'
  };

  let {
    tier, classes, myVotes, isAdmin, votingBlocked,
    onVote, onRemoveVote, onInfoClick, onDrop
  }: {
    tier: Tier;
    classes: UniClass[];
    myVotes: Vote[];
    isAdmin: boolean;
    votingBlocked: boolean;
    onVote: (classId: string, type: VoteType) => void;
    onRemoveVote: (classId: string) => void;
    onInfoClick: (classId: string) => void;
    onDrop: (classId: string, toTier: Tier) => void;
  } = $props();

  let dragOver = $state(false);

  function handleDragStart(e: DragEvent, classId: string) {
    e.dataTransfer?.setData('classId', classId);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault(); dragOver = false;
    const classId = e.dataTransfer?.getData('classId');
    if (classId) onDrop(classId, tier);
  }
</script>

<div
  class="tier-row" class:drag-over={dragOver}
  ondragover={(e) => { e.preventDefault(); dragOver = true; }}
  ondragleave={() => dragOver = false}
  ondrop={handleDrop}
  role="region" aria-label="Tier {tier}"
>
  <div class="tier-label" style="background:{TIER_COLORS[tier]}; color:#111">{tier}</div>
  <div class="tier-content">
    {#each classes as uniClass (uniClass.id)}
      {@const myVote = myVotes.find(v => v.class_id === uniClass.id) ?? null}
      <div draggable={isAdmin} ondragstart={(e) => handleDragStart(e, uniClass.id)} role="listitem">
        <ClassCard
          {uniClass} {myVote} {isAdmin} {votingBlocked}
          {onVote} {onRemoveVote} {onInfoClick}
          draggable={isAdmin}
        />
      </div>
    {/each}
    {#if classes.length === 0}
      <span class="empty-hint">—</span>
    {/if}
  </div>
</div>

<style>
  .tier-row { display:flex; border-bottom:1px solid rgba(255,255,255,0.05); min-height:64px; transition:background 0.15s; }
  .tier-row.drag-over { background:rgba(255,255,255,0.04); }
  .tier-label { width:64px; min-width:64px; display:flex; align-items:center; justify-content:center; font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:2px; border-right:1px solid rgba(255,255,255,0.08); }
  .tier-content { flex:1; display:flex; flex-wrap:wrap; align-content:flex-start; gap:8px; padding:10px 12px; }
  .empty-hint { color:rgba(255,255,255,0.1); font-size:13px; align-self:center; }
</style>