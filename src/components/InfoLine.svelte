<script>
	import { t } from "../utils/translation.svelte"

	import Icon from "./Icon.svelte"

	let {
		title,
		value,
		reverse,
		clickable,
		active,
		divided,
		removable,
		onclick,
		onmoveup,
		onmovedown
	} = $props()
</script>

<div class="info-line-outer lineSmall flex ai-c">
	{#if clickable}
		<button class="info-line isClickable flex ai-c" class:isActive={active} class:isDivided={divided} {onclick}>
			<span class="info-line-data" class:lighter={!reverse}>{ title }</span>
			<span class="info-line-divider"></span>
			<span class="info-line-data" class:lighter={reverse}>{ value }</span>
		</button>
	{:else}
		<div class="info-line flex ai-c" class:isDivided={divided} class:isActive={active}>
			<span class="info-line-data" class:lighter={!reverse}>{ title }</span>
			<span class="info-line-divider"></span>
			<span class="info-line-data" class:lighter={reverse}>{ value }</span>
		</div>
	{/if}
	{#if removable}
		<button class="bookmark-x" onclick={removable} title={$t('delBookmark')}>
			<Icon icon="x" />
		</button>
	{/if}
	{#if onmoveup && onmovedown}
		<div class="info-line-move-buttons flex">
			<button class="bookmark-x info-line-move" onclick={onmoveup} title={$t('moveUp')}>
				<Icon icon="up" />
			</button>
			<button class="bookmark-x info-line-move" onclick={onmovedown} title={$t('moveDown')}>
				<Icon icon="down" />
			</button>
		</div>
	{/if}
</div>