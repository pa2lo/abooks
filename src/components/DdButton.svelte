<script>
	import Icon from "./Icon.svelte"

	let { title, icon, onclick, disabled } = $props()
</script>

<button class="dd-button" {onclick} {disabled} tabindex=0>
	<Icon icon={icon} />
	<span class="dd-button-text">{title}</span>
</button>