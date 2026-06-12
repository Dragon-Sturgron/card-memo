const DB_NAME = 'card-memo-db'
const DB_VERSION = 1
const STORE_NAME = 'memos'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('pinned', 'pinned', { unique: false })
        store.createIndex('archived', 'archived', { unique: false })
      }
    }
  })
}

function withStore(mode, callback) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const result = callback(store)

        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export async function getAllMemos() {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  })
}

export async function saveMemo(memo) {
  return withStore('readwrite', (store) => store.put(memo))
}

export async function deleteMemo(id) {
  return withStore('readwrite', (store) => store.delete(id))
}

export async function clearMemos() {
  return withStore('readwrite', (store) => store.clear())
}

export async function replaceMemos(memos) {
  await clearMemos()
  for (const memo of memos) {
    await saveMemo(memo)
  }
}
