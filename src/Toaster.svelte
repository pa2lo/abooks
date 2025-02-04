<svelte:options runes={true} />
<script>
	import { slide } from "svelte/transition"
	import { toasts } from "./store.svelte"

	import Icon from "./components/Icon.svelte"

	function destroyToast(toast) {
		if (toast.timeout) clearTimeout(toast.timeout)
		toasts.arr = toasts.arr.filter(et => et.id != toast.id)
	}
</script>

<div class="toaster">
	{#each toasts.arr as toast (toast.id)}
		<div transition:slide|global={{duration: 200}} class="toast toast-{toast.type} flex ai-c">
			<div class="toast-icon">
				<Icon icon={toast.type} />
			</div>
			<div class="toast-text">{toast.text}</div>
			<button class="toast-x" title="Close" onclick={() => destroyToast(toast)}>
				<Icon icon="x" />
			</button>
		</div>
	{/each}
</div>