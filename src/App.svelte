<script>
	import { onMount } from 'svelte'
	import { scale } from 'svelte/transition'
	import { AudiobookDB } from './db'
	import { addBook, deleteBook } from './library'
	import { db, library, currentBook, isPlaying, isLoading, addingBook, librarySort, showBookInfo, showFileList, showBookmarks, showToast } from './store'
	import { secondsToHMS, selfFocus, isiOS, isSafari, isStandalone, saveLSSetting } from './helpers'

	import AudioPlayer from './AudioPlayer.svelte'
	import BookInfo from './BookInfo.svelte'
	import FileList from './FileList.svelte'
	import BookmarkList from './BookmarkList.svelte'
	import SleepTimer from './SleepTimer.svelte'
	import AppSettings from './AppSettings.svelte'
	import AppHotkeys from './AppHotkeys.svelte'
	import AddBookmark from './AddBookmark.svelte'
	import Toaster from './Toaster.svelte'
	import Modal from './components/Modal.svelte'
	import Icon from './components/Icon.svelte'
	import IcoButton from './components/IcoButton.svelte'
	import DdButton from './components/DdButton.svelte'

	let loading = true

	let installPrompt = null
	let showIOsInstall = false
	function installApp() {
		if (!installPrompt) return

		installPrompt.prompt()
		installPrompt.userChoice.then(res => {
			if (res?.outcome === 'accepted') installPrompt = null
		})
	}

	onMount(async () => {
		window.addEventListener("beforeinstallprompt", (event) => {
			event.preventDefault()
			installPrompt = event
		})

		$db = new AudiobookDB()
		await $db.init()
		$library = await $db.getAllBooks()
		sortLibrary()
		loading = false

		const lastPlayed = localStorage.getItem('lastPlayed')
		if (lastPlayed && $library.find(b => b.id == lastPlayed)) {
			player.setBook($library.find(b => b.id == lastPlayed), true)
		}

		let permissions = {}
		await $library.forEach(async b => {
			if (b.dirHandle) permissions[b.id] = await b.dirHandle.queryPermission({ mode: 'read' }) === 'granted'
		})
	})

	let deletingBookIDs = []
	async function deleteBookHelper(book, e = null) {
		deleteBook(e, book, () => {
			deletingBookIDs = [...deletingBookIDs, book.id]
			if (window.location.hash == '#player') history.back()
			if ($currentBook?.id == book.id) player.destroyBook()
		}, () => {
			deletingBookIDs = deletingBookIDs.filter(i => i != book.id)
		})
	}

	let player
	let showSettings
	let showHotkeys

	function sortLibrary() {
		$library = [...$library].sort((a, b) => {
			if ($librarySort == 'recentlyPlayed') return b.lastPlayed - a.lastPlayed
			if ($librarySort == 'duration') return b.duration - a.duration
			if ($librarySort == 'title') return a.title.localeCompare(b.title)
			return b.addedDate - a.addedDate
		})
	}

	function onSortChange(e) {
		e.target.blur()
		sortLibrary()
		saveLSSetting('librarySort', 'newest', $librarySort)
	}

	const sortOptions = [
		{
			value: 'newest',
			title: 'Newest'
		}, {
			value: 'recentlyPlayed',
			title: 'Recently played'
		}, {
			value: 'duration',
			title: 'Duration'
		}, {
			value: 'title',
			title: 'Title A-Z'
		}
	]

	function forceRefresh() {
		window.location.reload(true)
	}
</script>

<header class="header flex ai-c">
	<h1 class="mr-a"><a href="/" on:click|preventDefault={forceRefresh}>{ !$library.length ? 'ABooks' : 'Library'}</a></h1>
	{#if installPrompt}
		<IcoButton title="Download app" icon="download" on:click={installApp} />
	{/if}
	{#if isiOS && isSafari && !isStandalone}
		<IcoButton title="Download app" icon="download" on:click={() => showIOsInstall = true} />
	{/if}
	<IcoButton title="Keyboard shortcusts" icon="command" clss="touch-hide" on:click={showHotkeys} />
	{#if $library.length}
		<div class="dd-cont flex">
			<IcoButton title="Sort" icon="sort" on:pointerdown={selfFocus} />
			<div class="dd-menu dd-pop dd-bottom-center">
				{#each sortOptions as option}
					<label class="dd-options-label" class:isSelected={$librarySort == option.value}>
						<input class="dd-options-input" type="radio" value={option.value} name="sort" bind:group={$librarySort} on:change={onSortChange} tabindex="0" />
						<span>{option.title}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
	<IcoButton title="Settings" icon="settings" on:click={showSettings} />
	{#if $library.length}
		<button class="button" class:isLoading={$addingBook} on:click={addBook}>
			<Icon icon="plus" />
			<span class="button-text">Add book</span>
		</button>
	{/if}
</header>
<main>
	{#if $library.length}
		<div class="library">
			{#each $library as book (book.id)}
				<div transition:scale={{duration: 250}} class="book" class:isCurrent={book.id == $currentBook?.id}>
					<img class="book-thumb" src={book.metadata.cover || '/book.svg'} alt={book.title} />
					<div class="book-info">
						<div class="book-info-title">{book.title}</div>
						<div class="book-info-duration lighter">{ secondsToHMS(book.duration) }</div>
					</div>
					<button class="book-toggle" on:click|preventDefault={() => player.setBook(book)} aria-label="{$isPlaying && $currentBook?.id == book.id ? 'Pause' : 'Play'} - {book.title}"></button>
					<button class="book-button" class:isLoading={$isLoading && $currentBook?.id == book.id} class:completed={book.completed} class:onEnd={book.completed && book.duration - book.absolutePosition < 1} on:click|preventDefault={() => player.setBook(book)} type="button" title={$isPlaying && $currentBook?.id == book.id ? 'Pause' : 'Play'}>
						{#if $isPlaying && $currentBook?.id == book.id}
							<Icon icon="pause" />
						{:else}
							<Icon icon="play" />
						{/if}
						<span class="book-button-progress" style="--complete: {book.absolutePosition / book.duration * 100}%;"></span>
					</button>
					<div class="dd-cont">
						<IcoButton title="Book options" icon="vertical-dots" clss="smaller-button" on:pointerdown={selfFocus} />
						<div class="dd-menu dd-pop dd-bottom-right">
							<DdButton title="Book info" icon="info" on:click={() => showBookInfo(book)} />
							<DdButton title="File list" icon="list" on:click={() => showFileList(book)} />
							<DdButton title="Bookmarks" icon="bookmarks" disabled={!book.bookmarks.length} on:click={() => showBookmarks(book)} />
							<DdButton title="Delete book" icon="x" on:click={(e) => deleteBookHelper(book, e)} />
						</div>
					</div>
					{#if deletingBookIDs.includes(book.id)}
						<div class="delete-loader">
							<div class="loader"></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="no-books ta-c">
			<Icon icon="empty" />
			<h2 class="line lighter">No books</h2>
			<button class="button" class:isLoading={$addingBook} on:click={addBook}>
				<Icon icon="plus" />
				<span class="button-text">Add book</span>
			</button>
		</div>
	{/if}
</main>
<AudioPlayer bind:this={player} on:addBook={addBook} on:bookPlayed={() => $librarySort == 'recentlyPlayed' && sortLibrary()} />
<AppHotkeys bind:showHotkeys />
<BookInfo on:deleteBook={(e) => deleteBookHelper(e.detail)} on:setBook={(e) => player.setBook(e.detail)} />
<FileList on:seekTo={(e) => player.seekToPosition(e.detail)} />
<BookmarkList on:seekTo={(e) => player.seekToPosition(e.detail)} />
<AddBookmark />
<SleepTimer on:finished={() => player.stopPlayback()} />
<AppSettings bind:showSettings on:updateMediaKeys={() => player.updatemediaSessionHandlers()} />
<Toaster />
<Modal title="Download app" on:close={() => showIOsInstall = false} show={showIOsInstall}>
	<p class="lineSmall">1. Press the "Share" button</p>
	<img class="i-img lineSmaller" src="/img/step1.png" alt="" />
	<p class="lineSmall">2. Select "Add to Home Screen" from the popup</p>
	<img class="i-img lineSmaller" src="/img/step2.png" alt="" />
	<p class="lineSmall">3. Tap "Add" in the top right corner</p>
	<img class="i-img lineSmaller" src="/img/step3.png" alt="" />
</Modal>