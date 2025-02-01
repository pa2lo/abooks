<script>
	import { createEventDispatcher } from "svelte"
	import { bookInfoData, bookInfoModal, currentBook, isPlaying, showFileList, showBookmarks } from "./store"
	import { secondsToHMS, formatDate } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import InfoLine from "./components/InfoLine.svelte"
	import Icon from "./components/Icon.svelte"

	const dispatch = createEventDispatcher()

	function deleteBook() {
		$bookInfoModal = false
		dispatch('deleteBook', $bookInfoData)
	}
	function setBook() {
		dispatch('setBook', $bookInfoData)
	}

	$: bookPlaying = $currentBook?.id == $bookInfoData?.id && $isPlaying
</script>

<Modal title="Book info" on:close={() => $bookInfoModal = false} show={$bookInfoModal}>
	{#if $bookInfoData.metadata.cover}
		<img class="book-modal-img line" src={$bookInfoData.metadata.cover} alt="" >
	{/if}
	<h4 class="book-modal-title lineSmaller">{ $bookInfoData.title }</h4>
	{#if $bookInfoData.metadata.description}
		<p class="lineSmaller">{ $bookInfoData.metadata.description }</p>
	{/if}
	{#if ['author', 'album', 'year', 'genre', 'label', 'language'].some(l => $bookInfoData.metadata[l])}
		<div class="book-modal-cont lineSmaller">
			<h4 class="lineSmall">Info</h4>
			{#if $bookInfoData.metadata.author}
				<InfoLine title="Author" value={$bookInfoData.metadata.author} />
			{/if}
			{#if $bookInfoData.metadata.album}
				<InfoLine title="Book" value={$bookInfoData.metadata.album} />
			{/if}
			{#if $bookInfoData.metadata.year}
				<InfoLine title="Year" value={$bookInfoData.metadata.year} />
			{/if}
			{#if $bookInfoData.metadata.artist && $bookInfoData.metadata.artist != $bookInfoData.metadata.author}
				<InfoLine title="Narrator" value={$bookInfoData.metadata.artist} />
			{/if}
			{#if $bookInfoData.metadata.genre}
				<InfoLine title="Genre" value={$bookInfoData.metadata.genre} />
			{/if}
			{#if $bookInfoData.metadata.label}
				<InfoLine title="Label" value={$bookInfoData.metadata.label} />
			{/if}
			{#if $bookInfoData.metadata.language}
				<InfoLine title="Language" value={$bookInfoData.metadata.language} />
			{/if}
		</div>
	{/if}
	<div class="book-modal-cont lineSmaller">
		<h4 class="lineSmall">Timing</h4>
		<InfoLine title="Total time" value={secondsToHMS($bookInfoData.duration)} />
		<InfoLine title="Added" value={formatDate($bookInfoData.addedDate)} />
		{#if $bookInfoData.lastPlayed}
			<InfoLine title="Last played" value={formatDate($bookInfoData.lastPlayed)} />
		{/if}
		{#if $bookInfoData.completed}
			<InfoLine title="Finished" value={formatDate($bookInfoData.completed)} />
		{/if}
	</div>
	<div class="book-modal-cont line">
		<h4 class="lineSmall">Quality</h4>
		{#if $bookInfoData.quality.codec}
			<InfoLine title="Codec" value={$bookInfoData.quality.codec} />
		{/if}
		{#if $bookInfoData.quality.bitrate}
			<InfoLine title="Bitrate" value={`${parseInt($bookInfoData.quality.bitrate / 1000)} kbps`} />
		{/if}
		{#if $bookInfoData.quality.sampleRate}
			<InfoLine title="Sample rate" value={`${parseFloat($bookInfoData.quality.sampleRate / 1000)} kHz`} />
		{/if}
		<InfoLine title="Storage" value={$bookInfoData.legacy ? 'App memory' : 'Device storage'} />
	</div>
	<div class="book-modal-buttons line flex ai-c">
		<button class="button button-light" on:click={() => showFileList($bookInfoData)}>
			<Icon icon="list" />
			<span class="button-text">Files</span>
		</button>
		<button class="button button-light" disabled={!$bookInfoData.bookmarks.length} on:click={() => showBookmarks($bookInfoData)}>
			<Icon icon="bookmarks" />
			<span class="button-text">Bookmarks</span>
		</button>
		<button class="button button-light" on:click={deleteBook}>
			<Icon icon="x" />
			<span class="button-text">Delete</span>
		</button>
		<button class="button" on:click={setBook}>
			<Icon icon={bookPlaying ? 'pause' : 'play'} />
			<span class="button-text">{ bookPlaying ? 'Pause' : 'Play' }</span>
		</button>
	</div>
</Modal>