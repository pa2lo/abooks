<script>
	import Icon from "./Icon.svelte"

	export let clss
	export let title
	export let icon
	export let active
	export let disabled
</script>

<button class="transparent-button {clss}" class:isActive={active} disabled={disabled} on:click on:pointerdown title={title}>
	<Icon icon={icon} />
</button>