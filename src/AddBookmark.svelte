<svelte:options runes={true} />
<script>
	import { ab, newBookmark, showBookmarks, showToast } from "./store.svelte"
	import { formatDate, secondsToHMS } from "./helpers"
	import { updateBook } from "./library.svelte"

	import Modal from "./components/Modal.svelte"
	import TextInput from "./components/TextInput.svelte"

	function onFormSubmit(e) {
		e.preventDefault()

		const bookmarkData = {
			added: newBookmark.data.added,
			position: newBookmark.data.position,
			title: newBookmark.data.title
		}
		ab.currentBook.bookmarks.push(bookmarkData)

		updateBook(ab.currentBook)
		newBookmark.active = false

		showToast('Bookmark saved', 'success')
	}
</script>

<Modal title="Add bookmark" on:close={() => newBookmark.active = false} show={newBookmark.active} width="narrow">
	<form onsubmit={onFormSubmit}>
		<h4 class="book-modal-title lineSmaller">{ ab.currentBook.title }</h4>
		<div class="line">
			<TextInput label="Title" bind:value={ newBookmark.data.title } placeholder="Bookmark title" />
			<TextInput label="Time" value={secondsToHMS(newBookmark.data.position)} readonly />
			<TextInput label="Added" value={formatDate(newBookmark.data.added)} readonly />
		</div>
		<button class="button isFull lineSmall" type="submit">Save</button>
		{#if ab.currentBook.bookmarks.length}
			<button class="button button-light isFull" onclick={() => showBookmarks(ab.currentBook)}>Show bookmarks</button>
		{/if}
	</form>
</Modal>