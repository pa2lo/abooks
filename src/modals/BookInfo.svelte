<script>
	import { createEventDispatcher } from "svelte"
	import { ab, bookInfo, showFileList, showBookmarks } from "../store.svelte"
	import { secondsToHMS, formatDate } from "../utils/helpers"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import InfoLine from "../components/InfoLine.svelte"
	import Icon from "../components/Icon.svelte"
	import AButton from "../components/AButton.svelte"

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

<Modal title={$t('bookInfo')} on:close={() => bookInfo.active = false} show={bookInfo.active}>
	{#if bookInfo.book.metadata.cover}
		<img class="book-modal-img line" src={bookInfo.book.metadata.cover} alt="" >
	{/if}
	<h4 class="book-modal-title lineSmaller">{ bookInfo.book.title }</h4>
	{#if bookInfo.book.metadata.description}
		<p class="lineSmaller">{ bookInfo.book.metadata.description }</p>
	{/if}
	{#if ['author', 'album', 'year', 'genre', 'label', 'language'].some(l => bookInfo.book.metadata[l])}
		<div class="book-modal-cont lineSmaller">
			<h4 class="lineSmall">{$t('info')}</h4>
			{#if bookInfo.book.metadata.author}
				<InfoLine title={$t('author')} value={bookInfo.book.metadata.author} />
			{/if}
			{#if bookInfo.book.metadata.album}
				<InfoLine title={$t('book')} value={bookInfo.book.metadata.album} />
			{/if}
			{#if bookInfo.book.metadata.year}
				<InfoLine title={$t('year')} value={bookInfo.book.metadata.year} />
			{/if}
			{#if bookInfo.book.metadata.artist && bookInfo.book.metadata.artist != bookInfo.book.metadata.author}
				<InfoLine title={$t('narrator')} value={bookInfo.book.metadata.artist} />
			{/if}
			{#if bookInfo.book.metadata.genre}
				<InfoLine title={$t('genre')} value={bookInfo.book.metadata.genre} />
			{/if}
			{#if bookInfo.book.metadata.label}
				<InfoLine title={$t('label')} value={bookInfo.book.metadata.label} />
			{/if}
			{#if bookInfo.book.metadata.language}
				<InfoLine title={$t('lang')} value={bookInfo.book.metadata.language} />
			{/if}
		</div>
	{/if}
	<div class="book-modal-cont lineSmaller">
		<h4 class="lineSmall">{$t('timing')}</h4>
		<InfoLine title={$t('totalTime')} value={secondsToHMS(bookInfo.book.duration)} />
		<InfoLine title={$t('added')} value={formatDate(bookInfo.book.addedDate)} />
		{#if bookInfo.book.lastPlayed}
			<InfoLine title={$t('lastPlay')} value={formatDate(bookInfo.book.lastPlayed)} />
		{/if}
		{#if bookInfo.book.completed}
			<InfoLine title={$t('finished')} value={formatDate(bookInfo.book.completed)} />
		{/if}
	</div>
	<div class="book-modal-cont line">
		<h4 class="lineSmall">{$t('quality')}</h4>
		{#if bookInfo.book.quality.codec}
			<InfoLine title={$t('codec')} value={bookInfo.book.quality.codec} />
		{/if}
		{#if bookInfo.book.quality.bitrate}
			<InfoLine title={$t('bitrate')} value={`${parseInt(bookInfo.book.quality.bitrate / 1000)} kbps`} />
		{/if}
		{#if bookInfo.book.quality.sampleRate}
			<InfoLine title={$t('sr')} value={`${parseFloat(bookInfo.book.quality.sampleRate / 1000)} kHz`} />
		{/if}
		<InfoLine title={$t('storage')} value={$t(bookInfo.book.legacy ? 'appMem2' : 'devStor')} />
	</div>
	<div class="book-modal-buttons line flex ai-c">
		<AButton icon="list" title={$t('files')} light onclick={() => showFileList(bookInfo.book)} />
		<AButton icon="bookmarks" title={$t('bookmarks')} light disabled={!bookInfo.book.bookmarks.length} onclick={() => showBookmarks(bookInfo.book)} />
		<AButton icon="x" title={$t('del')} light onclick={deleteBook} />
		<AButton icon={bookPlaying ? 'pause' : 'play'} title={ $t(bookPlaying ? 'pause' : 'play') } onclick={setBook} />
	</div>
</Modal>