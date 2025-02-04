<script>
	import { onMount } from 'svelte'
	import { scale } from 'svelte/transition'
	import { AudiobookDB } from './db'
	import { library, positions, addBook, deleteBook } from './library.svelte'
	import { ab, abSettings, showBookInfo, showFileList, showBookmarks } from './store.svelte'
	import { secondsToHMS, selfFocus, isiOS, isSafari, isStandalone, saveLSSetting } from './helpers'

	import AudioPlayer from './AudioPlayer.svelte'
	import BookInfo from './BookInfo.svelte'
	import FileList from './FileList.svelte'
	import BookmarkList from './BookmarkList.svelte'
	import SleepTimer from './SleepTimer.svelte'
	import AppSettings from './AppSettings.svelte'
	import AppHotkeys from './AppHotkeys.svelte'
	import AddBookmark from './AddBookmark.svelte'
	import JumpTo from './JumpTo.svelte'
	import Toaster from './Toaster.svelte'
	import Modal from './components/Modal.svelte'
	import Icon from './components/Icon.svelte'
	import IcoButton from './components/IcoButton.svelte'
	import DdButton from './components/DdButton.svelte'

	let loading = true

	let installPrompt = $state(null)
	let showIOsInstall = $state(false)
	function installApp() {
		if (!installPrompt) return

		installPrompt.prompt()
		installPrompt.userChoice.then(res => {
			if (res?.outcome === 'accepted') installPrompt = null
		})
	}

	onMount(async () => {
		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault()
			installPrompt = e
		})

		ab.db = new AudiobookDB()
		await ab.db.init()
		let positionsDB = await ab.db.getAllPositions()
		positions.books = positionsDB.reduce((acc, item) => {
			acc[item.id] = item
			return acc
		}, {})
		library.books = await ab.db.getAllBooks()
		sortLibrary()
		loading = false

		const lastPlayed = localStorage.getItem('lastPlayed')
		if (lastPlayed && library.books.find(b => b.id == lastPlayed)) {
			player.setBook(library.books.find(b => b.id == lastPlayed), true)
		}

		let permissions = {}
		await library.books.forEach(async b => {
			if (b.dirHandle) permissions[b.id] = await b.dirHandle.queryPermission({ mode: 'read' }) === 'granted'
		})
	})

	let deletingBookIDs = $state([])
	async function deleteBookHelper(book, e = null) {
		deleteBook(e, book, () => {
			deletingBookIDs = [...deletingBookIDs, book.id]
			if (window.location.hash == '#player') history.back()
			if (ab.currentBook?.id == book.id) player.destroyBook()
		}, () => {
			deletingBookIDs = deletingBookIDs.filter(i => i != book.id)
		})
	}

	let player = $state()
	let settings = $state()
	let hotkeys = $state()

	function sortLibrary() {
		library.books = library.books.toSorted((a, b) => {
			if (abSettings.sort == 'recentlyPlayed') return b.lastPlayed - a.lastPlayed
			else if (abSettings.sort == 'duration') return b.duration - a.duration
			else if (abSettings.sort == 'title') return a.title.localeCompare(b.title)
			else return b.addedDate - a.addedDate
		})
	}

	function onSortChange(e) {
		e.target.blur()
		sortLibrary()
		saveLSSetting('librarySort', 'newest', abSettings.sort)
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

	function forceRefresh(e) {
		e.preventDefault()
		window.location.reload(true)
	}
</script>

<header class="header flex ai-c">
	<h1 class="mr-a"><a href="/" onclick={forceRefresh}>{ !library.books.length ? 'ABooks' : 'Library'}</a></h1>
	{#if installPrompt}
		<IcoButton title="Download app" icon="download" onclick={installApp} />
	{/if}
	{#if isiOS && isSafari && !isStandalone}
		<IcoButton title="Download app" icon="download" onclick={() => showIOsInstall = true} />
	{/if}
	<IcoButton title="Keyboard shortcusts" icon="command" clss="touch-hide" onclick={hotkeys.show} />
	{#if library.books.length}
		<div class="dd-cont">
			<IcoButton title="Sort" icon="sort" onpointerdown={selfFocus} />
			<div class="dd-menu dd-pop dd-bottom-center">
				{#each sortOptions as option}
					<label class="dd-options-label" class:isSelected={abSettings.sort == option.value}>
						<input class="dd-options-input" type="radio" value={option.value} name="sort" bind:group={abSettings.sort} onchange={onSortChange} tabindex="0" />
						<span>{option.title}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
	<IcoButton title="Settings" icon="settings" onclick={settings.show} />
	{#if library.books.length}
		<button class="button" class:isLoading={ab.addingBook} onclick={addBook}>
			<Icon icon="plus" />
			<span class="button-text">Add book</span>
		</button>
	{/if}
</header>
<main>
	{#if library.books.length}
		<div class="library">
			{#each library.books as book (book.id)}
				<div transition:scale={{duration: 250}} class="book" class:isCurrent={book.id == ab.currentBook?.id}>
					<img class="book-thumb" src={book.metadata.cover || '/book.svg'} alt={book.title} />
					<div class="book-info">
						<div class="book-info-title">{book.title}</div>
						<div class="book-info-duration flex ai-c lighter">
							<Icon icon={book.legacy ? 'db' : 'folder'} />
							{#if book.bookmarks.length}
								<Icon icon="bookmarks" />
							{/if}
							{#if book.completed}
								<Icon icon="success" />
							{/if}
							<span>{ secondsToHMS(book.duration) }</span>
						</div>
					</div>
					<button class="book-toggle" onclick={(e) => player.setBook(book, false, e)} aria-label="{ab.isPlaying && ab.currentBook?.id == book.id ? 'Pause' : 'Play'} - {book.title}"></button>
					<button class="book-button" class:isLoading={ab.isLoading && ab.currentBook?.id == book.id} class:completed={book.completed} class:onEnd={book.completed && book.duration - positions.books[book.id].absolutePosition < 1} onclick={(e) => player.setBook(book, false, e)} type="button" title={ab.isPlaying && ab.currentBook?.id == book.id ? 'Pause' : 'Play'}>
						<Icon icon={ab.isPlaying && ab.currentBook?.id == book.id ? 'pause' : 'play'} />
						<span class="book-button-progress" style="--complete: {positions.books[book.id].absolutePosition / book.duration * 100}%;"></span>
					</button>
					<div class="dd-cont">
						<IcoButton title="Book options" icon="vertical-dots" clss="smaller-button" onpointerdown={selfFocus} />
						<div class="dd-menu dd-pop dd-bottom-right">
							<DdButton title="Book info" icon="info" onclick={() => showBookInfo(book)} />
							<DdButton title="File list" icon="list" onclick={() => showFileList(book)} />
							<DdButton title="Bookmarks" icon="bookmarks" disabled={!book.bookmarks.length} onclick={() => showBookmarks(book)} />
							<DdButton title="Delete book" icon="x" onclick={(e) => deleteBookHelper(book, e)} />
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
			<button class="button" class:isLoading={ab.addingBook} onclick={addBook}>
				<Icon icon="plus" />
				<span class="button-text">Add book</span>
			</button>
		</div>
	{/if}
</main>
<AudioPlayer bind:this={player} on:addBook={addBook} on:bookPlayed={() => abSettings.sort == 'recentlyPlayed' && sortLibrary()} />
<AppHotkeys bind:this={hotkeys} />
<BookInfo on:deleteBook={(e) => deleteBookHelper(e.detail)} on:setBook={(e) => player.setBook(e.detail)} />
<FileList on:seekTo={(e) => player.seekToPosition(e.detail)} />
<BookmarkList on:seekTo={(e) => player.seekToPosition(e.detail)} />
<AddBookmark />
<JumpTo on:seekTo={(e) => player.seekToPosition(e.detail)} />
<SleepTimer on:finished={() => player.stopPlayback()} />
<AppSettings bind:this={settings} on:updateMediaKeys={() => player.updatemediaSessionHandlers()} />
<Toaster />
<Modal title="Download app" on:close={() => showIOsInstall = false} show={showIOsInstall}>
	<p class="lineSmall">1. Press the "Share" button</p>
	<img class="i-img lineSmaller" src="/img/step1.png" alt="" />
	<p class="lineSmall">2. Select "Add to Home Screen" from the popup</p>
	<img class="i-img lineSmaller" src="/img/step2.png" alt="" />
	<p class="lineSmall">3. Tap "Add" in the top right corner</p>
	<img class="i-img lineSmaller" src="/img/step3.png" alt="" />
</Modal>