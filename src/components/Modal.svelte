<script>
	import { fade } from 'svelte/transition'
	import { createEventDispatcher, onDestroy } from 'svelte'

	import Icon from './Icon.svelte'

	let {
		width = 'normal',
		title,
		show,
		onkeydown,
		onkeyup,
		children
	} = $props()

	let modalEl = $state(null)

	const dispatch = createEventDispatcher()

	function closeModal() {
		dispatch('close')
	}

	function onSelfClick(e) {
		if (e.target == modalEl) closeModal()
	}

	function handleKeyUp(e) {
		if (e.key == 'Escape') closeModal()
		else if (onkeyup) onkeyup(e)
	}

	let lastFocusedEl
	function onIntroEnd() {
		lastFocusedEl = document.activeElement
		modalEl.focus()
	}
	function onOutroEnd() {
		if (lastFocusedEl && document.contains(lastFocusedEl) && !lastFocusedEl.closest('.dd-cont')) lastFocusedEl.focus()
	}

	let start = {}
	let offY = $state(0)
	let isMoving = false
	function onTouchStart(e) {
		if (e.touches.length > 1 || window.visualViewport.scale > 1.01 || modalEl.scrollTop > 0) {
			if (isMoving) removeDomEvents()
			return
		}

		start = {
			x: e.changedTouches[0]?.clientX,
			y: e.changedTouches[0]?.clientY
		}

		addDomEvents()
	}
	function addDomEvents() {
		isMoving = true
		document.addEventListener('touchmove', onTouchMove, {passive: true})
		document.addEventListener('touchend', onTouchEnd, {passive: true})
	}
	function removeDomEvents() {
		isMoving = false
		offY = 0
		document.removeEventListener('touchmove', onTouchMove)
		document.removeEventListener('touchend', onTouchEnd)
	}
	function onTouchMove(e) {
		if (window.visualViewport.scale > 1.01) return
		const { clientX: endX, clientY: endY } = e.changedTouches[0]

		const diffX = endX - start.x,
			diffY = endY - start.y,
			absX = Math.abs(diffX),
			absY = Math.abs(diffY)

		if (diffY < -5) removeDomEvents()
		else if (absY > absX) offY = Math.max(0, diffY - 15)
	}
	function onTouchEnd(e) {
		if (isMoving && offY > 100) closeModal()
		requestAnimationFrame(() => {
			removeDomEvents()
		})
	}

	onDestroy(() => {
		if (isMoving) removeDomEvents()
	})
</script>

{#if show}
	<div transition:fade={{duration: 200}} bind:this={modalEl} onintroend={onIntroEnd} onoutroend={onOutroEnd} onclick={onSelfClick} {onkeydown} onkeyup={handleKeyUp} role="button" tabindex="-1" class="modal" class:movingDown={offY > 0}>
		<div class="modal-inner modal-{width}" ontouchstart={onTouchStart} style="transform: translateY({offY}px);">
			<button class="modal-x transparent-button" onclick={closeModal}>
				<Icon icon="x" />
			</button>
			{#if title}
				<h2 class="modal-header">{ title }</h2>
			{/if}
			{@render children?.()}
		</div>
	</div>
{/if}