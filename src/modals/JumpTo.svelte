<svelte:options runes={true} />
<script>
	import { createEventDispatcher } from "svelte"
	import { jumpTo } from "../store.svelte"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import TimeInput from "../components/TimeInput.svelte"

	const dispatch = createEventDispatcher()

	let minEl = $state()
	let secEl = $state()

	function onFormSubmit(e) {
		if (e) e.preventDefault()

		jumpTo.active = false
		dispatch('seekTo', getSetLength())
	}

	let maxHours = $derived(jumpTo.max > 3600 ? Math.floor(jumpTo.max / 3600) : 0)

	function getSetLength() {
		return parseInt(jumpTo.model.h) * 3600 + parseInt(jumpTo.model.m) * 60 + parseInt(jumpTo.model.s)
	}

	function checkMaxLength() {
		let setLength = getSetLength()

		if (setLength > jumpTo.max) {
			jumpTo.model.h = String(maxHours)

			let minMax = Math.floor((jumpTo.max % 3600) / 60).toString().padStart(2, '0')
			let secMax = (parseInt(jumpTo.max) % 60).toString().padStart(2, '0')

			if (parseInt(jumpTo.model.m) > minMax) jumpTo.model.m = minMax

			if (parseInt(jumpTo.model.m) >= minMax && parseInt(jumpTo.model.s) > secMax) jumpTo.model.s = secMax
		}
	}
</script>

<Modal on:close={() => jumpTo.active = false} show={jumpTo.active} width="narrow">
	<form class="ta-c" onsubmit={onFormSubmit}>
		<h2 class="modal-header ta-c">{$t('jumpTo')}</h2>
		<div class="jumpto-inputs flex line">
			{#if maxHours > 0}
				<TimeInput label={$t('hour')} autofocus max={maxHours} bind:value={jumpTo.model.h} onblur={checkMaxLength} onenter={onFormSubmit} nextel={minEl} />
			{/if}
			<TimeInput label={$t('minute')} autofocus mins bind:el={minEl} bind:value={jumpTo.model.m} onblur={checkMaxLength} onenter={onFormSubmit} nextel={secEl} />
			<TimeInput label={$t('second')} autofocus mins bind:el={secEl} bind:value={jumpTo.model.s} onblur={checkMaxLength} onenter={onFormSubmit} />
		</div>
		<button class="button isFull" type="submit">{$t('jumpToTime')}</button>
	</form>
</Modal>