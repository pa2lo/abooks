import { saveLSSetting } from "./helpers"

// global
export const ab = $state({
	isPlaying: false,
	isLoading: false,
	addingBook: false,
	currentBook: null,
	db: null,
	library: []
})

// settings
export const abSettings = $state({
	seek: parseInt(localStorage.getItem('seek') || 15),
	mediaKeys: localStorage.getItem('mediaKeys') || 'track',
	timeDisplay: localStorage.getItem('timeDisplay') || 'total',
	sort: localStorage.getItem('librarySort') || 'newest',
	fsMode: localStorage.getItem('fsMode') || 'fsapi',
	switchTimeDisplay: function() {
		saveLSSetting('timeDisplay', 'total', abSettings.timeDisplay)
	}
})

// book info
export const bookInfo = $state({
	active: false,
	book: null
})
export function showBookInfo(book) {
	closeModals(sleepTimer, fileList, bookmarks, newBookmark, jumpTo)

	bookInfo.book = book
	bookInfo.active = true
}

// book file list
export const fileList = $state({
	active: false,
	book: null,
	files: null
})
export function showFileList(book) {
	closeModals(sleepTimer, bookmarks, newBookmark, jumpTo)

	let accumulated = 0
	let files = []

	for (let i = 0; i < book.files.length; i++) {
		files.push({
			title: book.files[i]?.title ? `${i+1}. ${book.files[i].title}` : book.files[i].name,
			start: accumulated,
			duration: book.files[i].duration
		})
		accumulated += book.files[i].duration
	}

	fileList.book = book
	fileList.files = files
	fileList.active = true
}

// sleep
export const sleepTimer = $state({
	active: false,
	isActive: false
})

// bookmarks
export const bookmarks = $state({
	active: false,
	book: null
})
export function showBookmarks(book) {
	closeModals(sleepTimer, fileList, newBookmark, jumpTo)

	bookmarks.book = book
	bookmarks.active = true
}

export const newBookmark = $state({
	active: false,
	data: {}
})
export function showNewBookmark(position) {
	closeModals(sleepTimer, fileList, bookmarks, jumpTo)

	newBookmark.data = {
		title: '',
		position: position,
		added: Date.now()
	}
	newBookmark.active = true
}

// jump to
export const jumpTo = $state({
	active: false,
	max: null,
	model: {
		h: 0,
		m: 0,
		s: 0
	}
})
export function showJumpTo(max, current) {
	closeModals(sleepTimer, fileList, newBookmark)

	jumpTo.max = max
	let h = max > 3600 ? Math.floor(current / 3600) : '0'
	let m = Math.floor((current % 3600) / 60).toString().padStart(2, '0')
	let s = (parseInt(current) % 60).toString().padStart(2, '0')
	jumpTo.model = {h, m, s}
	jumpTo.active = true
}

// toasts
export const toasts = $state({ arr: [] })
export function showToast(text, type = 'info', timeout = 6000) {
	const id = Date.now()
	const newToast = { id, type, text }
	if (timeout) newToast.timeout = setTimeout(() => {
		clearTimeout(newToast.timeout)
		toasts.arr = toasts.arr.filter(et => et.id != id)
	}, timeout)
	toasts.arr.push(newToast)
}

// other
function closeModals() {
	[...arguments].forEach(m => m.active = false)
}