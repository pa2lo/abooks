<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte'
	import { ab, abSettings, showBookInfo, showFileList, sleepTimer, showBookmarks, showNewBookmark, showJumpTo, showToast } from './store.svelte'
	import { library, positions, updateBook, updatePosition } from './library.svelte'
	import { secondsToHMS, selfFocus, removeFileExtension, isiOS, getOPFS, getDir, getFile, throttle } from './helpers'

	import Icon from './components/Icon.svelte'
	import IcoButton from './components/IcoButton.svelte'
	import DdButton from './components/DdButton.svelte'

	let audioElement = $state()
	let bookFilesMarkers = $state([])
	let currentFile = $state()
	let currentFileIndex = $state()
	let fileLoaded = false
	let currentBookGranted = false
	let opfs
	let bookDir
	let lastPlayedWillUpdate = true

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
			ab.currentBook.files.length > 1 && abSettings.mediaKeys == 'track' ? skipToPrevTrack() : seekBW()
		}],
		['nexttrack', async () => {
			ab.currentBook.files.length > 1 && abSettings.mediaKeys == 'track' ? skipToNextTrack() : seekFW()
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
			artist: ab.currentBook.metadata?.author,
			album: ab.currentBook.metadata?.album,
			title: currentFile?.title || removeFileExtension(currentFile?.name)
		}
		if (ab.currentBook.metadata.cover) metadataObject.artwork = [
			{
				src: ab.currentBook.metadata.cover
			}
		]
		if ("mediaSession" in navigator) {
			navigator.mediaSession.metadata = new MediaMetadata(metadataObject)
		}
	}

	// book operations
	export async function setBook(book, isInit, e) {
		if (e) e.preventDefault()
		if (isInit) {
			ab.currentBook = book
			await loadBookFiles()
			await setCurrentFileIndex(positions.books[ab.currentBook.id].fileIndex)
		} else {
			if (book.id == ab.currentBook?.id && audioElement) return await togglePlay()

			if (audioElement && !audioElement.paused) audioElement.pause()

			ab.currentBook = book
			mediaSessionHandlersSet = false
			currentBookGranted = false
			lastPlayedWillUpdate = true

			await loadBookFiles()

			let newFileLoaded = await loadFile(positions.books[ab.currentBook.id].fileIndex)
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
		ab.currentBook = null
		localStorage.removeItem('lastPlayed')

		if (eqContext) destroyEQ()
	}

	// file operations
	async function loadBookFiles() {
		ab.isLoading = true
		bookFilesMarkers = []

		if (ab.currentBook.legacy) {
			if (!opfs) opfs = await getOPFS()
			bookDir = await getDir(opfs, ab.currentBook.id)
		}

		if (ab.currentBook.files.length > 1) bookFilesMarkers = ab.currentBook.files.reduce((acc, f, i) => {
			if (i == 0) acc.push(f.duration)
			else if (i+1 == ab.currentBook.files.length) return acc
			else acc.push(acc.at(-1) + f.duration)
			return acc
		}, [])

		ab.isLoading = false
	}
	async function setCurrentFileIndex(index) {
		currentFileIndex = index
		currentFile = ab.currentBook.files[index]
	}

	async function checkPermissions(fileHandle) {
		if (await fileHandle.queryPermission({ mode: 'read' }) === 'granted') return true
		if (await fileHandle.requestPermission({ mode: 'read' }) === 'granted') return true
		return false
	}

	async function getLegacyFile() {
		let file = await getFile(bookDir, currentFile.name)
		return await file.getFile()
	}

	async function loadFile(index, setPosition) {
		await setCurrentFileIndex(index)

		if (!ab.currentBook.legacy && !currentBookGranted) {
			const allowed = await checkPermissions(ab.currentBook.dirHandle || bookFiles[0].file)
			if (!allowed) {
				showToast('Permissions are required to play', 'warning')
				return false
			}
			currentBookGranted = true
		}

		try {
			if (!fileLoaded) fileLoaded = true

			const file = ab.currentBook.legacy ? await getLegacyFile() : await currentFile.file.getFile()
			audioElement.src = URL.createObjectURL(file)

			if (setPosition || setPosition === 0) positions.books[ab.currentBook.id].filePosition = setPosition
			audioElement.currentTime = positions.books[ab.currentBook.id].filePosition
		} catch (error) {
			console.error(error)
			showToast('Unable to load file', 'warning')
			return false
		}

		if (audioElement.src) {
			audioElement.volume = ab.currentBook.volume
			audioElement.playbackRate = ab.currentBook.speed
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
			if (ab.currentBook) {
				if (e.code == 'Space' && !document.activeElement.matches('button:not(.allow-space)')) {
					if (document.activeElement.matches('.allow-space')) e.preventDefault()
					togglePlay()
				}
				if (e.code == 'KeyP') skipToPrevTrack()
				if (e.code == 'KeyN') skipToNextTrack()
				if (e.code == 'KeyI') showBookInfo(ab.currentBook)
				if (e.code == 'KeyB') showNewBookmark(positions.books[ab.currentBook.id].absolutePosition)
				if (e.code == 'KeyF' && ab.currentBook.files.length > 1) showFileList(ab.currentBook)
				if (e.code == 'KeyD' && ab.currentBook.bookmarks?.length) showBookmarks(ab.currentBook)
				if (e.code == 'KeyJ') showJumpTo(ab.currentBook.duration, positions.books[ab.currentBook.id].absolutePosition)
			}
			if (e.code == 'KeyS') sleepTimer.active = true
		}
	}
	function hotkeysDownHandler(e) {
		if (!e.metaKey && !e.ctrlKey && !e.altKey && !document.activeElement.matches('input[type="text"]')) {
			if (ab.currentBook) {
				if (e.code == 'ArrowLeft') seekBW()
				if (e.code == 'ArrowRight') seekFW()
				if (e.code == 'ArrowUp') setVolume(Math.min(ab.currentBook.volume + 0.1, 1))
				if (e.code == 'ArrowDown') setVolume(Math.max(ab.currentBook.volume - 0.1, 0))
			}
			if (e.code == 'KeyA') dispatch('addBook')
		}
	}

	// lifecycle
	onMount(async () => {
		if (!currentFile && ab.currentBook) {
			await loadBookFiles()
			await setCurrentFileIndex(positions.books[ab.currentBook.id].fileIndex)
		}
		document.documentElement.addEventListener('keydown', hotkeysDownHandler)
		document.documentElement.addEventListener('keyup', hotkeysUpHandler)
		window.addEventListener('hashchange', togglePlayerClass)
	})
	onDestroy(() => {
		if (audioElement?.src) {
			audioElement.pause()
			URL.revokeObjectURL(audioElement.src)
		}
		if (eqContext) destroyEQ()
		document.documentElement.removeEventListener('keydown', hotkeysDownHandler)
		document.documentElement.removeEventListener('keyup', hotkeysUpHandler)
	})

	// position helpers
	function getAbsolutePosition() {
		let position = 0
		for (let i = 0; i < currentFileIndex; i++) {
			position += ab.currentBook.files[i].duration
		}
		position += audioElement.currentTime
		return position
	}

	function findPartForPosition(absolutePosition) {
		let accumulatedDuration = 0

		for (let i = 0; i < ab.currentBook.files.length; i++) {
			const partDuration = ab.currentBook.files[i].duration
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
		if (ab.isLoading) return
		if (ab.currentBook.files.length == currentFileIndex+1) return

		await playFile(currentFileIndex+1)
	}

	async function skipToPrevTrack() {
		if (ab.isLoading) return
		if (positions.books[ab.currentBook.id].filePosition > 4 || currentFileIndex == 0) return audioElement.currentTime = 0

		await playFile(currentFileIndex-1)
	}

	function seekBW() {
		if (ab.isLoading) return
		seekToPosition(Math.max(positions.books[ab.currentBook.id].absolutePosition - parseInt(abSettings.seek), 0))
	}
	function seekFW() {
		if (ab.isLoading) return
		seekToPosition(Math.min(positions.books[ab.currentBook.id].absolutePosition + parseInt(abSettings.seek), ab.currentBook.duration - 1))
	}

	async function playFile(index) {
		let newFileLoaded = await loadFile(index, 0)
		if (newFileLoaded) await audioElement.play()
	}

	async function togglePlay(e) {
		if (e) {
			e.stopPropagation()
			e.preventDefault()
		}

		if (ab.isLoading) return

		if (!fileLoaded) {
			let newFileLoaded = await loadFile(currentFileIndex)
			if (!newFileLoaded) return
		}

		if (audioElement?.paused) {
			if (positions.books[ab.currentBook.id].absolutePosition + 1 > ab.currentBook.duration) {
				let newFileLoaded = await loadFile(0, 0)
				if (!newFileLoaded) return
			}
			await audioElement.play()
			if (lastPlayedWillUpdate) updateLastPlayed()
		} else audioElement.pause()
	}

	export function stopPlayback() {
		if (audioElement && !audioElement.paused) audioElement.pause()
	}

	function updateLastPlayed() {
		ab.currentBook.lastPlayed = Date.now()
		updateBook(ab.currentBook)
		dispatch('bookPlayed')
		lastPlayedWillUpdate = false
	}

	// Settings handlers
	async function onEqChange() {
		setEQ()
		await updateBook(ab.currentBook)
	}

	function setVolume(val) {
		ab.currentBook.volume = val
		onVolumeChange()
	}

	async function onVolumeChange() {
		if (audioElement) audioElement.volume = ab.currentBook.volume
		await updateBook(ab.currentBook)
	}

	async function onSpeedChange() {
		audioElement.playbackRate = ab.currentBook.speed
		await updateBook(ab.currentBook)
	}

	// EQ
	let eqContext = null
	let eqSource = null
	let eqLowshelf = null
	let eqLastSetting = 'off'

	function setEqIfNeeded() {
		if (audioElement && (ab.currentBook.eq != 'off' || eqContext) && eqLastSetting != ab.currentBook.eq) setEQ()
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

		if (ab.currentBook.eq == 'off') {
			eqLowshelf.gain.value = 0
		} else if (ab.currentBook.eq == 'ls1') {
			eqLowshelf.frequency.value = 100
			eqLowshelf.gain.value = -14
		} else if (ab.currentBook.eq == 'ls2') {
			eqLowshelf.frequency.value = 175
			eqLowshelf.gain.value = -20
		}

		eqLastSetting = ab.currentBook.eq
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
		if (!ab.currentBook || !audioElement || audioElement.paused) return

		updatePosition(getAbsolutePosition(), Math.max(ab.currentBook.files.indexOf(currentFile), 0), audioElement.currentTime)
	}

	async function handleEnded() {
		const nextIndex = ab.currentBook.files.indexOf(currentFile) + 1
		if (nextIndex < ab.currentBook.files.length) {
			let newFileLoaded = await loadFile(nextIndex, 0)
			if (newFileLoaded) await audioElement.play()
		} else {
			updateBook(ab.currentBook, 'completed', Date.now())
			setPlaybackState("none")
		}
	}

	function onPlay() {
		ab.isPlaying = true
		if (eqContext) eqContext.resume()
	}

	function onPlaying() {
		setPlaybackState("playing")
	}

	function onPause() {
		ab.isPlaying = false
		if (eqContext) eqContext.suspend()
		setPlaybackState("paused")
	}

	// icons
	function getVolumeIcon() {
		if (ab.currentBook?.volume == 0) return 'volume3'
		else if (ab.currentBook?.volume < 0.6) return 'volume2'
		return 'volume'
	}

	// range mouse position
	let rangePosition = $state(0)
	let rangeOffsetX = $state(0)
	function onRangeMousemove(e) {
		const adjustedX = Math.max(0, Math.min(e.offsetX - 9, e.target.clientWidth - 18));
		rangeOffsetX = parseFloat(adjustedX / (e.target.clientWidth - 18))
		rangePosition = secondsToHMS(parseFloat(rangeOffsetX * ab.currentBook.duration))
	}

	// computed time
	function toggleTimeDisplay() {
		abSettings.timeDisplay = abSettings.timeDisplay == 'total' ? 'remaining' : 'total'
		abSettings.switchTimeDisplay()
	}

	let totalBookTime = $derived(ab.currentBook
    ? abSettings.timeDisplay === 'remaining'
      ? `-${secondsToHMS(ab.currentBook.duration - positions.books[ab.currentBook.id].absolutePosition)}`
      : secondsToHMS(ab.currentBook.duration)
    : "")

	// touch actions
	let playerEl = $state()
	let start = {}
	let offY = $state(0)
	let isMoving = false
	let playerClass = $state('')
	function togglePlayerClass() {
		playerClass = window.location.hash == '#player' ? 'moveUp' : 'moveDown'
	}
	function onAnimationEnd() {
		offY = 0
	}
	function ouTouchStart(e) {
		if (e.touches.length > 1 || window.visualViewport.scale > 1.01 || playerEl.scrollTop > 0 || window.location.hash != '#player') {
			if (isMoving) removeDomEvents()
			return
		}

		start = {
			x: e.changedTouches[0]?.clientX,
			y: e.changedTouches[0]?.clientY
		}

		addDomEvents()
	}

	function addDomEvents() {
		isMoving = true
		document.addEventListener('touchmove', onTouchMove, {passive: true})
		document.addEventListener('touchend', onTouchEnd, {passive: true})
	}

	function removeDomEvents(reset) {
		isMoving = false
		if (reset) offY = 0
		document.removeEventListener('touchmove', onTouchMove)
		document.removeEventListener('touchend', onTouchEnd)
	}

	function onTouchMove(e) {
		if (window.visualViewport.scale > 1.01) return
		const { clientX: endX, clientY: endY } = e.changedTouches[0]

		const diffX = endX - start.x,
			diffY = endY - start.y,
			absX = Math.abs(diffX),
			absY = Math.abs(diffY)

		if (diffY < -5) removeDomEvents(true)
		else if (absY > absX) offY = Math.max(0, diffY - 15)
	}

	function onTouchEnd(e) {
		if (isMoving && offY > 100) history.back()
		requestAnimationFrame(() => {
			removeDomEvents(offY < 101)
		})
	}
</script>

{#if ab.currentBook}
	<a class="small-player flex ai-c rm-hide" href="#player" aria-label="Player">
		<img class="small-player-thumb" src={ab.currentBook.metadata.cover || '/book.svg'} alt="">
		<div class="small-player-info">
			{ ab.currentBook.title }
		</div>
		<button class="small-player-button" onclick={togglePlay} title={ab.isPlaying ? 'Pause' : 'Play'}>
			<Icon icon={ab.isPlaying ? 'pause' : 'play'} />
		</button>
		<progress class="small-player-progress" max={ab.currentBook.duration} value={positions.books[ab.currentBook.id].absolutePosition}></progress>
	</a>

	<div class="audio-player {playerClass}" id="player" bind:this={playerEl} ontouchstart={ouTouchStart} onanimationend={onAnimationEnd} class:movingDown={offY > 0} style='--offY: {offY}px;'>
		<audio
			bind:this={audioElement}
			onended={handleEnded}
			ontimeupdate={updateProgress}
			onplay={onPlay}
			onplaying={onPlaying}
			onpause={onPause}
			class="invisible"
		></audio>
		<div class="audio-player-inner">
			<div class="audio-player-header rm-hide flex ai-c">
				<IcoButton title="Back" icon="back" onclick={() => history.back()} />
				<IcoButton title="File list" icon="list" clss="allow-space ml-a" onclick={() => showFileList(ab.currentBook)} />
				<IcoButton title="Bookmarks" icon="bookmarks" clss="allow-space" disabled={!ab.currentBook.bookmarks.length} onclick={() => showBookmarks(ab.currentBook)} />
				<IcoButton title="Book info" icon="info" clss="allow-space" onclick={() => showBookInfo(ab.currentBook)} />
			</div>

			<div class="audio-player-thumb-cont">
				{#if ab.currentBook.metadata.cover}
					<div class="audio-player-thumb-fx-cont">
						<img class="audio-player-thumb-fx" src={ab.currentBook.metadata.cover} alt="" />
					</div>
				{/if}
				<img class="audio-player-thumb" src={ab.currentBook.metadata.cover || '/book.svg'} alt="" />
			</div>

			<div class="audio-player-info">
				<div class="audio-player-title">
					{ab.currentBook.title}
				</div>
				<div class="audio-player-part">
					{ currentFile?.title || removeFileExtension(currentFile?.name) }
					{#if ab.currentBook.files.length > 1}
						<span class="lighter audio-player-part-of">({currentFileIndex + 1} / {ab.currentBook.files.length})</span>
					{/if}
				</div>
			</div>

			<div class="audio-player-progress">
				<div class="audio-progress flex ai-c">
					<div class="lighter">{ secondsToHMS(positions.books[ab.currentBook.id].absolutePosition) }</div>
					<div class="lighter ml-a" onclick={toggleTimeDisplay} role="presentation">{ totalBookTime }</div>
				</div>
				<div class="audio-player-range" onmousemove={onRangeMousemove} role="presentation">
					<input
						class="input-range"
						type="range"
						min="0"
						max={ab.currentBook.duration}
						value={positions.books[ab.currentBook.id].absolutePosition}
						oninput={throttle((e) => seekToPosition(parseFloat(e.target.value)), 100)}
						style="--complete: {positions.books[ab.currentBook.id].absolutePosition / ab.currentBook.duration * 100}%;"
					/>
					{#if bookFilesMarkers.length > 1}
						{#each bookFilesMarkers as marker}
							<div class="book-files-marker" style="--offset: {parseFloat(marker / ab.currentBook.duration)};"></div>
						{/each}
					{/if}
					{#if ab.currentBook.bookmarks.length}
						{#each ab.currentBook.bookmarks as bookmark}
							<div class="book-bookmark-marker" style="--offset: {parseFloat(bookmark.position / ab.currentBook.duration)};"></div>
						{/each}
					{/if}
					<span class="audio-player-range-time" style="--offset: {rangeOffsetX};">{rangePosition}</span>
				</div>
			</div>
			<div class="audio-player-controls flex ai-c">
				<IcoButton title="Previous track" icon="prev-track" disabled={ab.currentBook.files.length < 2} onclick={() => skipToPrevTrack()} />
				<IcoButton title="Rewind backward" icon={`backward${abSettings.seek}`} clss="bigger-button" onclick={seekBW} />
				<button class="play-button" class:isLoading={ab.isLoading} onclick={togglePlay} title={ab.isPlaying ? 'Pause' : 'Play'}>
					<Icon icon={ab.isPlaying ? 'pause' : 'play'} />
				</button>
				<IcoButton title="Rewind forward" icon={`forward${abSettings.seek}`} clss="bigger-button" onclick={seekFW} />
				<IcoButton title="Next track" icon="next-track" disabled={ab.currentBook.files.length < 2 || ab.currentBook.files.length == currentFileIndex+1} onclick={() => skipToNextTrack()} />
			</div>

			<div class="audio-player-actions flex ai-c">
				<IcoButton title="Sleep timer" icon="sleep" clss="allow-space" active={sleepTimer.isActive} onclick={() => sleepTimer.active = true} />
				<IcoButton title="Add bookmark" icon="bookmark-add" clss="allow-space" onclick={() => showNewBookmark(positions.books[ab.currentBook.id].absolutePosition)} />
				<IcoButton title="Jump to" icon="arrow-bar" clss="allow-space" onclick={() => showJumpTo(ab.currentBook.duration, positions.books[ab.currentBook.id].absolutePosition)} />
				<div class="dd-cont">
					<IcoButton title="Equalizer" icon="eq" clss="allow-space" active={ab.currentBook.eq != 'off'} onpointerdown={selfFocus} />
					<div class="dd-menu dd-pop dd-top-center">
						{#each eqOptions as option}
							<label class="dd-options-label" class:isSelected={ab.currentBook.eq == option.value}>
								<input class="dd-options-input" type="radio" value={option.value} name="eq" bind:group={ab.currentBook.eq} onchange={onEqChange} tabindex="0" />
								<span>{option.title}</span>
							</label>
						{/each}
					</div>
				</div>
				<div class="dd-cont">
					<IcoButton title="Playback speed" icon="speed" clss="allow-space" active={ab.currentBook.speed != 1} onpointerdown={selfFocus} />
					<div class="dd-setting dd-pop dd-top-center" style="--complete: {((ab.currentBook.speed - 0.5) / 1.5) * 100}%;">
						<span class="dd-setting-value">{ab.currentBook.speed}x</span>
						<input class="audio-setting" type="range" min="0.5" max="2" step="0.1" bind:value={ab.currentBook.speed} oninput={onSpeedChange} aria-label="Playback speed" tabindex="0" />
					</div>
				</div>
				<div class="dd-cont">
					<IcoButton title="Volume" icon={getVolumeIcon()} clss="allow-space" active={ab.currentBook.volume != 1} onpointerdown={selfFocus} />
					<div class="dd-setting dd-pop dd-top-center" style="--complete: {ab.currentBook.volume * 100}%;">
						<input class="audio-setting" type="range" min="0" max="1" step="0.1" bind:value={ab.currentBook.volume} oninput={onVolumeChange} aria-label="Volume" tabindex="0" />
					</div>
				</div>
				<div class="dd-cont m-hide">
					<IcoButton title="More" icon="horizontal-dots" clss="allow-space" onpointerdown={selfFocus} />
					<div class="dd-menu dd-pop dd-top-right">
						<DdButton title="Book info" icon="info" onclick={() => showBookInfo(ab.currentBook)} />
						<DdButton title="File list" icon="list" onclick={() => showFileList(ab.currentBook)} />
						<DdButton title="Bookmarks" icon="bookmarks" disabled={!ab.currentBook.bookmarks.length} onclick={() => showBookmarks(ab.currentBook)} />
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}