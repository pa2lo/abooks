<script>
	import { createEventDispatcher } from "svelte"
	import { ab, bookmarks, showToast } from "../store.svelte"
	import { secondsToHMS, formatDate } from "../utils/helpers"
	import { updateBook } from "../library.svelte"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import InfoLine from "../components/InfoLine.svelte"

	const dispatch = createEventDispatcher()

	function deleteBookmark(ts) {
		bookmarks.book.bookmarks = bookmarks.book.bookmarks.filter(b => b.added != ts)

		updateBook(bookmarks.book)
		showToast($t('bmRemoved'), 'success')
	}

	function seekTo(time) {
		if (!isPlayable) return
		dispatch('seekTo', time)
	}

	let isPlayable = $derived(ab.currentBook?.id == bookmarks.book?.id)
	let sortedBookmarks = $derived(bookmarks.active ? bookmarks.book.bookmarks.toSorted((a, b) => a.position - b.position) : [])
</script>

<Modal title={$t('bookmarks')} on:close={() => bookmarks.active = false} show={bookmarks.active}>
	<h4 class="book-modal-title lineSmaller">{ bookmarks.book.title }</h4>
	<div class="book-modal-cont">
		{#if bookmarks.book.bookmarks?.length}
			{#each sortedBookmarks as bookmark}
				<InfoLine title={bookmark.title || formatDate(bookmark.added)} value={secondsToHMS(bookmark.position)} reverse clickable={isPlayable} onclick={() => isPlayable && seekTo(bookmark.position)} removable={() => deleteBookmark(bookmark.added)} />
			{/each}
		{:else}
			<p class="info-line-outer">{$t('noBookmarks')}</p>
		{/if}
	</div>
</Modal>
