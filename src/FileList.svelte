<script>
	import { createEventDispatcher } from "svelte"
	import { ab, fileList } from "./store.svelte"
	import { library, positions } from "./library.svelte"
	import { secondsToHMS } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import InfoLine from "./components/InfoLine.svelte"
	import SettingField from "./components/SettingField.svelte"

	const dispatch = createEventDispatcher()

	let timeModel = $state('start')
	const timeOptions = ['start', 'duration']

	function seekTo(time) {
		if (!isPlayable) return
		dispatch('seekTo', time)
	}

	let isPlayable = $derived(ab.currentBook?.id == fileList.book?.id)
</script>

<Modal title="File list" on:close={() => fileList.active = false} show={fileList.active}>
	<h4 class="book-modal-title line">{ fileList.book.title }</h4>
	{#if fileList.files == null}
		<div class="loader line"></div>
	{:else}
		<div class="line">
			<SettingField options={timeOptions} bind:group={timeModel} />
		</div>
		<div class="book-modal-cont line">
			{#each fileList.files as file, i}
				<InfoLine title={file.title} value={secondsToHMS(file[timeModel])} reverse clickable={isPlayable} active={isPlayable && positions.books[ab.currentBook.id].fileIndex == i} onclick={() => isPlayable && seekTo(file.start)} />
			{/each}
			<InfoLine title="Total time" value={secondsToHMS(fileList.book.duration)} reverse divided />
		</div>
	{/if}
</Modal>