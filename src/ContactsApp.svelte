<script lang="ts">
	import { onMount } from 'svelte';
	import { getSDK, Events } from '@fuzzypeanut/sdk';
	import { contacts as contactsApi } from './api';
	import type { Contact } from './types';

	type View = 'list' | 'detail' | 'edit' | 'new';

	let allContacts = $state<Contact[]>([]);
	let filtered = $state<Contact[]>([]);
	let selected = $state<Contact | null>(null);
	let view = $state<View>('list');
	let loading = $state(true);
	let search = $state('');
	let activeTag = $state<string | null>(null);
	let allTags = $state<string[]>([]);
	let error = $state<string | null>(null);

	// Pick mode — when another module requests a contact
	let pickMode = $state(false);
	let pickReturnEvent = $state('');

	onMount(async () => {
		await loadContacts();

		// Handle contacts:pick event from other modules
		const sdk = getSDK();
		sdk.events.on('contacts:pick', (payload) => {
			const p = payload as { returnEvent?: string; multiple?: boolean };
			pickReturnEvent = p?.returnEvent ?? '';
			pickMode = true;
			view = 'list';
		});

		// Handle contacts:get — look up by email, respond via returnEvent or contacts:found
		sdk.events.on('contacts:get', async (payload) => {
			const p = payload as { email?: string; returnEvent?: string };
			if (!p?.email) return;
			const returnEvent = p?.returnEvent ?? 'contacts:found';
			try {
				const contact = await contactsApi.getByEmail(p.email);
				const ref = contact
					? { id: contact.id, displayName: contact.displayName, email: contact.emails[0]?.value }
					: null;
				sdk.events.emit(returnEvent, { contact: ref });
			} catch {
				sdk.events.emit(returnEvent, { contact: null });
			}
		});
	});

	async function loadContacts() {
		loading = true;
		error = null;
		try {
			[allContacts, allTags] = await Promise.all([
				contactsApi.list(),
				contactsApi.tags()
			]);
			applyFilter();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load contacts';
		}
		loading = false;
	}

	function applyFilter() {
		let result = allContacts;
		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter((c) =>
				c.displayName.toLowerCase().includes(q) ||
				c.emails.some((e) => e.value.toLowerCase().includes(q)) ||
				c.organizationName?.toLowerCase().includes(q)
			);
		}
		if (activeTag) {
			result = result.filter((c) => c.tags.includes(activeTag!));
		}
		filtered = result;
	}

	$effect(() => { search; activeTag; applyFilter(); });

	function selectContact(contact: Contact) {
		if (pickMode) {
			// contacts:picked payload is ContactRef[], not full Contact
			const ref = { id: contact.id, displayName: contact.displayName, email: contact.emails[0]?.value };
			getSDK().events.emit(pickReturnEvent, { contacts: [ref] });
			pickMode = false;
			pickReturnEvent = '';
			return;
		}
		selected = contact;
		view = 'detail';
	}

	function getInitials(contact: Contact) {
		return ((contact.firstName?.[0] ?? '') + (contact.lastName?.[0] ?? '')).toUpperCase() || '?';
	}
</script>

<div class="contacts-app">
	<!-- Sidebar -->
	<aside class="sidebar">
		<div class="sidebar-header">
			{#if pickMode}
				<div class="pick-banner">Select a contact</div>
			{:else}
				<button class="new-btn" onclick={() => { selected = null; view = 'new'; }}>+ New Contact</button>
			{/if}
		</div>

		<div class="search-bar">
			<input
				type="search"
				placeholder="Search contacts…"
				bind:value={search}
				aria-label="Search contacts"
			/>
		</div>

		{#if allTags.length > 0}
			<div class="tag-filters">
				<button
					class="tag-chip"
					class:active={!activeTag}
					onclick={() => activeTag = null}
				>All</button>
				{#each allTags as tag}
					<button
						class="tag-chip"
						class:active={activeTag === tag}
						onclick={() => activeTag = activeTag === tag ? null : tag}
					>{tag}</button>
				{/each}
			</div>
		{/if}

		{#if loading}
			<div class="loading-state"><span class="spinner"></span></div>
		{:else if error}
			<div class="error-state">{error}</div>
		{:else if filtered.length === 0}
			<div class="empty-state">No contacts found</div>
		{:else}
			<ul class="contact-list">
				{#each filtered as contact (contact.id)}
					<li>
						<button
							class="contact-row"
							class:active={selected?.id === contact.id}
							onclick={() => selectContact(contact)}
						>
							<div class="avatar">{getInitials(contact)}</div>
							<div class="contact-info">
								<span class="contact-name">{contact.displayName}</span>
								{#if contact.organizationName}
									<span class="contact-org">{contact.organizationName}</span>
								{:else if contact.emails[0]}
									<span class="contact-org">{contact.emails[0].value}</span>
								{/if}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</aside>

	<!-- Main panel -->
	<main class="main-panel">
		{#if view === 'list' || (!selected && view !== 'new')}
			<div class="empty-detail">
				<span>👥</span>
				<p>Select a contact</p>
			</div>
		{:else if view === 'detail' && selected}
			<div class="contact-detail">
				<div class="detail-header">
					<div class="detail-avatar">{getInitials(selected)}</div>
					<div class="detail-name-block">
						<h2>{selected.displayName}</h2>
						{#if selected.jobTitle || selected.organizationName}
							<p class="detail-role">
								{[selected.jobTitle, selected.organizationName].filter(Boolean).join(' · ')}
							</p>
						{/if}
						{#if selected.tags.length > 0}
							<div class="detail-tags">
								{#each selected.tags as tag}
									<span class="tag-badge">{tag}</span>
								{/each}
							</div>
						{/if}
					</div>
					<button class="edit-btn" onclick={() => view = 'edit'}>Edit</button>
				</div>

				<div class="detail-fields">
					{#each selected.emails as email}
						<div class="field-row">
							<span class="field-label">{email.label ?? 'Email'}</span>
							<a href="mailto:{email.value}" class="field-value">{email.value}</a>
						</div>
					{/each}
					{#each selected.phones as phone}
						<div class="field-row">
							<span class="field-label">{phone.label ?? 'Phone'}</span>
							<a href="tel:{phone.value}" class="field-value">{phone.value}</a>
						</div>
					{/each}
					{#if selected.website}
						<div class="field-row">
							<span class="field-label">Website</span>
							<a href={selected.website} target="_blank" rel="noreferrer" class="field-value">{selected.website}</a>
						</div>
					{/if}
					{#if selected.address}
						<div class="field-row">
							<span class="field-label">Address</span>
							<span class="field-value">{selected.address}</span>
						</div>
					{/if}
					{#if selected.notes}
						<div class="field-row notes-row">
							<span class="field-label">Notes</span>
							<span class="field-value notes">{selected.notes}</span>
						</div>
					{/if}
				</div>
			</div>
		{:else if view === 'new'}
			<div class="edit-form">
				<h2>New Contact</h2>
				<p class="placeholder-note">Contact creation form — coming soon.</p>
				<button class="cancel-btn" onclick={() => view = 'list'}>Cancel</button>
			</div>
		{:else if view === 'edit' && selected}
			<div class="edit-form">
				<h2>Edit Contact</h2>
				<p class="placeholder-note">Contact editing form — coming soon.</p>
				<button class="cancel-btn" onclick={() => view = 'detail'}>Cancel</button>
			</div>
		{/if}
	</main>
</div>

<style>
	.contacts-app {
		display: flex;
		height: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--fp-surface, #fff);
		color: var(--fp-text, #1a1a2e);
	}

	/* Sidebar */
	.sidebar {
		width: 280px;
		flex-shrink: 0;
		border-right: 1px solid var(--fp-border, #e0e0ef);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header { padding: 0.75rem; border-bottom: 1px solid var(--fp-border, #e0e0ef); }

	.new-btn {
		width: 100%;
		padding: 0.5rem;
		background: var(--fp-primary, #5b4fcf);
		color: #fff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.pick-banner {
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fp-primary, #5b4fcf);
		padding: 0.25rem 0;
	}

	.search-bar { padding: 0.5rem 0.75rem; }

	.search-bar input {
		width: 100%;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--fp-border, #e0e0ef);
		border-radius: 6px;
		background: var(--fp-surface-2, #f5f5fb);
		color: var(--fp-text, #1a1a2e);
		font-size: 0.85rem;
		outline: none;
	}

	.tag-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		padding: 0 0.75rem 0.5rem;
	}

	.tag-chip {
		padding: 0.2rem 0.6rem;
		border-radius: 12px;
		border: 1px solid var(--fp-border, #e0e0ef);
		background: none;
		color: var(--fp-text, #1a1a2e);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.tag-chip.active {
		background: var(--fp-primary, #5b4fcf);
		color: #fff;
		border-color: var(--fp-primary, #5b4fcf);
	}

	.contact-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }

	.contact-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--fp-text, #1a1a2e);
		text-align: left;
	}

	.contact-row:hover { background: var(--fp-surface-2, #f5f5fb); }
	.contact-row.active { background: var(--fp-border, #e0e0ef); }

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--fp-primary, #5b4fcf);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.contact-info { display: flex; flex-direction: column; overflow: hidden; }
	.contact-name { font-size: 0.9rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.contact-org { font-size: 0.78rem; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.loading-state, .empty-state, .error-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		opacity: 0.5;
		font-size: 0.85rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--fp-border, #e0e0ef);
		border-top-color: var(--fp-primary, #5b4fcf);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* Main panel */
	.main-panel { flex: 1; overflow-y: auto; }

	.empty-detail {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		opacity: 0.4;
		font-size: 0.9rem;
	}

	.empty-detail span { font-size: 2.5rem; }

	/* Contact detail */
	.contact-detail { padding: 1.5rem; }

	.detail-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.detail-avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--fp-primary, #5b4fcf);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.detail-name-block { flex: 1; }
	.detail-name-block h2 { font-size: 1.2rem; margin-bottom: 0.2rem; }
	.detail-role { font-size: 0.85rem; opacity: 0.6; margin-bottom: 0.4rem; }

	.detail-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }

	.tag-badge {
		padding: 0.15rem 0.5rem;
		border-radius: 10px;
		background: var(--fp-surface-2, #f5f5fb);
		border: 1px solid var(--fp-border, #e0e0ef);
		font-size: 0.72rem;
	}

	.edit-btn {
		padding: 0.4rem 0.9rem;
		background: none;
		border: 1px solid var(--fp-border, #e0e0ef);
		border-radius: 6px;
		cursor: pointer;
		color: var(--fp-text, #1a1a2e);
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.detail-fields { display: flex; flex-direction: column; gap: 0.75rem; }

	.field-row {
		display: grid;
		grid-template-columns: 80px 1fr;
		gap: 0.5rem;
		align-items: baseline;
	}

	.field-label { font-size: 0.78rem; opacity: 0.5; text-align: right; }
	.field-value { font-size: 0.9rem; }
	.field-value a { color: var(--fp-primary, #5b4fcf); text-decoration: none; }
	.notes-row { align-items: flex-start; }
	.notes { white-space: pre-wrap; font-size: 0.85rem; opacity: 0.8; }

	/* Edit/new form */
	.edit-form { padding: 1.5rem; }
	.edit-form h2 { margin-bottom: 1rem; }
	.placeholder-note { opacity: 0.5; font-size: 0.85rem; margin-bottom: 1rem; }

	.cancel-btn {
		padding: 0.4rem 0.9rem;
		background: none;
		border: 1px solid var(--fp-border, #e0e0ef);
		border-radius: 6px;
		cursor: pointer;
		color: var(--fp-text, #1a1a2e);
	}
</style>
