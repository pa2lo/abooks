export function secondsToHMS(seconds) {
	seconds = parseInt(seconds)
	let h = Math.floor(seconds / 3600);
	let m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
	let s = (seconds % 60).toString().padStart(2, '0');

	return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function formatDate(date, seconds = false) {
	if (typeof date == 'number' && date.toString().length == 10) date = date*1000

	let options = {	day: 'numeric',	month: 'numeric', year: 'numeric', hour: '2-digit',	minute: 'numeric' }
	if (seconds) options.second = 'numeric'

	return new Date(date).toLocaleString( 'sk-SK', options)
}

export function selfFocus(e) {
	e.preventDefault()
	let focusTarget = e.target.matches('button') ? e.target : e.target.closest('button')
	const cont = focusTarget.nextElementSibling
	const activeEl = document.activeElement
	if (activeEl == focusTarget) focusTarget.blur()
	else if (cont.contains(activeEl)) activeEl.blur()
	else {
		if (cont?.matches('.dd-pop')) {
			if (!cont.hasAttribute('tabindex')) cont.setAttribute('tabindex', '-1')
			cont.focus()
		} else focusTarget.focus()
	}
}

export function removeFileExtension(name) {
	if (!name) return ''
	return name.substring(0, name.lastIndexOf('.'))
}

export function throttle(callback, delay) {
	let canRun = true
	let trailingCall = false
	let timeout = null

	const throttled = (...args) => {
		if (canRun) {
			trailingCall = false
			canRun = false

			callback(...args)

			timeout = setTimeout(() => {
				canRun = true
				if (trailingCall) callback(...args)
			}, delay)
		} else {
			trailingCall = true
		}
	}

	throttled.cancel = () => {
		if (timeout) {
			clearTimeout(timeout)
			timeout = null
		}
		canRun = true
		trailingCall = false
	}

	return throttled
}

export function saveLSSetting(key, def, reference) {
	if (reference == def) localStorage.removeItem(key)
	else localStorage.setItem(key, reference)
}

export const isiOS = /iPad|iPhone|iPod/.test(navigator?.platform || navigator?.userAgentData?.platform) || (navigator?.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches
export const isSafari = /Apple/i.test(navigator.vendor) && /Safari/i.test(navigator.userAgent)

// Origin private file system
export async function getOPFS() {
	return await navigator.storage.getDirectory()
}

export async function getDir(opfs, id, create = false) {
	return await opfs.getDirectoryHandle(id, {
		create: create
	})
}

export async function getFile(dirHandler, id, create = false) {
	return await dirHandler.getFileHandle(id, {
		create: create,
	})
}

export async function saveFile(bookId, id, file) {
	return new Promise((resolve, reject) => {
		const worker = new Worker('fsworker.js')
		worker.onmessage = (e) => {
			console.log(e)
			worker.terminate()
			resolve(true)
		}

		worker.onerror = (e) => {
			console.log(e)
			worker.terminate()
			reject(false)
		}

		worker.postMessage({
			bookId, id, file
		})
	})

	/* does not work in Safari
	const writable = await fileHandler.createWritable()
	await writable.write(file)
    await writable.close()
	return true */
}