<script>
	import { createEventDispatcher } from "svelte"
	import { ab, sleepTimer } from "./store.svelte"
	import { secondsToHMS, formatDate } from "./helpers"

	import Modal from "./components/Modal.svelte"

	const dispatch = createEventDispatcher()

	let sleepModel = $state(30)
	let remaining = $state(null)
	let interval

	function startSleep() {
		remaining = sleepModel * 60
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
		if (!sleepTimer.isActive) {
			if (e.code == 'ArrowLeft') {
				sleepModel = Math.max(sleepModel - 5, 5)
				e.stopPropagation()
			}
			if (e.code == 'ArrowRight') {
				sleepModel = Math.min(sleepModel + 5, 120)
				e.stopPropagation()
			}
		}
	}
</script>

<Modal on:close={() => sleepTimer.active = false} show={sleepTimer.active} width="narrow" onkeyup={handleModalKeyup} onkeydown={handleModalKeyDown}>
	<div class="ta-c">
		<h2 class="modal-header lineSmall">SLeep Timer</h2>
		{#if !sleepTimer.isActive}
			<p class="lineSmall lh125">Stop playback in</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(sleepModel) }
			</div>
			<div class="flex lineSmaller" style="--complete: {(sleepModel - 5) / 115 * 100}%">
				<input class="input-range" type="range" min=5 max=120 bind:value={sleepModel} />
			</div>
			<button class="button isFull" onclick={startSleep}>Start</button>
		{:else}
			<p class="lineSmall lh125">Playback will stop in</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(remaining) }
			</div>
			<div class="flex lineSmaller">
				<progress class="sleep-progress" max=100 value={(remaining / 60) / sleepModel * 100}></progress>
			</div>
			<button class="button button-light isFull" onclick={stopSleep}>Cancel</button>
		{/if}
	</div>
</Modal>