<script>
	import { createEventDispatcher } from "svelte"
	import { ab, sleepTimer } from "./store.svelte"
	import { secondsToHMS, formatDate } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import TimeInput from "./components/TimeInput.svelte"

	const dispatch = createEventDispatcher()

	let timeModel = $state({
		mins: 30,
		hours: 0,
		range: 30
	})
	let remaining = $state(null)
	let interval

	function startSleep() {
		remaining = timeModel.range * 60
		interval = setInterval(() => {
			if (remaining > 1) {
				remaining -= 1
				if (remaining == 30 && !sleepTimer.active) sleepTimer.active = true
			} else {
				sleepTimer.isActive = false
				if (ab.isPlaying) dispatch('finished')
				if (sleepTimer.active) sleepTimer.active = false
				clearInterval(interval)
			}
		}, 1000)
		sleepTimer.isActive = true
	}

	function stopSleep() {
		clearInterval(interval)
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

			if (e.code == 'ArrowLeft') timeModel.range = Math.max(timeModel.range - 5, 5)
			if (e.code == 'ArrowRight') timeModel.range = Math.min(timeModel.range + 5, 120)

			updateTimeInputs()
		}
	}

	function onTimeBlur() {
		if (timeModel.hours == 2) {
			timeModel.mins = '00'
			updateTimeRange()
		} else if (timeModel.hours == 0 && timeModel.mins < 5) {
			timeModel.mins = '05'
			updateTimeRange()
		}
	}

	function updateTimeInputs() {
		timeModel.hours = Math.floor(timeModel.range / 60)
		timeModel.mins = (timeModel.range % 60).toString().padStart(2, '0')
	}

	function updateTimeRange() {
		if (!timeModel.hours || !timeModel.mins) return

		requestAnimationFrame(() => timeModel.range = Math.min(120, Math.max(5, parseInt(timeModel.hours) * 60 + parseInt(timeModel.mins))))
	}
</script>

<Modal on:close={() => sleepTimer.active = false} show={sleepTimer.active} width="narrow" onkeyup={handleModalKeyup} onkeydown={handleModalKeyDown}>
	<div class="ta-c">
		<h2 class="modal-header lineSmall">SLeep Timer</h2>
		{#if !sleepTimer.isActive}
			<p class="lineSmaller lh125">Stop playback in</p>
			<div class="jumpto-inputs flex lineSmaller">
				<TimeInput bind:value={timeModel.hours} max=2 onblur={onTimeBlur} oninput={updateTimeRange} />
				<TimeInput bind:value={timeModel.mins} mins onblur={onTimeBlur} oninput={updateTimeRange} />
			</div>
			<div class="flex lineSmaller" style="--complete: {(timeModel.range - 5) / 115 * 100}%">
				<input class="input-range" type="range" min=5 step=1 max=120 bind:value={timeModel.range} oninput={updateTimeInputs} onkeydown={handleModalKeyDown} />
			</div>
			<button class="button isFull" onclick={startSleep}>Start</button>
		{:else}
			<p class="lineSmall lh125">Playback will stop in</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(remaining) }
			</div>
			<div class="flex lineSmaller">
				<progress class="sleep-progress" max=100 value={(remaining / 60) / timeModel.range * 100}></progress>
			</div>
			<button class="button button-light isFull" onclick={stopSleep}>Cancel</button>
		{/if}
	</div>
</Modal>