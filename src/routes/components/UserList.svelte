<!-- PATH: src/routes/components/UserList.svelte -->

<script lang="ts">
  let { token, onClose }: { token: string; onClose: () => void } = $props();

  let users = $state<any[]>([]);
  let expandedUser = $state<string | null>(null);
  let userVotes = $state<Record<string, any[]>>({});
  let loading = $state(true);

  $effect(() => {
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { users = d; loading = false; });
  });

  async function loadUserVotes(userId: string) {
    if (userVotes[userId]) { expandedUser = expandedUser === userId ? null : userId; return; }
    const res = await fetch(`/api/admin/users/${userId}/votes`, { headers: { Authorization: `Bearer ${token}` } });
    userVotes[userId] = await res.json();
    expandedUser = userId;
  }

  async function toggleBan(userId: string, banned: boolean) {
    await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ banned })
    });
    users = users.map(u => u.id === userId ? { ...u, shadow_banned: banned ? 1 : 0 } : u);
  }

  async function toggleShadowBanVote(voteId: string, userId: string, banned: boolean) {
    await fetch(`/api/admin/votes/${voteId}/shadowban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ banned })
    });
    userVotes[userId] = userVotes[userId].map((v: any) => v.id === voteId ? { ...v, shadow_banned: banned ? 1 : 0 } : v);
  }

  const voteIcon = (type: string) => type === 'up' ? '↑' : type === 'down' ? '↓' : '—';
  const voteColor = (type: string) => type === 'up' ? '#64ff96' : type === 'down' ? '#ff6464' : '#aaa';

  // Group votes by date
  function groupByDate(votes: any[]) {
    const map: Record<string, any[]> = {};
    for (const v of votes) {
      if (!map[v.date]) map[v.date] = [];
      map[v.date].push(v);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
    <div class="modal-header">
      <span class="modal-title">Usuarios</span>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    {#if loading}
      <p class="empty">Cargando...</p>
    {:else}
      <div class="user-list">
        {#each users as user}
          <div class="user-row" class:banned={user.shadow_banned}>
            <div class="user-info">
              <span class="user-name">{user.name}</span>
              <span class="user-email">{user.email}</span>
              {#if user.shadow_banned}<span class="ban-tag">baneado</span>{/if}
            </div>
            <div class="user-actions">
              <button class="small-btn info" onclick={() => loadUserVotes(user.id)}>
                {expandedUser === user.id ? 'Ocultar' : 'Ver votos'}
              </button>
              {#if !user.email.startsWith('m.prado@')}
                <button
                  class="small-btn"
                  class:danger={!user.shadow_banned}
                  class:unban={user.shadow_banned}
                  onclick={() => toggleBan(user.id, !user.shadow_banned)}
                >
                  {user.shadow_banned ? 'Desbanear' : 'Banear'}
                </button>
              {/if}
            </div>
          </div>

          {#if expandedUser === user.id && userVotes[user.id]}
            <div class="vote-history">
              {#each groupByDate(userVotes[user.id]) as [date, votes]}
                <div class="vote-date-group">
                  <div class="vote-date">{date}</div>
                  {#each votes as vote}
                    <div class="vote-entry" class:shadow-banned={vote.shadow_banned}>
                      <span class="vote-class">{vote.class_name ?? vote.class_id}</span>
                      <span class="vote-type" style="color:{voteColor(vote.type)}">{voteIcon(vote.type)}</span>
                      <button
                        class="tiny-btn"
                        onclick={() => toggleShadowBanVote(vote.id, user.id, !vote.shadow_banned)}
                      >
                        {vote.shadow_banned ? 'Activar' : 'Shadow ban'}
                      </button>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
  .overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; }
  .modal { background:#0d0d1a; border:1px solid rgba(255,255,255,0.1); border-radius:2px; padding:28px 32px; width:520px; max-height:80vh; display:flex; flex-direction:column; gap:16px; font-family:'DM Sans',sans-serif; overflow:hidden; }
  .modal-header { display:flex; justify-content:space-between; align-items:center; }
  .modal-title { font-size:16px; color:#fff; letter-spacing:1px; }
  .close-btn { background:none; border:none; color:rgba(255,255,255,0.3); font-size:16px; cursor:pointer; }
  .close-btn:hover { color:#fff; }
  .user-list { overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:4px; }
  .user-row { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:2px; }
  .user-row.banned { opacity:0.6; border-color:rgba(255,80,80,0.2); }
  .user-info { display:flex; flex-direction:column; gap:2px; }
  .user-name { font-size:13px; color:#e8e8e8; }
  .user-email { font-size:11px; color:rgba(255,255,255,0.3); }
  .ban-tag { font-size:9px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,80,80,0.6); }
  .user-actions { display:flex; gap:6px; }
  .small-btn { background:none; border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.5); border-radius:2px; padding:4px 10px; font-size:11px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
  .small-btn.info:hover { border-color:rgba(180,180,255,0.5); color:rgba(180,180,255,0.9); }
  .small-btn.danger { border-color:rgba(255,80,80,0.3); color:rgba(255,80,80,0.7); }
  .small-btn.danger:hover { border-color:rgba(255,80,80,0.7); color:rgba(255,80,80,1); }
  .small-btn.unban { border-color:rgba(100,255,150,0.3); color:rgba(100,255,150,0.7); }
  .small-btn.unban:hover { border-color:rgba(100,255,150,0.7); }
  .vote-history { padding:8px 12px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-top:none; border-radius:0 0 2px 2px; }
  .vote-date-group { margin-bottom:10px; }
  .vote-date { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:6px; }
  .vote-entry { display:flex; align-items:center; gap:10px; font-size:12px; padding:4px 0; }
  .vote-entry.shadow-banned { opacity:0.4; text-decoration:line-through; }
  .vote-class { flex:1; color:rgba(255,255,255,0.7); }
  .vote-type { font-size:14px; font-weight:bold; }
  .tiny-btn { background:none; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.3); border-radius:2px; padding:2px 7px; font-size:10px; cursor:pointer; font-family:'DM Sans',sans-serif; }
  .tiny-btn:hover { border-color:rgba(255,80,80,0.4); color:rgba(255,80,80,0.7); }
  .empty { color:rgba(255,255,255,0.3); font-size:13px; }
</style>