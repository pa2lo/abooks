<script>
	import { createEventDispatcher } from "svelte"
	import { sleepTimerModal, sleepActive, isPlaying } from "./store"
	import { secondsToHMS, formatDate } from "./helpers"

	import Modal from "./components/Modal.svelte"

	const dispatch = createEventDispatcher()

	let sleepModel = 30
	let remaining = null
	let interval

	function startSleep() {
		remaining = sleepModel * 60
		interval = setInterval(() => {
			if (remaining > 1) {
				remaining -= 1
				if (remaining == 30 && !$sleepTimerModal) $sleepTimerModal = true
			} else {
				$sleepActive = false
				if ($isPlaying) dispatch('finished')
				if ($sleepTimerModal) $sleepTimerModal = false
				clearInterval(interval)
			}
		}, 1000)
		$sleepActive = true
	}

	function stopSleep() {
		clearInterval(interval)
		$sleepActive = false
	}

	function handleModalKeyup(e) {
		if (e.detail.key == 'Enter') {
			if ($sleepActive) stopSleep()
			else startSleep()
		}
	}
	function handleModalKeyDown(e) {
		if (!$sleepActive) {
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

<Modal on:close={() => $sleepTimerModal = false} show={$sleepTimerModal} width="narrow" on:keyup={handleModalKeyup} on:keydown={handleModalKeyDown}>
	<div class="ta-c">
		<h2 class="modal-header lineSmall">SLeep Timer</h2>
		{#if !$sleepActive}
			<p class="lineSmall lh125">Stop playback in</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(sleepModel) }
			</div>
			<div class="flex lineSmaller" style="--complete: {(sleepModel - 5) / 115 * 100}%">
				<input class="input-range" type="range" min=5 max=120 bind:value={sleepModel} />
			</div>
			<button class="button isFull" on:click={startSleep}>Start</button>
		{:else}
			<p class="lineSmall lh125">Playback will stop in</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(remaining) }
			</div>
			<div class="flex lineSmaller">
				<progress class="sleep-progress" max=100 value={(remaining / 60) / sleepModel * 100}></progress>
			</div>
			<button class="button button-light isFull" on:click={stopSleep}>Cancel</button>
		{/if}
	</div>
</Modal>