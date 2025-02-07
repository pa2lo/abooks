<svelte:options runes={true} />
<script>
	import { ab, newBookmark, showBookmarks, showToast } from "../store.svelte"
	import { formatDate, secondsToHMS } from "../utils/helpers"
	import { updateBook } from "../library.svelte"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import TextInput from "../components/TextInput.svelte"

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

		showToast($t('bmSaved'), 'success')
	}
</script>

<Modal title={$t('addBookmark')} on:close={() => newBookmark.active = false} show={newBookmark.active} width="narrow">
	<form onsubmit={onFormSubmit}>
		<h4 class="book-modal-title lineSmaller">{ ab.currentBook.title }</h4>
		<div class="line">
			<TextInput label={$t('title')} bind:value={ newBookmark.data.title } placeholder="Bookmark title" />
			<TextInput label={$t('time')} value={secondsToHMS(newBookmark.data.position)} readonly />
			<TextInput label={$t('added')} value={formatDate(newBookmark.data.added)} readonly />
		</div>
		<button class="button isFull lineSmall" type="submit">{$t('save')}</button>
		{#if ab.currentBook.bookmarks.length}
			<button class="button button-light isFull" type="button" onclick={() => showBookmarks(ab.currentBook)}>{$t('showBookmarks')}</button>
		{/if}
	</form>
</Modal>