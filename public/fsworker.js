onmessage = async (e) => {
	const osfr = await navigator.storage.getDirectory()
	const bookDir = await osfr.getDirectoryHandle(e.data.bookId)
	const fileHandle = await bookDir.getFileHandle(e.data.id, {	create: true })

	const accessHandle = await fileHandle.createSyncAccessHandle({mode: "readwrite-unsafe"})
	accessHandle.write(e.data.file)
	accessHandle.close()

	postMessage('done')
}