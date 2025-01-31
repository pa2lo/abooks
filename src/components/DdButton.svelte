<script>
	import Icon from "./Icon.svelte"

	export let title
	export let icon
	export let disabled
</script>

<button class="dd-button" on:click tabindex=0 disabled={disabled}>
	<Icon icon={icon} />
	<span class="dd-button-text">{title}</span>
</button>