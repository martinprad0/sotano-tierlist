<!-- PATH: src/routes/+page.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth';
  import { classes, myVotes, classesByTier, votingBlocked, fetchClasses, fetchMyVotes, fetchVotingStatus } from '$lib/stores/tierlist';
  import TierRow from './components/TierRow.svelte';
  import ClassEditor from './components/ClassEditor.svelte';
  import PreviewTierlist from './components/PreviewTierlist.svelte';
  import UserList from './components/UserList.svelte';
  import MyVoteHistory from './components/MyVoteHistory.svelte';
  import type { Tier, Category } from '$lib/types/Class';
  import type { VoteType } from '$lib/types/Vote';

  const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

  let user = $state<any>(null);
  let isAdmin = $state(false);
  let adminMode = $state(false);
  let token = $state('');

  let newClassName = $state('');
  let newClassAbbr = $state('');

  let editorClassId = $state<string | null>(null);
  let editorClass = $derived($classes.find(c => c.id === editorClassId) ?? null);

  let showPreview = $state(false);
  let showUserList = $state(false);
  let showMyHistory = $state(false);

  let confirmRandomize = $state(false);

  let votesLeft = $derived(3 - $myVotes.length);

  onMount(() => {
    return auth.subscribe(async (u) => {
      user = u;
      if (!u) return;
      token = u.token;
      isAdmin = u.email.startsWith('m.prado@') && !u.email.match(/m\.prado\d/);
      await fetchClasses(token);
      await fetchMyVotes(token);
      await fetchVotingStatus(token);
    });
  });

  async function handleVote(classId: string, type: VoteType) {
    if (!user || votesLeft <= 0 || $votingBlocked) return;
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ class_id: classId, type })
    });
    if (res.ok) await fetchMyVotes(token);
  }

  async function handleRemoveVote(classId: string) {
    if (!user || $votingBlocked) return;
    const vote = $myVotes.find(v => v.class_id === classId);
    if (!vote) return;
    await fetch(`/api/votes/${vote.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await fetchMyVotes(token);
  }

  async function handleSave(id: string, name: string, abbr: string, tier: Tier, category: Category) {
    await fetch(`/api/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, abbr, tier, category })
    });
    await fetchClasses(token);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/classes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    editorClassId = null;
    await fetchClasses(token);
  }

  async function handleDrop(classId: string, toTier: Tier) {
    if (!isAdmin || !adminMode) return;
    await fetch(`/api/classes/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier: toTier })
    });
    await fetchClasses(token);
  }

  async function createClass() {
    if (!newClassName || !newClassAbbr) return;
    await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newClassName, abbr: newClassAbbr })
    });
    newClassName = ''; newClassAbbr = '';
    await fetchClasses(token);
  }

  async function randomize() {
    await fetch('/api/classes/randomize', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    confirmRandomize = false;
    await fetchClasses(token);
  }

  async function toggleVotingBlock() {
    await fetch('/api/admin/voting-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blocked: !$votingBlocked })
    });
    await fetchVotingStatus(token);
  }

  function logout() { auth.logout(); goto('/login'); }
</script>

<div class="bg"></div>

<nav>
  <div class="nav-logo">Sótano<span>.</span></div>
  <div class="nav-right">
    {#if user}
      {#if $votingBlocked && !isAdmin}
        <span class="votes-left blocked">Votación bloqueada</span>
      {:else if votesLeft > 0 && !isAdmin}
        <span class="votes-left">{votesLeft} voto{votesLeft !== 1 ? 's' : ''} restante{votesLeft !== 1 ? 's' : ''}</span>
      {/if}
      <button class="nav-btn" onclick={() => showMyHistory = true}>Mi historial</button>
      <button class="nav-btn" class:preview-on={showPreview} onclick={() => { showPreview = !showPreview; }}>
        {showPreview ? 'Ver actual' : 'Vista previa'}
      </button>
      {#if isAdmin}
        <button class="nav-btn" onclick={() => showUserList = true}>Usuarios</button>
        <button class="nav-btn" class:blocked-on={$votingBlocked} onclick={toggleVotingBlock}>
          {$votingBlocked ? 'Desbloquear votos' : 'Bloquear votos'}
        </button>
        <button class="nav-btn" class:active={adminMode} onclick={() => adminMode = !adminMode}>
          Admin {adminMode ? 'ON' : 'OFF'}
        </button>
      {/if}
      <span class="nav-name">{user.name}</span>
      <button class="nav-btn" onclick={logout}>Salir</button>
    {:else}
      <span class="nav-hint">Inicia sesión para votar</span>
      <button class="nav-btn accent" onclick={() => goto('/login')}>Entrar</button>
    {/if}
  </div>
</nav>

{#if isAdmin && adminMode}
  <div class="admin-bar">
    <div class="admin-section">
      <input bind:value={newClassName} placeholder="Nombre de la clase" class="admin-input" />
      <input bind:value={newClassAbbr} placeholder="Abrev." class="admin-input short" maxlength={6} />
      <button class="admin-btn" onclick={createClass}>+ Agregar clase</button>
    </div>
    <div class="admin-section">
      {#if confirmRandomize}
        <span class="warn-text">¿Seguro? Borra todo el historial de votos.</span>
        <button class="admin-btn danger" onclick={randomize}>Confirmar</button>
        <button class="admin-btn" onclick={() => confirmRandomize = false}>Cancelar</button>
      {:else}
        <button class="admin-btn danger" onclick={() => confirmRandomize = true}>⚄ Randomizar</button>
      {/if}
    </div>
  </div>
{/if}

<main class:has-admin-bar={isAdmin && adminMode}>
  {#if showPreview}
    <PreviewTierlist classes={$classes} {token} />
  {:else}
    <div class="tierlist">
      {#each TIERS as tier}
        <TierRow
          {tier}
          classes={$classesByTier[tier] ?? []}
          myVotes={$myVotes}
          isAdmin={isAdmin && adminMode}
          votingBlocked={$votingBlocked}
          onVote={handleVote}
          onRemoveVote={handleRemoveVote}
          onInfoClick={(id) => editorClassId = id}
          onDrop={handleDrop}
        />
      {/each}
    </div>
  {/if}
</main>

{#if editorClass}
  <ClassEditor
    uniClass={editorClass}
    {isAdmin}
    {token}
    onClose={() => editorClassId = null}
    onSave={handleSave}
    onDelete={handleDelete}
  />
{/if}

{#if showMyHistory}
  <MyVoteHistory {token} onClose={() => showMyHistory = false} />
{/if}

{#if showUserList}
  <UserList {token} onClose={() => showUserList = false} />
{/if}

<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
  :global(body) { margin:0; background:#080808; min-height:100vh; font-family:'DM Sans',sans-serif; color:#e8e8e8; }
  .bg { position:fixed; inset:0; background: radial-gradient(ellipse at 20% 50%, #1a1a2e 0%, transparent 60%), #080808; z-index:0; }
  nav { position:fixed; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:56px; background:rgba(8,8,8,0.9); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.06); }
  .nav-logo { font-family:'Bebas Neue',sans-serif; font-size:24px; letter-spacing:3px; color:#fff; }
  .nav-logo span { color:rgba(255,255,255,0.3); }
  .nav-right { display:flex; align-items:center; gap:10px; }
  .nav-name { font-size:12px; color:rgba(255,255,255,0.4); }
  .nav-hint { font-size:11px; color:rgba(255,255,255,0.25); letter-spacing:1px; }
  .votes-left { font-size:11px; letter-spacing:1px; color:rgba(180,180,255,0.6); }
  .votes-left.blocked { color:rgba(255,100,100,0.6); }
  .nav-btn { font-size:11px; letter-spacing:1px; text-transform:uppercase; background:none; border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.5); border-radius:2px; padding:5px 12px; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
  .nav-btn:hover, .nav-btn.active { border-color:rgba(255,220,100,0.5); color:rgba(255,220,100,0.9); }
  .nav-btn.accent { border-color:rgba(255,255,255,0.4); color:#fff; }
  .nav-btn.preview-on { border-color:rgba(100,255,180,0.5); color:rgba(100,255,180,0.9); }
  .nav-btn.blocked-on { border-color:rgba(255,100,100,0.5); color:rgba(255,100,100,0.9); }
  .admin-bar { position:fixed; top:56px; left:0; right:0; z-index:19; display:flex; align-items:center; justify-content:space-between; padding:10px 32px; background:rgba(20,15,30,0.95); backdrop-filter:blur(8px); border-bottom:1px solid rgba(255,220,100,0.1); gap:16px; }
  .admin-section { display:flex; gap:8px; align-items:center; }
  .admin-input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#e8e8e8; border-radius:2px; padding:7px 12px; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; }
  .admin-input.short { width:72px; }
  .admin-btn { background:none; border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.7); border-radius:2px; padding:7px 14px; font-size:12px; letter-spacing:1px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; white-space:nowrap; }
  .admin-btn:hover { border-color:rgba(255,255,255,0.4); color:#fff; }
  .admin-btn.danger { border-color:rgba(255,100,100,0.3); color:rgba(255,100,100,0.7); }
  .admin-btn.danger:hover { border-color:rgba(255,100,100,0.7); color:rgba(255,100,100,1); }
  .warn-text { font-size:12px; color:rgba(255,180,100,0.8); }
  main { position:relative; z-index:1; padding-top:72px; max-width:900px; margin:0 auto; padding-bottom:40px; }
  main.has-admin-bar { padding-top:114px; }
  .tierlist { border:1px solid rgba(255,255,255,0.08); border-radius:2px; margin-top:16px; }
</style>