import { mount, unmount } from 'svelte';
import ContactsApp from './ContactsApp.svelte';
import type { FPModule } from '@fuzzypeanut/sdk';

const fpModule: FPModule = {
	mount(target: HTMLElement, props: Record<string, unknown> = {}) {
		return mount(ContactsApp, { target, props });
	},
	unmount(instance: unknown) {
		unmount(instance as object);
	},
};

export default fpModule;
