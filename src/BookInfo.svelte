<script>
	import { createEventDispatcher } from "svelte"
	import { ab, bookInfo, showFileList, showBookmarks } from "./store.svelte"
	import { secondsToHMS, formatDate } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import InfoLine from "./components/InfoLine.svelte"
	import Icon from "./components/Icon.svelte"

	const dispatch = createEventDispatcher()

	function deleteBook() {
		bookInfo.active = false
		dispatch('deleteBook', bookInfo.book)
	}
	function setBook() {
		dispatch('setBook', bookInfo.book)
	}

	let bookPlaying = $derived(ab.currentBook?.id == bookInfo.book?.id && ab.isPlaying)
</script>

<Modal title="Book info" on:close={() => bookInfo.active = false} show={bookInfo.active}>
	{#if bookInfo.book.metadata.cover}
		<img class="book-modal-img line" src={bookInfo.book.metadata.cover} alt="" >
	{/if}
	<h4 class="book-modal-title lineSmaller">{ bookInfo.book.title }</h4>
	{#if bookInfo.book.metadata.description}
		<p class="lineSmaller">{ bookInfo.book.metadata.description }</p>
	{/if}
	{#if ['author', 'album', 'year', 'genre', 'label', 'language'].some(l => bookInfo.book.metadata[l])}
		<div class="book-modal-cont lineSmaller">
			<h4 class="lineSmall">Info</h4>
			{#if bookInfo.book.metadata.author}
				<InfoLine title="Author" value={bookInfo.book.metadata.author} />
			{/if}
			{#if bookInfo.book.metadata.album}
				<InfoLine title="Book" value={bookInfo.book.metadata.album} />
			{/if}
			{#if bookInfo.book.metadata.year}
				<InfoLine title="Year" value={bookInfo.book.metadata.year} />
			{/if}
			{#if bookInfo.book.metadata.artist && bookInfo.book.metadata.artist != bookInfo.book.metadata.author}
				<InfoLine title="Narrator" value={bookInfo.book.metadata.artist} />
			{/if}
			{#if bookInfo.book.metadata.genre}
				<InfoLine title="Genre" value={bookInfo.book.metadata.genre} />
			{/if}
			{#if bookInfo.book.metadata.label}
				<InfoLine title="Label" value={bookInfo.book.metadata.label} />
			{/if}
			{#if bookInfo.book.metadata.language}
				<InfoLine title="Language" value={bookInfo.book.metadata.language} />
			{/if}
		</div>
	{/if}
	<div class="book-modal-cont lineSmaller">
		<h4 class="lineSmall">Timing</h4>
		<InfoLine title="Total time" value={secondsToHMS(bookInfo.book.duration)} />
		<InfoLine title="Added" value={formatDate(bookInfo.book.addedDate)} />
		{#if bookInfo.book.lastPlayed}
			<InfoLine title="Last played" value={formatDate(bookInfo.book.lastPlayed)} />
		{/if}
		{#if bookInfo.book.completed}
			<InfoLine title="Finished" value={formatDate(bookInfo.book.completed)} />
		{/if}
	</div>
	<div class="book-modal-cont line">
		<h4 class="lineSmall">Quality</h4>
		{#if bookInfo.book.quality.codec}
			<InfoLine title="Codec" value={bookInfo.book.quality.codec} />
		{/if}
		{#if bookInfo.book.quality.bitrate}
			<InfoLine title="Bitrate" value={`${parseInt(bookInfo.book.quality.bitrate / 1000)} kbps`} />
		{/if}
		{#if bookInfo.book.quality.sampleRate}
			<InfoLine title="Sample rate" value={`${parseFloat(bookInfo.book.quality.sampleRate / 1000)} kHz`} />
		{/if}
		<InfoLine title="Storage" value={bookInfo.book.legacy ? 'App memory' : 'Device storage'} />
	</div>
	<div class="book-modal-buttons line flex ai-c">
		<button class="button button-light" onclick={() => showFileList(bookInfo.book)}>
			<Icon icon="list" />
			<span class="button-text">Files</span>
		</button>
		<button class="button button-light" disabled={!bookInfo.book.bookmarks.length} onclick={() => showBookmarks(bookInfo.book)}>
			<Icon icon="bookmarks" />
			<span class="button-text">Bookmarks</span>
		</button>
		<button class="button button-light" onclick={deleteBook}>
			<Icon icon="x" />
			<span class="button-text">Delete</span>
		</button>
		<button class="button" onclick={setBook}>
			<Icon icon={bookPlaying ? 'pause' : 'play'} />
			<span class="button-text">{ bookPlaying ? 'Pause' : 'Play' }</span>
		</button>
	</div>
</Modal>