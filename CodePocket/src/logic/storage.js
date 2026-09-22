import Dexie from 'dexie';

export const db = new Dexie('CodePocketDB');

db.version(1).stores({
    snippets: '++id, uuid, title, *tags, createdAt, updatedAt', // Primary key and indexed props
    settings: 'key'
});
