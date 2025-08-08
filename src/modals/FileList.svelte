<script>
	import { ab, fileList, showToast } from "../store.svelte"
	import { library, positions, updateBook, updatePosition } from "../library.svelte"
	import { secondsToHMS } from "../utils/helpers"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import InfoLine from "../components/InfoLine.svelte"
	import SettingField from "../components/SettingField.svelte"
	import AButton from "../components/AButton.svelte"

	let { onSeek } = $props()

	let timeModel = $state('start')
	const timeOptions = ['start', 'duration']

	function seekTo(time) {
		if (!isPlayable) return
		onSeek(time)
	}

	let isPlayable = $derived(ab.currentBook?.id == fileList.book?.id)

	let modalEl = $state(null)
	let editMode = $state(false)
	let editListData = $state(null)
	let filesModel = $state('name')
	const filesModelOptions = [{value: 'title', title: 'metadata'}, {value: 'name', title: 'fileName'}]
	function showEditMode() {
		editListData = $state.snapshot(fileList.book?.files)
		filesModel = 'name'
		editMode = true
		requestAnimationFrame(() => { modalEl.scrollToTop() })
	}
	function exitEditMode() {
		editMode = false
		requestAnimationFrame(() => { modalEl.scrollToTop() })
	}
	function moveField(up = false, index) {
		const newIndex = up ? index-1 : index+1
		editListData.splice(newIndex, 0, editListData.splice(index, 1)[0])
	}

	function getAbsolutePosition(files, newIndex, offset) {
		return files.reduce((acc, file, index) => {
			if (index < newIndex) return acc + file.duration
			else if (index == newIndex) return acc + offset
			return acc
		}, 0)
	}

	function saveNewFilesOrder() {
		if (fileList.book.files.every((f, i) => f.name == editListData[i].name)) return onClose()

		const currentFileIndex = positions.books[fileList.book.id].fileIndex
		const newFileIndex = editListData.findIndex(f => f.index == currentFileIndex)
		const newAbsolutePosition = getAbsolutePosition(editListData, newFileIndex, positions.books[fileList.book.id].filePosition)

		if (fileList.book.bookmarks?.length) {
			fileList.book.bookmarks.forEach(b => {
				let oldBookmarkFileIndex = 0
				let oldBookmarkFileTime = 0
				let accumulated = 0

				for (let i = 0; i < fileList.book.files.length; i++) {
					const partDuration = fileList.book.files[i].duration
					if (b.position < accumulated + partDuration) {
						oldBookmarkFileIndex = i
						oldBookmarkFileTime = b.position - accumulated
						break;
					}
					accumulated += partDuration
				}

				const newBookmarkFileIndex = editListData.findIndex(f => f.index == oldBookmarkFileIndex)
				b.position = getAbsolutePosition(editListData, newBookmarkFileIndex, oldBookmarkFileTime)
			})
		}

		editListData.forEach((f, i) => { f.index = i })

		updatePosition(newAbsolutePosition, newFileIndex, positions.books[fileList.book.id].filePosition, fileList.book.id)
		updateBook(fileList.book, 'files', $state.snapshot(editListData))
		if (isPlayable) onSeek(newAbsolutePosition, true)
		onClose()
		showToast($t('listUpdated'), 'success')
	}

	function onClose() {
		fileList.active = false
		editMode = false
	}
</script>

<Modal bind:this={modalEl} title={editMode ? $t('editFileList') : $t('fileList')} on:close={onClose} show={fileList.active} width={editMode ? 'wide' : 'normal'}>
	<h4 class="book-modal-title {editMode && editListData?.some(f => f.title) ? 'lineSmaller' : 'line'}">{ fileList.book.title }</h4>
	{#if fileList.files == null}
		<div class="loader line"></div>
	{:else}
		{#if editMode}
			{#if editListData.some(f => f.title)}
				<div class="line">
					<SettingField label={$t('fileNameSource')} options={filesModelOptions} bind:group={filesModel} />
				</div>
			{/if}
			<div class="line">
				{#each editListData as file, i}
					<InfoLine title={file[filesModel]} value={secondsToHMS(file.duration)} reverse onmovedown={() => moveField(false, i)} onmoveup={() => moveField(true, i)} active={isPlayable && positions.books[ab.currentBook.id].fileIndex == file.index} />
				{/each}
			</div>
			<div class="book-modal-buttons flex">
				<AButton icon="x" title={$t('cancel')} light onclick={exitEditMode} />
				<AButton title={$t('save')} onclick={saveNewFilesOrder} />
			</div>
		{:else}
			<div class="line">
				<SettingField options={timeOptions} bind:group={timeModel} />
			</div>
			<div class="book-modal-cont line">
				{#each fileList.files as file, i}
					<InfoLine title={file.title} value={secondsToHMS(file[timeModel])} reverse clickable={isPlayable} active={isPlayable && positions.books[ab.currentBook.id].fileIndex == i} onclick={() => isPlayable && seekTo(file.start)} />
				{/each}
				<InfoLine title={$t('totalTime')} value={secondsToHMS(fileList.book.duration)} reverse divided />
			</div>
			{#if fileList.files.length > 1}
				<AButton icon="up-down" title={$t('editFileList')} light full onclick={showEditMode} />
			{/if}
		{/if}
	{/if}
</Modal>