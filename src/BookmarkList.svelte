<script>
	import { createEventDispatcher } from "svelte"
	import { bookmarksModal, bookmarksBook, currentBook, library, showToast } from "./store"
	import { secondsToHMS, formatDate } from "./helpers"
	import { updateBook } from "./library"

	import Modal from "./components/Modal.svelte"
	import InfoLine from "./components/InfoLine.svelte"

	const dispatch = createEventDispatcher()

	function deleteBookmark(ts) {
		if ($bookmarksBook.id == $currentBook.id) $currentBook.bookmarks = $currentBook.bookmarks.filter(b => b.added != ts)
		$bookmarksBook.bookmarks = $bookmarksBook.bookmarks.filter(b => b.added != ts)
		library.update(lib => {
			const bookIndex = lib.findIndex(b => b.id == $bookmarksBook.id)
			lib[bookIndex].bookmarks = lib[bookIndex].bookmarks.filter(b => b.added != ts)
			return lib
		})
		updateBook($bookmarksBook)
		showToast('Bookmark removed', 'success')
	}

	function seekTo(time) {
		if (!isPlayable) return
		dispatch('seekTo', time)
	}

	$: isPlayable = $currentBook?.id == $bookmarksBook?.id
</script>

<Modal title="Bookmarks" on:close={() => $bookmarksModal = false} show={$bookmarksModal}>
	<h4 class="book-modal-title lineSmaller">{ $bookmarksBook.title }</h4>
	<div class="book-modal-cont">
		{#if $bookmarksBook.bookmarks?.length}
			{#each $bookmarksBook.bookmarks as bookmark}
				<InfoLine title={bookmark.title || formatDate(bookmark.added)} value={secondsToHMS(bookmark.position)} reverse clickable={isPlayable} on:click={() => isPlayable && seekTo(bookmark.position)} removable={() => deleteBookmark(bookmark.added)} />
			{/each}
		{:else}
			<p class="info-line-outer">You have no bookmarks for this book.</p>
		{/if}
	</div>
</Modal>
