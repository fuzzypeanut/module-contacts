// Re-export FPModule from the SDK — no local redefinition.
export type { FPModule } from '@fuzzypeanut/sdk';

export interface ContactEmail {
	value: string;
	label?: string; // 'work' | 'personal' | 'other' | etc.
}

export interface ContactPhone {
	value: string;
	label?: string; // 'work' | 'mobile' | 'home' | 'other' | etc.
}

export interface Contact {
	id: string;
	firstName: string;
	lastName: string;
	displayName: string;
	emails: ContactEmail[];
	phones: ContactPhone[];
	organizationId?: string;
	organizationName?: string;
	jobTitle?: string;
	website?: string;
	address?: string;
	birthday?: string;
	notes?: string;
	avatarUrl?: string;
	tags: string[];
	customFields: Record<string, string>;
	visibility: 'personal' | 'shared';
	createdAt: string;
	updatedAt: string;
}

export interface Organization {
	id: string;
	name: string;
	website?: string;
	address?: string;
	phone?: string;
	notes?: string;
	tags: string[];
	contactCount: number;
}

export interface TimelineEntry {
	id: string;
	type: 'email' | 'calendar_event' | 'note';
	date: string;
	title: string;
	preview?: string;
	author?: string;
}

export interface ContactNote {
	id: string;
	contactId: string;
	authorId: string;
	authorName: string;
	body: string;
	createdAt: string;
	updatedAt: string;
}
