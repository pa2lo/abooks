<script>
	import Icon from "./Icon.svelte"

	export let title
	export let value
	export let reverse
	export let clickable
	export let active
	export let divided
	export let removable
</script>

<div class="info-line-outer lineSmall flex ai-c">
	{#if clickable}
		<button class="info-line isClickable flex ai-c" class:isActive={active} class:isDivided={divided} on:click>
			<span class="info-line-data" class:lighter={!reverse}>{ title }</span>
			<span class="info-line-divider"></span>
			<span class="info-line-data" class:lighter={reverse}>{ value }</span>
		</button>
	{:else}
		<div class="info-line flex ai-c" class:isDivided={divided}>
			<span class="info-line-data" class:lighter={!reverse}>{ title }</span>
			<span class="info-line-divider"></span>
			<span class="info-line-data" class:lighter={reverse}>{ value }</span>
		</div>
	{/if}
	{#if removable}
		<button class="bookmark-x" on:click={removable} title="Delete bookmark">
			<Icon icon="x" />
		</button>
	{/if}
</div>