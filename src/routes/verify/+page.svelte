<!-- PATH: sotano-tierlist/src/routes/verify/+page.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let message = $state('');

	onMount(async () => {
		const token = $page.url.searchParams.get('token');
		if (!token) { status = 'error'; message = 'Token inválido'; return; }
		try {
			const res = await fetch(`/api/verify?token=${token}`);
			const data = await res.json();
			if (!res.ok) { status = 'error'; message = data.message; return; }
			status = 'success';
			message = data.name;
			setTimeout(() => goto('/login'), 3000);
		} catch {
			status = 'error';
			message = 'Error de conexión';
		}
	});
</script>

<div class="bg"></div>
<div class="card">
	<div class="logo">Sótano<span>.</span></div>
	{#if status === 'loading'}
		<p class="msg muted">Verificando...</p>
	{:else if status === 'success'}
		<p class="msg success">✓ Cuenta verificada, {message}.<br/>Redirigiendo al login...</p>
	{:else}
		<p class="msg error">{message}</p>
	{/if}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
	:global(body) { margin:0; background:#080808; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',sans-serif; }
	.bg { position:fixed; inset:0; background: radial-gradient(ellipse at 20% 50%, #1a1a2e 0%, transparent 60%), #080808; z-index:0; }
	.card { position:relative; z-index:2; width:380px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:2px; padding:48px 40px 40px; }
	.logo { font-family:'Bebas Neue',sans-serif; font-size:42px; letter-spacing:4px; color:#fff; margin-bottom:32px; line-height:1; }
	.logo span { color:rgba(255,255,255,0.3); }
	.msg { font-size:13px; letter-spacing:0.5px; line-height:1.8; }
	.muted { color:rgba(255,255,255,0.3); }
	.success { color:rgba(100,255,150,0.8); }
	.error { color:rgba(255,100,100,0.8); }
</style>