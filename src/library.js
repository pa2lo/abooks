import { get } from 'svelte/store'
import { db, addingBook, library, showToast } from './store'
import * as mm from 'music-metadata'

const supportedFormats = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
let persistanceChecked = false

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

async function getLegacyFile(file, isSafari) {
	return isSafari ? {
		blob: await file.arrayBuffer(),
		type: file.type
	} : file
}

async function processAddBook(files, legacy, dirName, dirHandle) {
	const bookId = crypto.randomUUID()

	console.log(files)

	if (!files.length) return alert('No files in folder')

	const sortedFiles = sortAudioFiles(files, legacy)

	const firstFile = legacy ? sortedFiles[0] : sortedFiles[0].file
	const baseMetadata = await extractMetadata(firstFile)

	const isSafari = legacy && sortedFiles[0]?.bytes ? true : false

	const book = {
		id: bookId,
		title: baseMetadata.artist && baseMetadata.album ? `${baseMetadata.artist} - ${baseMetadata.album}` : dirName,
		addedDate: Date.now(),
		lastPlayed: null,
		completed: null,
		duration: 0,
		dirHandle: dirHandle,
		absolutePosition: 0,
		currentPosition: {
			fileIndex: 0,
			position: 0
		},
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
		isSafari: isSafari,
		files: 0,
		bookmarks: []
	}

	let totalDuration = 0
	let totalSize = 0
	let bookFiles = []

	for (const [index, file] of sortedFiles.entries()) {
		let currentMetadata = await extractMetadata(legacy ? file : file.file)

		totalDuration += currentMetadata.duration || 0
		if (legacy) totalSize += file.size

		bookFiles.push({
			id: crypto.randomUUID(),
			index: index,
			bookId: bookId,
			name: legacy ? file.name : file.file.name,
			file: legacy ? await getLegacyFile(file, isSafari) : file.handle,
			duration: currentMetadata.duration || 0,
			title: currentMetadata?.title || null
		})
	}

	if (totalDuration < 10) {
		addingBook.set(false)
		return showToast('Book too short.', 'warning')
	}

	book.duration = totalDuration
	book.files = bookFiles.length

	// check available space - 50MB after upload
	if (legacy) {
		const storageEstimate = await navigator.storage.estimate()
		const availableSpace = storageEstimate.quota > storageEstimate.usage ? storageEstimate.quota - storageEstimate.usage : 0

		if (totalSize + 50000000 > availableSpace) {
			addingBook.set(false)
			return showToast('No enough space. Delete some old books first.', 'warning')
		}
	}

	// save book
	await get(db).addBook(book)
	for (const file of bookFiles) {
		await get(db).addAudioFile(file)
	}
	library.update(l => [book, ...l])

	addingBook.set(false)

	showToast('Book added', 'success')

	if (!persistanceChecked) checkStoragePersistance()
}

export async function addBook() {
	if (get(addingBook) == true) return
	addingBook.set(true)
	try {
		const bookId = crypto.randomUUID()

		if ('showDirectoryPicker' in window) {
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
				addingBook.set(false)
			}
			input.onabort = () => {
				if (get(addingBook)) addingBook.set(false)
			}

			input.click()
		}
	} catch (error) {
		console.error('Error adding book:', error)
		showToast('Error adding book', 'warning')
		addingBook.set(false)
		throw error
	}
}

export async function deleteBook(e, id, callback) {
	if (e && e.target?.closest('button')) e.target.closest('button').blur()
	if (window.confirm(`Are you sure you want to delete book ${get(library).find(b => b.id == id)?.title}?`)) {
		try {
			await get(db).deleteBook(id)
			library.update(lib => lib.filter(b => b.id != id))
			if (callback) callback()
			showToast('Book deleted', 'success')
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
		library.update((lib) => {
			lib.find(b => b.id == book.id)[param] = val
			return lib
		})
	}
	await get(db)?.updateBook(book)
}