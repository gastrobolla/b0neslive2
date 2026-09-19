import fs from 'fs';
import path from 'path';
import { loadPersistedData, savePersistedData, migrateToV2 } from '../server/storage.js';

console.log('[Migration Script] Loading persisted database...');
const data = loadPersistedData();

console.log(`[Migration Script] Database loaded. Matches: ${data.matches?.length}. Running migrateToV2...`);
const v2 = migrateToV2(data);
v2.dataVersion = 2;
savePersistedData(v2);
console.log(`[Migration Script] Saved V2 database successfully with dataVersion: ${v2.dataVersion}`);

const dbPath = path.join(process.cwd(), 'data', 'bones_database.json');
const stat = fs.statSync(dbPath);
console.log(`[Migration Script] Finished. File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
