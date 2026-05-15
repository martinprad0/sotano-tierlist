import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	email: string;
	name: string;
	token: string;
}

function createAuthStore() {
	const stored = browser ? localStorage.getItem('sotano_user') : null;
	const initial: User | null = stored ? JSON.parse(stored) : null;
	const { subscribe, set } = writable<User | null>(initial);

	return {
		subscribe,
		login(user: User) {
			if (browser) localStorage.setItem('sotano_user', JSON.stringify(user));
			set(user);
		},
		logout() {
			if (browser) localStorage.removeItem('sotano_user');
			set(null);
		}
	};
}

export const auth = createAuthStore();