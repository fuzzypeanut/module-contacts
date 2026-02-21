import { getSDK } from '@fuzzypeanut/sdk';
import type { Contact, Organization, TimelineEntry } from './types';

const API_URL = (import.meta as { env: Record<string, string> }).env.VITE_CONTACTS_API ?? 'http://localhost:3300';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = await getSDK().auth.getToken();
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...options.headers
		}
	});
	if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
	if (res.status === 204) return undefined as T;
	return res.json();
}

export const contacts = {
	list: (params?: { q?: string; tag?: string; org?: string; visibility?: string }) =>
		request<Contact[]>(`/contacts?${new URLSearchParams(params as Record<string, string>)}`),

	get: (id: string) => request<Contact>(`/contacts/${id}`),

	getByEmail: (email: string) =>
		request<Contact | null>(`/contacts/by-email/${encodeURIComponent(email)}`),

	create: (data: Partial<Contact>) =>
		request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),

	update: (id: string, data: Partial<Contact>) =>
		request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

	delete: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),

	timeline: (id: string) => request<TimelineEntry[]>(`/contacts/${id}/timeline`),

	tags: () => request<string[]>('/contacts/tags')
};

export const orgs = {
	list: (params?: { q?: string }) =>
		request<Organization[]>(`/organizations?${new URLSearchParams(params as Record<string, string>)}`),

	get: (id: string) => request<Organization>(`/organizations/${id}`),

	create: (data: Partial<Organization>) =>
		request<Organization>('/organizations', { method: 'POST', body: JSON.stringify(data) }),

	update: (id: string, data: Partial<Organization>) =>
		request<Organization>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

	delete: (id: string) => request<void>(`/organizations/${id}`, { method: 'DELETE' }),

	contacts: (id: string) => request<Contact[]>(`/organizations/${id}/contacts`)
};
