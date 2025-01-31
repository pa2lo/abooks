<script>
	import { addBookmarkModal, addBookmarkData, currentBook, library, showBookmarks, showToast } from "./store"
	import { formatDate, secondsToHMS } from "./helpers"
	import { updateBook } from "./library"

	import Modal from "./components/Modal.svelte"
	import TextInput from "./components/TextInput.svelte"

	function onFormSubmit(e) {
		const bookmarkData = {
			added: $addBookmarkData.added,
			position: $addBookmarkData.position,
			title: $addBookmarkData.title
		}
		$currentBook.bookmarks.push(bookmarkData)
		$currentBook.bookmarks = $currentBook.bookmarks.sort((a, b) => a.position - b.position)
		library.update(lib => {
			const bookIndex = lib.findIndex(b => b.id == $currentBook.id)
			lib[bookIndex].bookmarks = $currentBook.bookmarks
			return lib
		})
		updateBook($currentBook)
		$addBookmarkModal = false

		showToast('Bookmark saved', 'success')
	}
</script>

<Modal title="Add bookmark" on:close={() => $addBookmarkModal = false} show={$addBookmarkModal} width="narrow">
	<form on:submit|preventDefault={onFormSubmit}>
		<h4 class="book-modal-title lineSmaller">{ $currentBook.title }</h4>
		<div class="line">
			<TextInput label="Title" bind:value={ $addBookmarkData.title } placeholder="Bookmark title" />
			<TextInput label="Time" value={secondsToHMS($addBookmarkData.position)} readonly />
			<TextInput label="Added" value={formatDate($addBookmarkData.added)} readonly />
		</div>
		<button class="button isFull lineSmall" type="submit">Save</button>
		{#if $currentBook.bookmarks.length}
			<button class="button button-light isFull" on:click|preventDefault={() => showBookmarks($currentBook)}>Show bookmarks</button>
		{/if}
	</form>
</Modal>