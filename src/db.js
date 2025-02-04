export class AudiobookDB {
	constructor() {
		this.dbName = 'audiobookLibrary';
		this.version = 3;
	}

	async init() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Store for book metadata
				if (!db.objectStoreNames.contains('books')) {
					const bookStore = db.createObjectStore('books', { keyPath: 'id' });
					bookStore.createIndex('title', 'title', { unique: false });
				}

				// Store for book positions
				if (!db.objectStoreNames.contains('positions')) {
					const bookStore = db.createObjectStore('positions', { keyPath: 'id' });
				}
			};
		});
	}

	async addDBData(storeName, data) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([storeName], 'readwrite');
			const store = transaction.objectStore(storeName);
			const request = store.add(data);

			request.onsuccess = () => resolve(data);
			request.onerror = () => reject(request.error);
		});
	}

	async getAllDBData(storeName, sortBy) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([storeName], 'readonly');
			const store = transaction.objectStore(storeName);
			const request = store.getAll();

			request.onsuccess = () => resolve(sortBy ? request.result.sort((a, b) => b[sortBy] - a[sortBy]) : request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async deleteDBData(storeName, id) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([storeName], 'readwrite');
			const store = transaction.objectStore(storeName);
			const request = store.delete(id);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async updateDBDate(storeName, data) {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject()
			const transaction = this.db.transaction([storeName], 'readwrite');
			const store = transaction.objectStore(storeName);
			const request = store.put(data);

			request.onsuccess = () => resolve(data);
			request.onerror = () => reject(request.error);
		})
	}

	async addBook(bookData, position) {
		return Promise.all([
			this.addDBData('books', bookData),
			this.addDBData('positions', position)
		])
	}

	async updateBook(fileData) {
		return this.updateDBDate('books', fileData)
	}

	async updatePosition(positionData) {
		return this.updateDBDate('positions', positionData)
	}

	async getAllBooks() {
		return this.getAllDBData('books', 'addedDate');
	}

	async getAllPositions() {
		return this.getAllDBData('positions');
	}

	async deleteBook(bookId) {
		return Promise.all(['books', 'positions'].map(store => this.deleteDBData(store, bookId)));
	}
}