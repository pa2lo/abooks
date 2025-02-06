<script>
	import { onDestroy, onMount } from "svelte";

	let { text, note } = $props()

	let marqueeEl = $state()
	let marqueeTextEl = $state()
	let marqueeActive = $state(false)
	let speedRatio = $state(0)

	let observer = new ResizeObserver(entries => {
		requestAnimationFrame(() => {
			setMarquee()
		})
	})

	function setMarquee() {
		speedRatio = marqueeTextEl.scrollWidth / 40
		marqueeActive = marqueeTextEl.scrollWidth - 1 > marqueeEl.clientWidth
	}

	onMount(() => {
		observer.observe(marqueeEl)
	})
	onDestroy(() => {
		observer.unobserve(marqueeEl)
	})

	$effect(() => {
		setMarquee(text)
	})
</script>

<div class="marquee" class:active={marqueeActive} bind:this={marqueeEl} style="--speed: {speedRatio}s;">
	<div class="marquee-inner flex">
		<span class="marquee-text" bind:this={marqueeTextEl}>
			{text}
			{#if note}
				<span class="lighter marquee-note">{note}</span>
			{/if}
		</span>
		{#if marqueeActive}
			<span class="marquee-text-copy">
				{text}
				{#if note}
					<span class="lighter marquee-note">{note}</span>
				{/if}
			</span>
		{/if}
	</div>
</div>