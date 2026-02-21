import { mount, unmount } from 'svelte';
import ContactsApp from './ContactsApp.svelte';

export default {
	mount(target: HTMLElement, props: Record<string, unknown> = {}) {
		return mount(ContactsApp, { target, props });
	},
	unmount(instance: unknown) {
		unmount(instance as object);
	}
};
