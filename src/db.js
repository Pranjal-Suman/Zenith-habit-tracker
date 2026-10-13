import Dexie from 'dexie';
export const db = new Dexie('HabitTrackerDB');
db.version(1).stores({
    habits: "++id, name, createdAt",
    completions: "++id, habitId, date"
});
db.version(2).stores({
    habits: "++id, name, category, createdAt",
    completions: "++id, habitId, date"
});
