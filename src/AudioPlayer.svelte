<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte'
	import { isPlaying, isLoading, currentBook, db, library, showBookInfo, showFileList, showSleepTimer, sleepActive, appSeek, appMediaKeys, appTimeDisplay, switchTimeDisplay, showBookmarks, showAddBookmark, showToast } from './store'
	import { updateBook } from './library'
	import { secondsToHMS, selfFocus, removeFileExtension, isiOS } from './helpers'

	import Icon from './components/Icon.svelte'
	import IcoButton from './components/IcoButton.svelte'
	import DdButton from './components/DdButton.svelte'

	let audioElement
	let bookFiles
	let bookFilesMarkers = []
	let currentFile
	let currentFileIndex
	let fileLoaded = false
	let currentBookGranted = false

	const dispatch = createEventDispatcher()

	// media session handlers
	let mediaSessionHandlersSet = false
	const mediaSessionHandlers = [
		['play', async () => {
			if (audioElement && audioElement.paused) await togglePlay()
		}],
		['pause', async () => {
			if (audioElement && !audioElement.paused) await togglePlay()
		}],
		['seekbackward', async () => {
			seekBW()
		}],
		['seekforward', async () => {
			seekFW()
		}],
		['previoustrack', async () => {
			$currentBook.files > 1 && $appMediaKeys == 'track' ? skipToPrevTrack() : seekBW()
		}],
		['nexttrack', async () => {
			$currentBook.files > 1 && $appMediaKeys == 'track' ? skipToNextTrack() : seekFW()
		}]
	]

	function setMediaSessionHandlers() {
		if ("mediaSession" in navigator) {
			for (const [action, handler] of mediaSessionHandlers) {
				try {
					navigator.mediaSession.setActionHandler(action, handler)
				} catch (error) {
					console.log(`The media session action "${action}" is not supported yet.`)
				}
			}
		}
	}

	export function updatemediaSessionHandlers() {
		if (audioElement && mediaSessionHandlersSet) setMediaSessionHandlers()
	}

	function setPlaybackState(state) {
		if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state
	}

	// media session metadata
	function setCurrentFileMetadata() {
		let metadataObject = {
			artist: $currentBook.metadata?.author,
			album: $currentBook.metadata?.album,
			title: currentFile?.title || removeFileExtension(currentFile?.name)
		}
		if ($currentBook.metadata.cover) metadataObject.artwork = [
			{
				src: $currentBook.metadata.cover
			}
		]
		if ("mediaSession" in navigator) {
			navigator.mediaSession.metadata = new MediaMetadata(metadataObject)
		}
	}

	// book operations
	export async function setBook(book, isInit) {
		if (isInit) {
			$currentBook = book
			await loadBookFiles()
			await setCurrentFileIndex($currentBook.currentPosition.fileIndex)
		} else {
			if (book.id == $currentBook?.id && audioElement) return await togglePlay()

			if (audioElement && !audioElement.paused) audioElement.pause()

			$currentBook = book
			mediaSessionHandlersSet = false
			currentBookGranted = false

			await loadBookFiles()

			let newFileLoaded = await loadFile($currentBook.currentPosition.fileIndex)
			if (!newFileLoaded) return

			await togglePlay()
			localStorage.setItem('lastPlayed', book.id)
		}
	}

	export function destroyBook() {
		if (audioElement) {
			if (!audioElement.paused) audioElement.pause()
			URL.revokeObjectURL(audioElement.src)
			audioElement.src = ''
			setPlaybackState("none")
		}
		$currentBook = null
		localStorage.removeItem('lastPlayed')

		if (eqContext) destroyEQ()
	}

	// file operations
	async function loadBookFiles() {
		$isLoading = true
		bookFilesMarkers = []
		bookFiles = await $db.getBookFiles($currentBook.id)
		if (bookFiles.length > 1) bookFilesMarkers = bookFiles.reduce((acc, f, i) => {
			if (i == 0) acc.push(f.duration)
			else if (i+1 == $currentBook.files) return acc
			else acc.push(acc.at(-1) + f.duration)
			return acc
		}, [])
		$isLoading = false
	}
	async function setCurrentFileIndex(index) {
		currentFileIndex = index
		currentFile = bookFiles[index]
	}

	async function checkPermissions(fileHandle) {
		if (await fileHandle.queryPermission({ mode: 'read' }) === 'granted') return true
		if (await fileHandle.requestPermission({ mode: 'read' }) === 'granted') return true
		return false
	}

	function getLegacyFile() {
		return $currentBook.isSafari ? new Blob([currentFile.file.blob], { type: currentFile.file.type }) : currentFile.file
	}

	async function loadFile(index, setPosition) {
		await setCurrentFileIndex(index)

		if (!$currentBook.legacy && !currentBookGranted) {
			const allowed = await checkPermissions($currentBook.dirHandle || bookFiles[0].file)
			if (!allowed) {
				showToast('Permissions are required to play', 'warning')
				return false
			}
			currentBookGranted = true
		}

		try {
			if (!fileLoaded) fileLoaded = true

			const file = $currentBook.legacy ? getLegacyFile() : await currentFile.file.getFile()
			audioElement.src = URL.createObjectURL(file)

			if (setPosition || setPosition === 0) $currentBook.currentPosition.position = setPosition
			audioElement.currentTime = $currentBook.currentPosition.position
		} catch (error) {
			console.error(error)
			showToast('Unable to load file', 'warning')
			return false
		}

		if (audioElement.src) {
			audioElement.volume = $currentBook.volume
			audioElement.playbackRate = $currentBook.speed
			setEqIfNeeded()

			setCurrentFileMetadata()
			if (!mediaSessionHandlersSet) {
				setMediaSessionHandlers()
				mediaSessionHandlersSet = true
			}
		}

		return true
	}

	// hotkeys
	function hotkeysUpHandler(e) {
		if (!e.metaKey && !e.ctrlKey && !e.altKey && !document.activeElement.matches('input[type="text"]')) {
			if ($currentBook) {
				if (e.code == 'Space' && !document.activeElement.matches('button:not(.allow-space)')) {
					if (document.activeElement.matches('.allow-space')) e.preventDefault()
					togglePlay()
				}
				if (e.code == 'KeyP') skipToPrevTrack()
				if (e.code == 'KeyN') skipToNextTrack()
				if (e.code == 'KeyI') showBookInfo($currentBook)
				if (e.code == 'KeyB') showAddBookmark($currentBook.absolutePosition)
				if (e.code == 'KeyF' && $currentBook.files > 1) showFileList($currentBook, bookFiles)
				if (e.code == 'KeyD' && $currentBook.bookmarks?.length) showBookmarks($currentBook)
			}
			if (e.code == 'KeyS') showSleepTimer()
		}
	}
	function hotkeysDownHandler(e) {
		if (!e.metaKey && !e.ctrlKey && !e.altKey && !document.activeElement.matches('input[type="text"]')) {
			if ($currentBook) {
				if (e.code == 'ArrowLeft') seekBW()
				if (e.code == 'ArrowRight') seekFW()
				if (e.code == 'ArrowUp') setVolume(Math.min($currentBook.volume + 0.1, 1))
				if (e.code == 'ArrowDown') setVolume(Math.max($currentBook.volume - 0.1, 0))
			}
			if (e.code == 'KeyA') dispatch('addBook')
		}
	}

	// lifecycle
	onMount(async () => {
		if (!currentFile && $currentBook) {
			await loadBookFiles()
			await setCurrentFileIndex($currentBook.currentPosition.fileIndex)
		}
		document.documentElement.addEventListener('keydown', hotkeysDownHandler)
		document.documentElement.addEventListener('keyup', hotkeysUpHandler)
	})
	onDestroy(() => {
		if (audioElement?.src) {
			audioElement.pause()
			URL.revokeObjectURL(audioElement.src)
		}
		if (eqContext) destroyEQ()
	})

	// position helpers
	function getAbsolutePosition() {
		let position = 0
		for (let i = 0; i < currentFileIndex; i++) {
			position += bookFiles[i].duration
		}
		position += audioElement.currentTime
		return position
	}

	function findPartForPosition(absolutePosition) {
		let accumulatedDuration = 0

		for (let i = 0; i < $currentBook.files; i++) {
			const partDuration = bookFiles[i].duration
			if (absolutePosition < accumulatedDuration + partDuration) {
				return {
					partIndex: i,
					position: absolutePosition - accumulatedDuration
				}
			}
			accumulatedDuration += partDuration
		}
	}

	// playback
	export async function seekToPosition(absolutePosition) {
		const { partIndex, position } = findPartForPosition(absolutePosition)

		if (partIndex !== currentFileIndex || !fileLoaded) {
			if (!audioElement.paused) audioElement.pause()
			let newFileLoaded = await loadFile(partIndex, position)
			if (newFileLoaded) audioElement.play()
		} else {
			audioElement.currentTime = position
			if (audioElement?.paused) await audioElement.play()
		}
	}

	async function skipToNextTrack() {
		if ($isLoading) return
		if ($currentBook.files == currentFileIndex+1) return

		await playFile(currentFileIndex+1)
	}

	async function skipToPrevTrack() {
		if ($isLoading) return
		if ($currentBook.currentPosition.position > 4 || $currentBook.currentPosition.fileIndex == 0) return audioElement.currentTime = 0

		await playFile(currentFileIndex-1)
	}

	function seekBW() {
		if ($isLoading) return
		seekToPosition(Math.max($currentBook.absolutePosition - parseInt($appSeek), 0))
	}
	function seekFW() {
		if ($isLoading) return
		seekToPosition(Math.min($currentBook.absolutePosition + parseInt($appSeek), $currentBook.duration - 1))
	}

	async function playFile(index) {
		let newFileLoaded = await loadFile(index, 0)
		if (newFileLoaded) await audioElement.play()
	}

	async function togglePlay() {
		if ($isLoading) return

		if (!fileLoaded) {
			let newFileLoaded = await loadFile(currentFileIndex)
			if (!newFileLoaded) return
		}

		if (audioElement?.paused) {
			if ($currentBook.absolutePosition + 1 > $currentBook.duration) {
				let newFileLoaded = await loadFile(0, 0)
				if (!newFileLoaded) return
			}
			await audioElement.play()
			$currentBook.lastPlayed = Date.now()
			updateBook($currentBook)
			dispatch('bookPlayed')
		} else audioElement.pause()
	}

	export function stopPlayback() {
		if (audioElement && !audioElement.paused) audioElement.pause()
	}

	// Settings handlers
	async function onEqChange() {
		setEQ()
		await updateBook($currentBook)
	}

	function setVolume(val) {
		$currentBook.volume = val
		onVolumeChange()
	}

	async function onVolumeChange() {
		if (audioElement) audioElement.volume = $currentBook.volume
		await updateBook($currentBook)
	}

	async function onSpeedChange() {
		audioElement.playbackRate = $currentBook.speed
		await updateBook($currentBook)
	}

	// EQ
	let eqContext = null
	let eqSource = null
	let eqLowshelf = null
	let eqLastSetting = 'off'

	function setEqIfNeeded() {
		if (audioElement && ($currentBook.eq != 'off' || eqContext) && eqLastSetting != $currentBook.eq) setEQ()
	}

	function createAudioContext() {
		eqContext = new (window.AudioContext || window.webkitAudioContext)()
		eqSource = eqContext.createMediaElementSource(audioElement)
		eqLowshelf = eqContext.createBiquadFilter()

		eqSource.connect(eqLowshelf).connect(eqContext.destination)
		eqLowshelf.type = "lowshelf"
	}

	function setEQ() {
		if (!eqLowshelf) createAudioContext()

		if ($currentBook.eq == 'off') {
			eqLowshelf.gain.value = 0
		} else if ($currentBook.eq == 'ls1') {
			eqLowshelf.frequency.value = 100
			eqLowshelf.gain.value = -14
		} else if ($currentBook.eq == 'ls2') {
			eqLowshelf.frequency.value = 175
			eqLowshelf.gain.value = -20
		}

		eqLastSetting = $currentBook.eq
	}

	function destroyEQ() {
		if (eqSource) eqSource.disconnect()
		if (eqLowshelf) eqLowshelf.disconnect()

		eqContext.close().catch(err => {
			console.error('Error closing audio context:', err)
		}).finally(() => {
			eqSource = null
			eqContext = null
			eqLowshelf = null
			eqLastSetting = 'off'
		})
	}

	const eqOptions = [
		{value: 'off', title: 'EQ off'},
		{value: 'ls1', title: 'Less Bass'},
		{value: 'ls2', title: 'No Bass'}
	]

	// audio events
	async function updateProgress() {
		if (!$currentBook || !audioElement || audioElement.paused) return
		$currentBook.currentPosition = {
			fileIndex: Math.max(bookFiles.indexOf(currentFile), 0),
			position: audioElement.currentTime,
		}
		$currentBook.absolutePosition = getAbsolutePosition()

		updateBook($currentBook)
	}

	async function handleEnded() {
		const nextIndex = bookFiles.indexOf(currentFile) + 1
		if (nextIndex < $currentBook.files) {
			let newFileLoaded = await loadFile(nextIndex, 0)
			if (newFileLoaded) await audioElement.play()
		} else {
			updateBook($currentBook, 'completed', Date.now())
			setPlaybackState("none")
		}
	}

	function onPlay() {
		$isPlaying = true
		if (eqContext) eqContext.resume()
	}

	function onPlaying() {
		setPlaybackState("playing")
	}

	function onPause() {
		$isPlaying = false
		if (eqContext) eqContext.suspend()
		setPlaybackState("paused")
	}

	// maps
	const fwIconMap = {
		5: 'forward5',
		15: 'forward15',
		30: 'forward30'
	}
	const bwIconMap = {
		5: 'backward5',
		15: 'backward15',
		30: 'backward30'
	}
	function getVolumeIcon() {
		if ($currentBook?.volume == 0) return 'volume3'
		else if ($currentBook?.volume < 0.6) return 'volume2'
		return 'volume'
	}

	// range mouse position
	let rangePosition = 0
	let rangeOffsetX = 0
	function onRangeMousemove(e) {
		const adjustedX = Math.max(0, Math.min(e.offsetX - 9, e.target.clientWidth - 18));
		rangeOffsetX = parseFloat(adjustedX / (e.target.clientWidth - 18))
		rangePosition = secondsToHMS(parseFloat(rangeOffsetX * $currentBook.duration))
	}

	// computed time
	function toggleTimeDisplay() {
		$appTimeDisplay = $appTimeDisplay == 'total' ? 'remaining' : 'total'
		switchTimeDisplay()
	}

	$: totalBookTime = $currentBook
    ? $appTimeDisplay === 'remaining'
      ? `-${secondsToHMS($currentBook.duration - $currentBook.absolutePosition)}`
      : secondsToHMS($currentBook.duration)
    : ""
</script>

{#if $currentBook}
	<a class="small-player flex ai-c rm-hide" href="#player" aria-label="Player">
		<img class="small-player-thumb" src={$currentBook.metadata.cover || '/book.svg'} alt="">
		<div class="small-player-info">
			{ $currentBook.title }
		</div>
		<button class="small-player-button" on:click|preventDefault|stopPropagation={() => togglePlay()} title={$isPlaying ? 'Pause' : 'Play'}>
			<Icon icon={$isPlaying ? 'pause' : 'play'} />
		</button>
		<progress class="small-player-progress" max={$currentBook.duration} value={$currentBook.absolutePosition}></progress>
	</a>

	<div class="audio-player" id="player">
		<audio
			bind:this={audioElement}
			on:ended={handleEnded}
			on:timeupdate={updateProgress}
			on:play={onPlay}
			on:playing={onPlaying}
			on:pause={onPause}
			class="invisible"
		></audio>
		<div class="audio-player-inner">
			<div class="audio-player-header rm-hide flex ai-c">
				<IcoButton title="Back" icon="back" on:click={() => history.back()} />
				<IcoButton title="File list" icon="list" clss="allow-space ml-a" on:click={() => showFileList($currentBook, bookFiles)} />
				<IcoButton title="Bookmarks" icon="bookmarks" clss="allow-space" disabled={!$currentBook.bookmarks.length} on:click={() => showBookmarks($currentBook)} />
				<IcoButton title="Book info" icon="info" clss="allow-space" on:click={() => showBookInfo($currentBook)} />
			</div>

			<div class="audio-player-thumb-cont">
				{#if $currentBook.metadata.cover}
					<div class="audio-player-thumb-fx-cont">
						<img class="audio-player-thumb-fx" src={$currentBook.metadata.cover} alt="" />
					</div>
				{/if}
				<img class="audio-player-thumb" src={$currentBook.metadata.cover || '/book.svg'} alt="" />
			</div>

			<div class="audio-player-info">
				<div class="audio-player-title">
					{$currentBook.title}
				</div>
				<div class="audio-player-part">
					{ currentFile?.title || removeFileExtension(currentFile?.name) }
					{#if $currentBook.files > 1}
						<span class="lighter audio-player-part-of">({currentFileIndex + 1} / {$currentBook.files})</span>
					{/if}
				</div>
			</div>

			<!-- Player controls here -->
			<div class="audio-player-progress">
				<div class="audio-progress flex ai-c">
					<div class="lighter">{ secondsToHMS($currentBook.absolutePosition) }</div>
					<div class="lighter ml-a" on:click={toggleTimeDisplay} role="presentation">{ totalBookTime }</div>
				</div>
				<div class="audio-player-range" on:mousemove={onRangeMousemove} role="presentation">
					<input
						class="input-range"
						type="range"
						min="0"
						max={$currentBook.duration}
						value={$currentBook.absolutePosition}
						on:input={(e) => seekToPosition(parseFloat(e.target.value))}
						style="--complete: {$currentBook.absolutePosition / $currentBook.duration * 100}%;"
					/>
					{#if bookFilesMarkers.length > 1}
						{#each bookFilesMarkers as marker}
							<div class="book-files-marker" style="--offset: {parseFloat(marker / $currentBook.duration)};"></div>
						{/each}
					{/if}
					{#if $currentBook.bookmarks.length}
						{#each $currentBook.bookmarks as bookmark}
							<div class="book-bookmark-marker" style="--offset: {parseFloat(bookmark.position / $currentBook.duration)};"></div>
						{/each}
					{/if}
					<span class="audio-player-range-time" style="--offset: {rangeOffsetX};">{rangePosition}</span>
				</div>
			</div>
			<div class="audio-player-controls flex ai-c">
				<IcoButton title="Previous track" icon="prev-track" disabled={$currentBook.files < 2} on:click={() => skipToPrevTrack()} />
				<IcoButton title="Rewind backward" icon={bwIconMap[$appSeek]} clss="bigger-button" on:click={seekBW} />
				<button class="play-button" class:isLoading={$isLoading} on:click={togglePlay} title={$isPlaying ? 'Pause' : 'Play'}>
					<Icon icon={$isPlaying ? 'pause' : 'play'} />
				</button>
				<IcoButton title="Rewind forward" icon={fwIconMap[$appSeek]} clss="bigger-button" on:click={seekFW} />
				<IcoButton title="Next track" icon="next-track" disabled={$currentBook.files < 2 || $currentBook.files == currentFileIndex+1} on:click={() => skipToNextTrack()} />
			</div>

			<div class="audio-player-actions flex ai-c">
				<IcoButton title="Sleep timer" icon="sleep" clss="allow-space" active={$sleepActive} on:click={showSleepTimer} />
				<div class="dd-cont">
					<IcoButton title="Equalizer" icon="eq" clss="allow-space" active={$currentBook.eq != 'off'} on:pointerdown={selfFocus} />
					<div class="dd-menu dd-pop dd-top-center">
						{#each eqOptions as option}
							<label class="dd-options-label" class:isSelected={$currentBook.eq == option.value}>
								<input class="dd-options-input" type="radio" value={option.value} name="eq" bind:group={$currentBook.eq} on:change={onEqChange} tabindex="0" />
								<span>{option.title}</span>
							</label>
						{/each}
					</div>
				</div>
				<div class="dd-cont">
					<IcoButton title="Playback speed" icon="speed" clss="allow-space" active={$currentBook.speed != 1} on:pointerdown={selfFocus} />
					<div class="dd-setting dd-pop dd-top-center" style="--complete: {(($currentBook.speed - 0.5) / 1.5) * 100}%;">
						<span class="dd-setting-value">{$currentBook.speed}x</span>
						<input class="audio-setting" type="range" min="0.5" max="2" step="0.1" bind:value={$currentBook.speed} on:input={onSpeedChange} aria-label="Playback speed" tabindex="0" />
					</div>
				</div>
				<div class="dd-cont">
					<IcoButton title="Volume" icon={getVolumeIcon()} clss="allow-space" active={$currentBook.volume != 1} on:pointerdown={selfFocus} />
					<div class="dd-setting dd-pop dd-top-center" style="--complete: {$currentBook.volume * 100}%;">
						<input class="audio-setting" type="range" min="0" max="1" step="0.1" bind:value={$currentBook.volume} on:input={onVolumeChange} aria-label="Volume" tabindex="0" />
					</div>
				</div>
				<IcoButton title="Add bookmark" icon="bookmark-add" clss="allow-space" on:click={() => showAddBookmark($currentBook.absolutePosition)} />
				<div class="dd-cont m-hide">
					<IcoButton title="More" icon="horizontal-dots" clss="allow-space" on:pointerdown={selfFocus} />
					<div class="dd-menu dd-pop dd-top-right">
						<DdButton title="Book info" icon="info" on:click={() => showBookInfo($currentBook)} />
						<DdButton title="File list" icon="list" on:click={() => showFileList($currentBook, bookFiles)} />
						<DdButton title="Bookmarks" icon="bookmarks" disabled={!$currentBook.bookmarks.length} on:click={() => showBookmarks($currentBook)} />
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}