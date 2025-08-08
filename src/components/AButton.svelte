<script>
	import Icon from "./Icon.svelte"

	let {
		light,
		full,
		icon,
		clss,
		type = 'button',
		title,
		disabled,
		loading,
		onclick
	} = $props()
</script>

<button class="button {clss}" class:button-light={light} class:isLoading={loading} class:isFull={full} {type} {disabled} {onclick}>
	{#if icon}
		<Icon {icon} />
	{/if}
	<span class="button-text">{ title }</span>
</button>