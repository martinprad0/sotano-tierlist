<!-- PATH: sotano-tierlist/src/routes/login/+page.svelte -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth';
	import { onMount } from 'svelte';

	let tab = $state<'login' | 'register'>('login');
	let prefix = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let loading = $state(false);

	onMount(() => {
		return auth.subscribe((user) => {
			if (user) goto('/');
		});
	});

	async function handleLogin() {
		error = '';
		if (!prefix) { error = 'Ingresa tu usuario'; return; }
		loading = true;
		try {
			const res = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prefix, password })
			});
			const data = await res.json();
			if (!res.ok) { error = data.message; return; }
			auth.login({ email: `${prefix}@uniandes.edu.co`, name: data.name, token: data.token });
			goto('/');
		} catch { error = 'Error de conexión'; }
		finally { loading = false; }
	}

	async function handleRegister() {
		error = '';
		if (!prefix) { error = 'Ingresa tu usuario'; return; }
		if (password.length < 8) { error = 'Mínimo 8 caracteres'; return; }
		if (!name) { error = 'Ingresa tu nombre'; return; }
		loading = true;
		try {
			const res = await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prefix, password, name })
			});
			const data = await res.json();
			if (!res.ok) { error = data.message; return; }
			error = '✓ Revisa tu correo para verificar tu cuenta';
		} catch { error = 'Error de conexión'; }
		finally { loading = false; }
	}
</script>

<div class="bg"></div>
<div class="noise"></div>

<div class="card">
	<div class="logo">Sótano<span>.</span></div>
	<div class="tagline">Tierlist democrático</div>

	<div class="tabs">
		<button class="tab" class:active={tab === 'login'} onclick={() => { tab = 'login'; error = ''; }}>
			Entrar
		</button>
		<button class="tab" class:active={tab === 'register'} onclick={() => { tab = 'register'; error = ''; }}>
			Registrarse
		</button>
	</div>

	{#if tab === 'login'}
		<div class="field">
			<label>Usuario uniandes</label>
			<div class="input-row">
				<input type="text" bind:value={prefix} placeholder="tu.nombre" />
				<span class="suffix">@uniandes.edu.co</span>
			</div>
		</div>
		<div class="field">
			<label>Contraseña <span class="muted">(no uses tu contraseña real)</span></label>
			<input type="password" bind:value={password} placeholder="••••••••" />
		</div>
		{#if error}<div class="error">{error}</div>{/if}
		<button class="btn" onclick={handleLogin} disabled={loading}>
			{loading ? 'Entrando...' : 'Entrar'}
		</button>
		<div class="divider">¿Olvidaste tu contraseña?</div>
	{:else}
		<div class="field">
			<label>Usuario uniandes</label>
			<div class="input-row">
				<input type="text" bind:value={prefix} placeholder="tu.nombre" />
				<span class="suffix">@uniandes.edu.co</span>
			</div>
		</div>
		<div class="field">
			<label>Nombre</label>
			<input type="text" bind:value={name} placeholder="Como te conocen" />
		</div>
		<div class="field">
			<label>Contraseña <span class="muted">(no uses tu contraseña real)</span></label>
			<input type="password" bind:value={password} placeholder="••••••••" />
		</div>
		{#if error}<div class="error" class:success={error.startsWith('✓')}>{error}</div>{/if}
		<button class="btn" onclick={handleRegister} disabled={loading}>
			{loading ? 'Creando cuenta...' : 'Crear cuenta'}
		</button>
		<div class="divider">Recibirás un correo de verificación</div>
	{/if}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
	:global(body) { margin:0; background:#080808; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',sans-serif; color:#e8e8e8; }
	.bg { position:fixed; inset:0; background: radial-gradient(ellipse at 20% 50%, #1a1a2e 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0d0d1a 0%, transparent 50%), #080808; z-index:0; }
	.noise { position:fixed; inset:0; z-index:1; opacity:0.5; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); }
	.card { position:relative; z-index:2; width:420px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:2px; padding:48px 40px 40px; }
	.logo { font-family:'Bebas Neue',sans-serif; font-size:42px; letter-spacing:4px; color:#fff; margin-bottom:4px; line-height:1; }
	.logo span { color:rgba(255,255,255,0.3); }
	.tagline { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.25); margin-bottom:40px; }
	.tabs { display:flex; margin-bottom:32px; border-bottom:1px solid rgba(255,255,255,0.08); }
	.tab { font-size:12px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.3); background:none; border:none; cursor:pointer; padding:0 0 14px; margin-right:24px; transition:color 0.2s; position:relative; }
	.tab.active { color:#fff; }
	.tab.active::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:#fff; }
	.field { margin-bottom:20px; }
	.field label { display:block; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-bottom:8px; }
	.input-row { display:flex; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; transition:border-color 0.2s; }
	.input-row:focus-within { border-color:rgba(255,255,255,0.25); }
	.input-row input { flex:1; background:none; border:none; padding:12px 14px; color:#e8e8e8; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; min-width:0; }
	.input-row input::placeholder { color:rgba(255,255,255,0.15); }
	.suffix { font-size:12px; color:rgba(255,255,255,0.2); padding-right:14px; white-space:nowrap; }
	.field input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:2px; padding:12px 14px; color:#e8e8e8; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s; }
	.field input:focus { border-color:rgba(255,255,255,0.25); }
	.field input::placeholder { color:rgba(255,255,255,0.15); }
	.muted { font-size:9px; color:rgba(255,255,255,0.2); text-transform:none; letter-spacing:0; }
	.error { font-size:12px; color:rgba(255,100,100,0.8); margin-bottom:12px; }
	.error.success { color:rgba(100,255,150,0.8); }
	.btn { width:100%; margin-top:8px; background:#fff; color:#080808; border:none; border-radius:2px; padding:14px; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; transition:opacity 0.2s; }
	.btn:hover { opacity:0.85; }
	.btn:disabled { opacity:0.4; cursor:not-allowed; }
	.divider { text-align:center; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.15); margin:24px 0 0; }
</style>