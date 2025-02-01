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

	async getBook(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['books'], 'readonly');
			const store = transaction.objectStore('books');
			const request = store.get(id);

			request.onsuccess = () => resolve(request.result);
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

	async getAllBooks() {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(['books'], 'readonly');
			const store = transaction.objectStore('books');
			const request = store.getAll();

			request.onsuccess = () => resolve(request.result.sort((a, b) => b.addedDate - a.addedDate));
			request.onerror = () => reject(request.error);
		});
	}

	async deleteBook(bookId) {
		try {
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
}