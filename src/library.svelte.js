import { ab, abSettings, showToast, getLang } from './store.svelte'
import { getOPFS, getDir, saveFile } from './utils/helpers'
import * as mm from 'music-metadata'

const supportedFormats = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
let persistanceChecked = false

const labels = {
	en: {
		exist: "Book with this name is already in your library. Would you like to add book anyway?",
		remove: "Are you sure you want to delete book %t?",
		short: "Book too short",
		noSpace: "You don't have enough space to save book files. Delete some old books first.",
		added: "Book added",
		addError: "Error adding book",
		deleted: "Book deleted",
		noFiles: "No files in selected folder"
	},
	sk: {
		exist: "Kniha s týmto názvom sa už nachádza vo vašej knižnici. Chceli by ste napriek tomu pridať knihu?",
		remove: "Naozaj chcete odstrániť knihu %t?",
		short: "Kniha je príliš krátka",
		noSpace: "Nemáte dostatok miesta na uloženie súborov knihy. Najprv odstráňte staré knihy.",
		added: "Kniha pridaná",
		addError: "Chyba pri pridávaní knihy",
		deleted: "Kniha bola odstránená",
		noFiles: "Vo vybratom priečinku nie sú žiadne súbory"
	},
	cz: {
		exist: "Kniha s tímto názvem je již ve vaší knihovně. Chtěli byste přesto přidat knihu?",
		remove: "Opravdu chcete smazat knihu %t?",
		short: "Kniha je příliš krátká",
		noSpace: "Nemáte dostatek místa pro uložení souborů knihy. Nejprve smažte některé staré knihy.",
		added: "Kniha přidána",
		addError: "Chyba při přidávání knihy",
		deleted: "Kniha smazána",
		noFiles: "Ve vybrané složce nejsou žádné soubory"
	}
}

export const library = $state({
	books: []
})
export const positions = $state({
	books: null
})

async function checkStoragePersistance() {
	try {
		if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
			let storagePersisted = await navigator.storage.persisted()

			if (storagePersisted) {
				console.log('Storage is persisted')
				return persistanceChecked = true
			}

			let persistResponse = await navigator.storage.persist()
			if (persistResponse) console.log('Persisted storage granted')
			else console.log('Persisted storage denied')
		} else {
			console.log('Storage persistance not supported')
		}
		return persistanceChecked = true
	} catch (error) {
		console.error('checkStoragePersistance failed:', error)
	}
}

async function processAddBook(files, legacy, dirName, dirHandle) {
	const bookId = crypto.randomUUID()

	console.log(`adding book from dir ${dirName} with ${files.length} files`)

	if (!files.length) {
		ab.addingBook = false
		return alert(labels[getLang()].noFiles)
	}

	const sortedFiles = sortAudioFiles(files, legacy)

	const firstFile = legacy ? sortedFiles[0] : sortedFiles[0].file
	const baseMetadata = await extractMetadata(firstFile)

	if (legacy) await getDir(await getOPFS(), bookId, true)

	const bookTitle = baseMetadata.artist && baseMetadata.album ? `${baseMetadata.artist} - ${baseMetadata.album}` : dirName

	let shouldContinue = true
	if (library.books.some(b => b.title == bookTitle)) {
		shouldContinue = false
		if (window.confirm(labels[getLang()].exist)) shouldContinue = true
		else shouldContinue = false
	}

	if (!shouldContinue) return ab.addingBook = false

	const position = {
		id: bookId,
		absolutePosition: 0,
		fileIndex: 0,
		filePosition: 0
	}
	const book = {
		id: bookId,
		title: bookTitle,
		addedDate: Date.now(),
		lastPlayed: null,
		completed: null,
		duration: 0,
		dirHandle: dirHandle,
		// absolutePosition: 0,
		// currentPosition: {
		// 	fileIndex: 0,
		// 	position: 0
		// },
		metadata: {
			artist: baseMetadata.albumartist || '',
			author: baseMetadata.artist || '',
			album: baseMetadata.album || '',
			genre: baseMetadata.genre || '',
			label: baseMetadata.label || '',
			language: baseMetadata.language || '',
			description: baseMetadata.description || '',
			year: baseMetadata.year || null,
			cover: baseMetadata.cover || null
		},
		quality: {
			codec: baseMetadata.codec,
			sampleRate: baseMetadata.sampleRate,
			bitrate: baseMetadata.bitrate
		},
		speed: 1,
		volume: 1,
		eq: 'off',
		legacy: legacy,
		files: 0,
		bookmarks: [],
		files: []
	}

	let totalDuration = 0
	let totalSize = 0

	for (const [index, file] of sortedFiles.entries()) {
		let currentMetadata = await extractMetadata(legacy ? file : file.file)

		totalDuration += currentMetadata.duration || 0
		if (legacy) totalSize += file.size

		book.files.push({
			index: index,
			name: legacy ? file.name : file.file.name,
			file: legacy ? null : file.handle,
			duration: currentMetadata.duration || 0,
			title: currentMetadata?.title || null
		})
	}

	if (totalDuration < 10) {
		ab.addingBook = false
		return showToast(labels[getLang()].short, 'warning')
	}

	book.duration = totalDuration

	// check available space - 50MB after upload
	if (legacy) {
		const storageEstimate = await navigator.storage.estimate()
		const availableSpace = storageEstimate.quota > storageEstimate.usage ? storageEstimate.quota - storageEstimate.usage : 0

		if (totalSize + 50000000 > availableSpace) {
			ab.addingBook = false
			return showToast(labels[getLang()].noSpace, 'warning')
		}

		try {
			await Promise.all(sortedFiles.map(async (file) => {
				let fileName = legacy ? file.name : file.file.name
				let fileContent = await file.arrayBuffer()
				return saveFile(bookId, fileName, fileContent)
			}))
		} catch (error) {
			console.log(error)
		}
	}

	// save book
	await ab.db.addBook(book, position)

	positions.books[bookId] = position
	library.books.unshift(book)

	ab.addingBook = false

	showToast(labels[getLang()].added, 'success')

	if (!persistanceChecked) checkStoragePersistance()
}

export async function addBook() {
	if (ab.addingBook == true) return
	ab.addingBook = true
	try {
		const bookId = crypto.randomUUID()

		if ('showDirectoryPicker' in window && abSettings.fsMode == 'fsapi') {
			const handle = await window.showDirectoryPicker({
				mode: 'read',
				startIn: 'music'
			})

			const files = await collectAudioFiles(handle)

			await processAddBook(files, false, handle.name, handle)
		} else {
			const input = document.createElement('input')
        	input.type = 'file'
			input.multiple = true
        	input.webkitdirectory = true

			input.onchange = async (e) => {
				const files = Array.from(e.target.files).filter(file => supportedFormats.includes(file.type))
				let bookName = files[0]?.webkitRelativePath.split('/')[0] || window.prompt('Unable to find book name. Set the book name in case app cant read title from metadata. What is the name of the book?')

				await processAddBook(files, true, bookName)
			}
			input.oncancel = () => {
				ab.addingBook = false
			}
			input.onabort = () => {
				if (ab.addingBook) ab.addingBook = false
			}

			input.click()
		}
	} catch (error) {
		console.error('Error adding book:', error)
		showToast(labels[getLang()].addError, 'warning')
		ab.addingBook = false
		throw error
	}
}

export async function deleteBook(e, book, onStart, onEnd) {
	if (e && e.target?.closest('button')) e.target.closest('button').blur()
	if (window.confirm(labels[getLang()].remove.replace('%t', library.books.find(b => b.id == book.id)?.title))) {
		try {
			if (onStart) onStart()

			if (book.legacy) {
				const opfs = await getOPFS()
				await opfs.removeEntry(book.id, { recursive: true })
			}

			await ab.db.deleteBook(book.id)
			library.books = library.books.filter(b => b.id != book.id)

			if (onEnd) onEnd()
			showToast(labels[getLang()].deleted, 'success')
		} catch (error) {
			console.error('Error deleting book:', error)
			throw error
		}
	}
}

export async function collectAudioFiles(handle, path = '') {
	const files = []

	for await (const entry of handle.values()) {
		if (entry.kind === 'file') {
			const file = await entry.getFile()
			if (supportedFormats.includes(file.type)) {
				files.push({
					handle: entry,
					file: file
				})
			}
		}
	}

	return files
}

export function sortAudioFiles(files, legacy) {
	return [...files].sort((a, b) => {
		const modelA = legacy ? a : a.file
		const modelB = legacy ? b : b.file
		// Sort by numeric prefix if present
		const numA = parseInt(modelA.name.match(/^(\d+)/)?.[1])
		const numB = parseInt(modelB.name.match(/^(\d+)/)?.[1])

		if (!isNaN(numA) && !isNaN(numB)) return numA - numB

		return modelA.name.localeCompare(modelB.name, undefined, {
			numeric: true,
			sensitivity: 'base'
		})
	})
}

export async function extractMetadata(file) {
	try {
		// const metadata = await mm.parseBlob(file)
		const metadata = file?.bytes ? await mm.parseBuffer(await file.bytes(), { mimeType: file.type }) : await mm.parseBlob(file)

		let cover = null

		if (metadata.common.picture?.[0]) {
			const picture = metadata.common.picture[0]
			const blob = new Blob([picture.data], { type: picture.format })
			try {
				cover = await(getImageFromBlob(URL.createObjectURL(blob)))
			} catch (error) {
				console.error(error)
			}
		}

		return {
			title: metadata.common.title,
			artist: metadata.common.artist,
			album: metadata.common.album,
			genre: metadata.common.genre?.[0],
			label: metadata.common.label?.[0],
			description: metadata.common.description?.[0],
			year: metadata.common.year,
			language: metadata.common.language,
			duration: metadata.format.duration,
			albumartist: metadata.common.albumartist,
			codec: metadata.format.codec,
			sampleRate: metadata.format.sampleRate,
			bitrate: metadata.format.bitrate,
			cover: cover
		}
	} catch (error) {
		console.error('Error extracting metadata:', error)
		return {}
	}
}

async function getImageFromBlob(blobUrl) {
	try {
		// Fetch the blob content from the URL
		const response = await fetch(blobUrl)
		const blob = await response.blob()

		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = function () {
				resolve(reader.result)
			}
			reader.onerror = function () {
				reject(new Error('Error reading the blob'))
			}
			reader.readAsDataURL(blob)
		})
	} catch (error) {
		console.error('Error fetching and saving the image:', error)
	}
}

export async function updateBook(book, param, val) {
	if (param) {
		library.books.find(b => b.id == book.id)[param] = val
	}
	await ab.db?.updateBook($state.snapshot(book))
}

export async function updatePosition(absolutePosition, fileIndex, filePosition, bookId = null) {
	if (!bookId) bookId = ab.currentBook.id
	positions.books[bookId] = {
		id: bookId,
		absolutePosition,
		fileIndex,
		filePosition
	}
	await ab.db?.updatePosition($state.snapshot(positions.books[bookId]))
}

window.abShowAllFiles = async function() {
	async function listAllFiles(dirHandle, path = "") {
		for await (const [name, handle] of dirHandle.entries()) {
			const fullPath = `${path}/${name}`
			console.log(`Name: ${fullPath}, Type: ${handle.kind}`)

			if (handle.kind === "directory") {
				await listAllFiles(handle, fullPath)
			}
		}
	}

	(async () => {
		const root = await navigator.storage.getDirectory()
		await listAllFiles(root)
	})()
}

window.abClearStorage = async function() {
	const opfs = await getOPFS()
	for await (const [name, handle] of opfs.entries()) {
		console.log(`removing ${name}`)
		await opfs.removeEntry(name, { recursive: true })
	}
}