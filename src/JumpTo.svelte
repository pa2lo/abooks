<svelte:options runes={true} />
<script>
	import { createEventDispatcher } from "svelte"
	import { jumpTo } from "./store.svelte"

	import Modal from "./components/Modal.svelte"

	const dispatch = createEventDispatcher()

	let hourEl = $state()
	let minEl = $state()
	let secEl = $state()

	function onFormSubmit(e) {
		e.preventDefault()

		jumpTo.active = false
		dispatch('seekTo', getSetLength())
	}

	function onKeyDown(e, m) {
		if (/^[a-zA-Z./]$/.test(e.key)) return e.preventDefault()
		if (['m', 's'].includes(m) && parseInt(e.target.value) > 5 && /^\d$/.test(e.key)) e.preventDefault()
	}

	let maxHours = $derived(jumpTo.max > 3600 ? Math.floor(jumpTo.max / 3600) : 0)

	function onBlur(e, m) {
		if (isNaN(e.target.value) || !e.target.value) e.target.value = 0

		let newVal = parseInt(e.target.value)
		if (['m', 's'].includes(m)) {
			newVal = Math.min(newVal, 59)
			newVal = String(newVal).padStart(2, '0')
		} else {
			newVal = Math.min(newVal, maxHours)
		}

		jumpTo.model[m] = newVal
		checkMaxLength()
	}

	function getSetLength() {
		return parseInt(jumpTo.model.h) * 3600 + parseInt(jumpTo.model.m) * 60 + parseInt(jumpTo.model.s)
	}

	function checkMaxLength() {
		let setLength = getSetLength()

		if (setLength > jumpTo.max) {
			jumpTo.model.h = String(maxHours)

			let minMax = Math.floor((jumpTo.max % 3600) / 60).toString().padStart(2, '0')
			let secMax = (parseInt(jumpTo.max) % 60).toString().padStart(2, '0')

			if (parseInt(jumpTo.model.m) > minMax) {
				jumpTo.model.m = minMax
				if (minEl.value != minMax) minEl.value = minMax
			}

			if (parseInt(jumpTo.model.m) >= minMax && parseInt(jumpTo.model.s) > secMax) {
				jumpTo.model.s = secMax
				if (secEl.value != secMax) secEl.value = secMax
			}
		}
	}
</script>

<Modal on:close={() => jumpTo.active = false} show={jumpTo.active} width="narrow">
	<form class="ta-c" onsubmit={onFormSubmit}>
		<h2 class="modal-header ta-c">Jump to</h2>
		<div class="jumpto-inputs flex line">
			{#if maxHours > 0}
				<div class="jumpto-input-wrapper">
					<label class="jumpto-input-label" for="jumpto-input-h">Hour</label>
					<input id="jumpto-input-h" class="jumpto-input" type="text" bind:this={hourEl} inputmode="numeric" pattern="\d*" onkeydown={onKeyDown} onblur={(e) => onBlur(e, 'h')} value={jumpTo.model.h} maxlength=2 />
				</div>
			{/if}
			<div class="jumpto-input-wrapper">
				<label class="jumpto-input-label" for="jumpto-input-m">Minute</label>
				<input id="jumpto-input-m" class="jumpto-input" type="text" bind:this={minEl} inputmode="numeric" pattern="\d*" onkeydown={(e) => onKeyDown(e, 'm')} onblur={(e) => onBlur(e, 'm')} value={jumpTo.model.m} maxlength=2 />
			</div>
			<div class="jumpto-input-wrapper">
				<label class="jumpto-input-label" for="jumpto-input-s">Second</label>
				<input id="jumpto-input-s" class="jumpto-input" type="text" bind:this={secEl} inputmode="numeric" pattern="\d*" onkeydown={(e) => onKeyDown(e, 's')} onblur={(e) => onBlur(e, 's')} value={jumpTo.model.s} maxlength=2 />
			</div>
		</div>
		<button class="button isFull" type="submit">Set time</button>
	</form>
</Modal>