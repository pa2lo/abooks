<script>
	import { createEventDispatcher } from "svelte"
	import { fileListBook, fileListData, fileListModal, currentBook } from "./store"
	import { secondsToHMS } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import InfoLine from "./components/InfoLine.svelte"
	import SettingField from "./components/SettingField.svelte"

	const dispatch = createEventDispatcher()

	let timeModel = 'start'
	const timeOptions = ['start', 'duration']

	function seekTo(time) {
		if (!isPlayable) return
		dispatch('seekTo', time)
	}

	$: isPlayable = $currentBook?.id == $fileListBook?.id
</script>

<Modal title="File list" on:close={() => $fileListModal = false} show={$fileListModal}>
	<h4 class="book-modal-title line">{ $fileListBook.title }</h4>
	{#if $fileListData == null}
		<div class="loader line"></div>
	{:else}
		<div class="line">
			<SettingField options={timeOptions} bind:group={timeModel} />
		</div>
		<div class="book-modal-cont line">
			{#each $fileListData as file, i}
				<InfoLine title={file.title} value={secondsToHMS(file[timeModel])} reverse clickable={isPlayable} active={isPlayable && $currentBook.currentPosition.fileIndex == i} on:click={() => isPlayable && seekTo(file.start)} />
			{/each}
			<InfoLine title="Total time" value={secondsToHMS($fileListBook.duration)} reverse divided />
		</div>
	{/if}
</Modal>