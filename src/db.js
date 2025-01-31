export class AudiobookDB {
	constructor() {
		this.dbName = 'audiobookLibrary';
		this.version = 2;
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

				// Store for book files
				if (!db.objectStoreNames.contains('audioFiles')) {
					const fileStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
					fileStore.createIndex('bookId', 'bookId', { unique: false });
				}
			};
		});
	}

	async addBook(bookData) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['books'], 'readwrite');
			const store = transaction.objectStore('books');
			const request = store.add(bookData);

			request.onsuccess = () => resolve(bookData);
			request.onerror = () => reject(request.error);
		});
	}

	async addAudioFile(fileData) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['audioFiles'], 'readwrite');
			const store = transaction.objectStore('audioFiles');
			const request = store.add(fileData);

			request.onsuccess = () => resolve(fileData);
			request.onerror = () => reject(request.error);
		});
	}

	async updateBook(fileData) {
		return new Promise((resolve, reject) => {
			const transaction = this.db?.transaction(['books'], 'readwrite');
			if (!transaction) return reject()
			const store = transaction.objectStore('books');
			const request = store.put(fileData);

			request.onsuccess = () => resolve(fileData);
			request.onerror = () => reject(request.error);
		})
	}

	async getBook(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['books'], 'readonly');
			const store = transaction.objectStore('books');
			const request = store.get(id);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async getAllBooks() {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['books'], 'readonly');
			const store = transaction.objectStore('books');
			const request = store.getAll();

			request.onsuccess = () => resolve(request.result.sort((a, b) => b.addedDate - a.addedDate));
			request.onerror = () => reject(request.error);
		});
	}

	async getBookFiles(bookId) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['audioFiles'], 'readonly');
			const store = transaction.objectStore('audioFiles');
			const index = store.index('bookId');
			const request = index.getAll(bookId);

			request.onsuccess = () => resolve(request.result.sort((a, b) => a.index - b.index));
			request.onerror = () => reject(request.error);
		});
	}

	async deleteBook(bookId) {
		try {
			await this.deleteBookFiles(bookId);
			return new Promise((resolve, reject) => {
				const transaction = this.db.transaction(['books'], 'readwrite');
				const store = transaction.objectStore('books');
				const request = store.delete(bookId);

				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		} catch (error) {
			console.error(error)
		}
	}

	async deleteBookFiles(bookId) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['audioFiles'], 'readwrite');
			const store = transaction.objectStore('audioFiles');
			const index = store.index('bookId');
			const request = index.getAllKeys(bookId);

			request.onsuccess = async () => {
				const keys = request.result;

				if (keys.length === 0) {
					return resolve(); // No files to delete
				}

				try {
					for (const key of keys) {
						await new Promise((resolve, reject) => {
							const deleteRequest = store.delete(key);
							deleteRequest.onsuccess = () => resolve();
							deleteRequest.onerror = () => reject(deleteRequest.error);
						});
					}
					resolve();
				} catch (error) {
					reject(error);
				}
			};
			request.onerror = () => reject(request.error);
		})
	}
}