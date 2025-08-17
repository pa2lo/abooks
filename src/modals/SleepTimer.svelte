<script>
	import { createEventDispatcher, onDestroy } from "svelte"
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
	let interval = null
	let timeout = null
	let startTs = null
	let duration = null
	let notifyTimeout = null

	function startSleep() {
		duration = totalMinutes * 60
		startTs = Date.now()

		notifyTimeout = setTimeout(() => {
			if (!sleepTimer.active && !document.hidden) sleepTimer.active = true
			notifyTimeout = null
		}, (duration - 30) * 1000)

		timeout = setTimeout(() => {
			if (ab.isPlaying) dispatch('finished')
			stopSleep()
		}, duration * 1000)

		sleepTimer.isActive = true
	}

	function stopSleep() {
		if (interval) clearInterval(interval)
		if (notifyTimeout) clearTimeout(notifyTimeout)
		clearTimeout(timeout)
		sleepTimer.isActive = false
	}

	function setRemaining() {
		const elapsed = Math.floor((Date.now() - startTs) / 1000)
		remaining = Math.max(duration - elapsed, 0)
	}

	$effect(() => {
		if (sleepTimer.isActive && sleepTimer.active) {
			setRemaining()
			interval = setInterval(setRemaining, 1000)
		} else {
			if (interval) {
				clearInterval(interval)
				interval = null
			}
		}
	})

	onDestroy(stopSleep)

	function handleModalKeyup(e) {
		if (e.key == 'Enter') {
			sleepTimer.isActive ? stopSleep() : startSleep()
		}
	}
	function handleModalKeyDown(e) {
		if (!sleepTimer.isActive && !document.activeElement.matches('input[type="text"]') && (e.code == 'ArrowLeft' || e.code == 'ArrowRight')) {
			e.preventDefault()
			e.stopPropagation()

			if (e.code == 'ArrowLeft') setTotalMinutes(Math.max(totalMinutes - 5, 5))
			if (e.code == 'ArrowRight') setTotalMinutes(Math.min(totalMinutes + 5, 120))
		}
	}

	function onTimeBlur() {
		if (timeModel.hours == 2) timeModel.mins = '00'
		else if (timeModel.hours == 0 && timeModel.mins < 5) timeModel.mins = '05'
	}

	const totalMinutes = $derived(Math.min(120, Math.max(5, parseInt(timeModel.hours || 0) * 60 + parseInt(timeModel.mins || 0))))
	function setTotalMinutes(v) {
		timeModel.hours = Math.floor(v / 60)
		timeModel.mins = (v % 60).toString().padStart(2, '0')
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
			<div class="flex lineSmaller" style="--complete: {(totalMinutes - 5) / 115 * 100}%">
				<input class="input-range" type="range" min=5 step=1 max=120 value={totalMinutes} oninput={e => setTotalMinutes(+e.target.value)} onkeydown={handleModalKeyDown} />
			</div>
			<AButton title={$t('start2')} full onclick={startSleep} />
		{:else}
			<p class="lineSmall lh125">{$t('timerNote2')}</p>
			<div class="sleep-timer-time lineSmall">
				{ secondsToHMS(remaining) }
			</div>
			<div class="flex lineSmaller">
				<progress class="sleep-progress" max=100 value={(remaining / 60) / totalMinutes * 100}></progress>
			</div>
			<AButton title={$t('cancel')} light full onclick={stopSleep} />
		{/if}
	</div>
</Modal>