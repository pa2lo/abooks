<script>
	import { createEventDispatcher } from "svelte"
	import { ab, sleepTimer } from "../store.svelte"
	import { secondsToHMS, formatDate } from "../utils/helpers"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import TimeInput from "../components/TimeInput.svelte"
	import AButton from "../components/AButton.svelte"

	const dispatch = createEventDispatcher()

	let timeModel = $state({
		mins: 30,
		hours: 0
	})
	let remaining = $state(null)
	let interval
	let timeout

	function startSleep() {
		remaining = timeRange.value * 60
		interval = setInterval(() => {
			if (remaining > 1) {
				remaining -= 1
				if (remaining == 30 && !sleepTimer.active) sleepTimer.active = true
			} else {
				if (ab.isPlaying) dispatch('finished')
				stopSleep()
				if (sleepTimer.active) sleepTimer.active = false
			}
		}, 1000)
		timeout = setTimeout(() => {
			if (ab.isPlaying) dispatch('finished')
			stopSleep()
		}, timeRange.value * 60 * 1000)
		sleepTimer.isActive = true
	}

	function stopSleep() {
		clearInterval(interval)
		clearTimeout(timeout)
		sleepTimer.isActive = false
	}

	function handleModalKeyup(e) {
		if (e.key == 'Enter') {
			if (sleepTimer.isActive) stopSleep()
			else startSleep()
		}
	}
	function handleModalKeyDown(e) {
		if (!sleepTimer.isActive && !document.activeElement.matches('input[type="text"]') && (e.code == 'ArrowLeft' || e.code == 'ArrowRight')) {
			e.preventDefault()
			e.stopPropagation()

			if (e.code == 'ArrowLeft') timeRange.value = Math.max(timeRange.value - 5, 5)
			if (e.code == 'ArrowRight') timeRange.value = Math.min(timeRange.value + 5, 120)
		}
	}

	function onTimeBlur() {
		if (timeModel.hours == 2) timeModel.mins = '00'
		else if (timeModel.hours == 0 && timeModel.mins < 5) timeModel.mins = '05'
	}

	let timeRange = {
		get value() {
			return Math.min(120, Math.max(5, parseInt(timeModel.hours || 0) * 60 + parseInt(timeModel.mins || 0)))
		},
		set value(v) {
			timeModel.hours = Math.floor(v / 60)
			timeModel.mins = (v % 60).toString().padStart(2, '0')
		}
	}
</script>

<Modal on:close={() => sleepTimer.active = false} show={sleepTimer.active} width="narrow" onkeyup={handleModalKeyup} onkeydown={handleModalKeyDown}>
	<div class="ta-c">
		<h2 class="modal-header lineSmall">{$t('sleepTimer')}</h2>
		{#if !sleepTimer.isActive}
			<p class="lineSmaller lh125">{$t('timerNote1')}</p>
			<div class="jumpto-inputs flex lineSmaller">
				<TimeInput bind:value={timeModel.hours} max=2 onblur={onTimeBlur} />
				<TimeInput bind:value={timeModel.mins} mins onblur={onTimeBlur} />
			</div>
			<div class="flex lineSmaller" style="--complete: {(timeRange.value - 5) / 115 * 100}%">
				<input class="input-range" type="range" min=5 step=1 max=120 bind:value={timeRange.value} onkeydown={handleModalKeyDown} />
			</div>
			<AButton title={$t('start2')} full onclick={startSleep} />
		{:else}
			<p class="lineSmall lh125">{$t('timerNote2')}</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(remaining) }
			</div>
			<div class="flex lineSmaller">
				<progress class="sleep-progress" max=100 value={(remaining / 60) / timeRange.value * 100}></progress>
			</div>
			<AButton title={$t('cancel')} light full onclick={stopSleep} />
		{/if}
	</div>
</Modal>