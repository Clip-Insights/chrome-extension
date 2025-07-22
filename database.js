class YouTubeNotesDatabase {
    constructor() {
        this.dbName = 'YouTubeNotesDatabase';
        this.dbVersion = 1;
        this.db = null;
        // console.log("Database created");

    }

    // Initialize the database with two object stores
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store for text notes
                if (!db.objectStoreNames.contains('textNotes')) {
                    const textNotesStore = db.createObjectStore('textNotes', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create index for video URL and video timestamp for efficient sorting
                    textNotesStore.createIndex('byVideoUrl', 'videoUrl', { unique: false });
                }

                // Store for screenshots
                if (!db.objectStoreNames.contains('screenshots')) {
                    const screenshotsStore = db.createObjectStore('screenshots', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create index for video URL and video timestamp for efficient sorting
                    screenshotsStore.createIndex('byVideoUrl', 'videoUrl', { unique: false });
                }

                // Store for summaries
                if (!db.objectStoreNames.contains('summaries')) {
                    const summariesStore = db.createObjectStore('summaries', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    summariesStore.createIndex('byVideoUrl', 'videoUrl', { unique: false });
                }

                // Store for keypoints
                if (!db.objectStoreNames.contains('keypoints')) {
                    const keypointsStore = db.createObjectStore('keypoints', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    keypointsStore.createIndex('byVideoUrl', 'videoUrl', { unique: false });
                }

            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject(`IndexedDB error: ${event.target.error}`);
            };
        });
    }

    // Save a text note with video timestamp and URL
    async saveTextNote(noteText, videoTimestamp, videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textNotes'], 'readwrite');
            const store = transaction.objectStore('textNotes');

            const noteEntry = {
                text: noteText,
                videoTimestamp: parseFloat(videoTimestamp),
                videoUrl: videoUrl,
                createdAt: Date.now()
            };

            const request = store.add(noteEntry);

            request.onsuccess = (event) => {
                noteEntry.id = event.target.result;
                resolve(noteEntry);
            };
            request.onerror = (event) => reject(`Error saving text note: ${event.target.error}`);
        });
    }

    // Save a screenshot with video timestamp and URL
    async saveScreenshot(screenshotUrl, videoTimestamp, videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['screenshots'], 'readwrite');
            const store = transaction.objectStore('screenshots');

            const screenshotEntry = {
                url: screenshotUrl,
                videoTimestamp: parseFloat(videoTimestamp),
                videoUrl: videoUrl,
                createdAt: Date.now()
            };

            const request = store.add(screenshotEntry);

            request.onsuccess = (event) => {
                screenshotEntry.id = event.target.result;
                resolve(screenshotEntry);
            };
            request.onerror = (event) => reject(`Error saving screenshot: ${event.target.error}`);
        });
    }

    // Retrieve all notes(text + imgs) for a specific video, ordered by video timestamp
    async retrieveVideoNotes(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textNotes', 'screenshots'], 'readonly');
            const textNotesStore = transaction.objectStore('textNotes');
            const screenshotsStore = transaction.objectStore('screenshots');

            const textNotesIndex = textNotesStore.index('byVideoUrl');
            const screenshotsIndex = screenshotsStore.index('byVideoUrl');

            const textNotesRequest = textNotesIndex.getAll(IDBKeyRange.only([videoUrl]));
            const screenshotsRequest = screenshotsIndex.getAll(IDBKeyRange.only([videoUrl]));

            Promise.all([
                new Promise(resolve => textNotesRequest.onsuccess = () => resolve(textNotesRequest.result)),
                new Promise(resolve => screenshotsRequest.onsuccess = () => resolve(screenshotsRequest.result))
            ]).then(([textNotes, screenshots]) => {
                // Combine and sort notes
                const combinedNotes = [
                    ...textNotes.map(note => ({ ...note, type: 'text' })),
                    ...screenshots.map(screenshot => ({ ...screenshot, type: 'screenshot' }))
                ].sort((a, b) => a.videoTimestamp - b.videoTimestamp);

                resolve(combinedNotes);
            }).catch(reject);
        });
    }


    // Retrieve all text notes for a specific video
    async getAllTextNotes(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textNotes'], 'readonly');
            const store = transaction.objectStore('textNotes');

            // Get all records and filter manually by videoUrl
            const request = store.getAll();

            request.onsuccess = (event) => {
                const allRecords = event.target.result;

                // Filter records by videoUrl
                const filteredRecords = allRecords.filter(record => record.videoUrl === videoUrl);

                // console.log("Filtered text notes:", filteredRecords);
                resolve(filteredRecords);
            };

            request.onerror = (event) => {
                console.error("Error retrieving text notes:", event.target.error);
                reject(`Error retrieving text notes: ${event.target.error}`);
            };
        });
    }


    // Retrieve all screenshots for a specific video
    async getAllScreenshots(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['screenshots'], 'readonly');
            const store = transaction.objectStore('screenshots');

            // Get all records from the store
            const request = store.getAll();

            request.onsuccess = (event) => {
                const allRecords = event.target.result;
                // console.log("All records:", allRecords);

                // Filter the records by videoUrl
                const filteredRecords = allRecords.filter(record => record.videoUrl === videoUrl);

                // console.log("Filtered records:", filteredRecords);
                resolve(filteredRecords);
            };

            request.onerror = (event) => {
                console.error("Error retrieving screenshots:", event.target.error);
                reject(`Error retrieving screenshots: ${event.target.error}`);
            };
        });
    }


    // Delete all notes for a specific video including text notes, screenshots, summary and keypoints
    async deleteAllVideoNotes(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                ['textNotes', 'screenshots', 'summaries', 'keypoints'],
                'readwrite'
            );

            const stores = {
                textNotes: transaction.objectStore('textNotes'),
                screenshots: transaction.objectStore('screenshots'),
                summaries: transaction.objectStore('summaries'),
                keypoints: transaction.objectStore('keypoints')
            };

            let deleted = {
                textNotes: 0,
                screenshots: 0,
                summaries: 0,
                keypoints: 0
            };

            Object.entries(stores).forEach(([storeName, store]) => {
                const request = store.getAll();
                request.onsuccess = (event) => {
                    const items = event.target.result.filter(item => item.videoUrl === videoUrl);
                    items.forEach(item => {
                        const deleteRequest = store.delete(item.id);
                        deleteRequest.onsuccess = () => {
                            deleted[storeName]++;
                        };
                    });
                };
            });

            transaction.oncomplete = () => {
                resolve(deleted);
            };

            transaction.onerror = (event) => {
                reject(`Error deleting notes: ${event.target.error}`);
            };
        });
    }

    // Save summary
    async saveSummary(summaryText, videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['summaries'], 'readwrite');
            const store = transaction.objectStore('summaries');

            const summaryEntry = {
                text: summaryText,
                videoUrl: videoUrl,
                createdAt: Date.now()
            };

            const request = store.add(summaryEntry);

            request.onsuccess = (event) => {
                summaryEntry.id = event.target.result;
                resolve(summaryEntry);
            };
            request.onerror = (event) => reject(`Error saving summary: ${event.target.error}`);
        });
    }

    // Save keypoints
    async saveKeypoints(keypointsText, videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['keypoints'], 'readwrite');
            const store = transaction.objectStore('keypoints');

            const keypointsEntry = {
                text: keypointsText,
                videoUrl: videoUrl,
                createdAt: Date.now()
            };

            const request = store.add(keypointsEntry);

            request.onsuccess = (event) => {
                keypointsEntry.id = event.target.result;
                resolve(keypointsEntry);
            };
            request.onerror = (event) => reject(`Error saving keypoints: ${event.target.error}`);
        });
    }

    // Get summary for a video
    async getSummary(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['summaries'], 'readonly');
            const store = transaction.objectStore('summaries');
            const index = store.index('byVideoUrl');

            const request = index.getAll(videoUrl);
            // console.log("Summary request:", request);
            
            request.onsuccess = (event) => {
                const summaries = event.target.result;
                // console.log("Summaries:", summaries);
                resolve(summaries);
            };
            request.onerror = (event) => reject(`Error retrieving summary: ${event.target.error}`);
        });
    }

    // Get keypoints for a video
    async getKeypoints(videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['keypoints'], 'readonly');
            const store = transaction.objectStore('keypoints');
            const index = store.index('byVideoUrl');

            const request = index.getAll(videoUrl);
            // console.log("Keypoints request:", request);
            
            request.onsuccess = (event) => {
                const keypoints = event.target.result;
                // console.log("Keypoints:", keypoints);
                resolve(keypoints);
            };
            request.onerror = (event) => reject(`Error retrieving keypoints: ${event.target.error}`);
        });
    }

    // Delete a specific text note by ID
    async deleteTextNote(noteId) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textNotes'], 'readwrite');
            const store = transaction.objectStore('textNotes');

            const request = store.delete(noteId);

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(`Error deleting text note: ${event.target.error}`);
        });
    }

    // Delete a specific screenshot by URL and video URL
    async deleteScreenshot(screenshotUrl, videoUrl) {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['screenshots'], 'readwrite');
            const store = transaction.objectStore('screenshots');

            // Get all screenshots and find the matching one
            const request = store.getAll();

            request.onsuccess = (event) => {
                const screenshots = event.target.result;
                const screenshot = screenshots.find(s => s.url === screenshotUrl && s.videoUrl === videoUrl);

                if (screenshot) {
                    // Delete the matching screenshot
                    const deleteRequest = store.delete(screenshot.id);
                    deleteRequest.onsuccess = () => resolve(true);
                    deleteRequest.onerror = (event) => reject(`Error deleting screenshot: ${event.target.error}`);
                } else {
                    reject('Screenshot not found');
                }
            };

            request.onerror = (event) => reject(`Error retrieving screenshots: ${event.target.error}`);
        });
    }

    // Get total count of text notes
    async getTextNotesCount() {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textNotes'], 'readonly');
            const store = transaction.objectStore('textNotes');

            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Error counting text notes: ${event.target.error}`);
        });
    }

    // Get total count of screenshots
    async getScreenshotsCount() {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['screenshots'], 'readonly');
            const store = transaction.objectStore('screenshots');

            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Error counting screenshots: ${event.target.error}`);
        });
    }

    // Update notes in the database
    async updateNote(id, updatedData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["textNotes"], "readwrite");
            const objectStore = transaction.objectStore("textNotes");
            const getRequest = objectStore.get(id);
            
            getRequest.onsuccess = function(event) {
                const existingNote = event.target.result;
                if (!existingNote) {
                    reject(new Error("Note with ID " + id + " not found"));
                    return;
                }
                const mergedData = { ...existingNote, ...updatedData };
                const updateRequest = objectStore.put(mergedData);
                
                updateRequest.onsuccess = function() {
                    resolve(true);
                };
                
                updateRequest.onerror = function(event) {
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }


    // Retrieve all text notes for all videos
    // async getAllTextNotes() {
    //     if (!this.db) {
    //         await this.initDatabase();
    //     }

    //     return new Promise((resolve, reject) => {
    //         const transaction = this.db.transaction(['textNotes'], 'readonly');
    //         const store = transaction.objectStore('textNotes');

    //         const request = store.getAll();

    //         request.onsuccess = (event) => resolve(event.target.result);
    //         request.onerror = (event) => reject(`Error retrieving text notes: ${event.target.error}`);
    //     });
    // }

    // Retrieve all screenshots for all videos
    // async getAllScreenshots() {
    //     if (!this.db) {
    //         await this.initDatabase();
    //     }

    //     return new Promise((resolve, reject) => {
    //         const transaction = this.db.transaction(['screenshots'], 'readonly');
    //         const store = transaction.objectStore('screenshots');

    //         const request = store.getAll();

    //         request.onsuccess = (event) => resolve(event.target.result);
    //         request.onerror = (event) => reject(`Error retrieving screenshots: ${event.target.error}`);
    //     });
    // }
}

window.YouTubeNotesDatabase = YouTubeNotesDatabase;
