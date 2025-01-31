import { get, writable } from "svelte/store"
import { saveLSSetting } from "./helpers"

// global
export const isPlaying = writable(false)
export const isLoading = writable(false)
export const addingBook = writable(false)
export const currentBook = writable(null)
export const permissionsGranted = writable({})
export const db = writable(null)
export const library = writable([])

// book info
export const bookInfoData = writable(null)
export const bookInfoModal = writable(false)
export function showBookInfo(book) {
	closeModals(sleepTimerModal, fileListModal, bookmarksModal, addBookmarkModal)

	bookInfoData.set(book)
	bookInfoModal.set(true)
}

// book file list
export const fileListData = writable(null)
export const fileListBook = writable(null)
export const fileListModal = writable(false)
export async function showFileList(book, bookFiles) {
	closeModals(sleepTimerModal, bookmarksModal, addBookmarkModal)

	fileListData.set(null)
	fileListBook.set(book)
	fileListModal.set(true)

	let accumulated = 0
	let listData = []

	const files = bookFiles || await get(db).getBookFiles(book.id)
	for (let i = 0; i < files.length; i++) {
		listData.push({
			title: files[i]?.title ? `${i+1}. ${files[i].title}` : files[i].name,
			start: accumulated,
			duration: files[i].duration
		})
		accumulated += files[i].duration
	}

	fileListData.set(listData)
}

// sleep
export const sleepActive = writable(false)
export const sleepTimerModal = writable(false)
export function showSleepTimer() {
	sleepTimerModal.set(true)
}

// settings
export const appSeek = writable(parseInt(localStorage.getItem('seek') || 15))
export const appMediaKeys = writable(localStorage.getItem('mediaKeys') || 'track')
export const appTimeDisplay = writable(localStorage.getItem('timeDisplay') || 'total')
export const librarySort = writable(localStorage.getItem('librarySort') || 'newest')
export const appFSMode = writable(localStorage.getItem('fsMode') || 'api')
export function switchTimeDisplay() {
	saveLSSetting('timeDisplay', 'total', get(appTimeDisplay))
}

// bookmarks
export const bookmarksModal = writable(false)
export const bookmarksBook = writable(null)
export function showBookmarks(book) {
	closeModals(sleepTimerModal, fileListModal, addBookmarkModal)

	bookmarksBook.set(book)
	bookmarksModal.set(true)
}

export const addBookmarkModal = writable(false)
export const addBookmarkData = writable('')
export function showAddBookmark(position) {
	closeModals(sleepTimerModal, fileListModal, bookmarksModal)

	addBookmarkData.set({
		title: '',
		position: position,
		added: Date.now()
	})

	addBookmarkModal.set(true)
}

function closeModals() {
	[...arguments].forEach(m => m.set(false))
}

// toasts
export const toasts = writable([])
export function showToast(text, type = 'info', timeout = 6000) {
	const id = Date.now()
	const newToast = { id, type, text }
	if (timeout) newToast.timeout = setTimeout(() => {
		clearTimeout(newToast.timeout)
		toasts.update(t => t.filter(et => et.id != id))
	}, timeout)
	toasts.update(t => [...t, newToast])
}