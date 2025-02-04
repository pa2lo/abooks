<script>
	import Icon from "./Icon.svelte"

	let {
		clss,
		icon,
		active,
		disabled,
		onclick,
		onpointerdown,
		title
	} = $props()
</script>

<button class="transparent-button {clss}" class:isActive={active} {disabled} {onclick} {onpointerdown} {title}>
	<Icon {icon} />
</button>