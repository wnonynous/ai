import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';
import { z } from 'zod';
export const settingsSchema = z.object({
 name: z.string().trim().min(1).max(100), businessPrompt: z.string().max(20000),
 model: z.string().trim().min(1).max(120), maxTokens: z.number().int().min(64).max(16384),
 temperature: z.number().min(0).max(1).nullable(), maxHistoryMessages: z.number().int().min(2).max(100), enabled: z.boolean()
});
export type Settings = z.infer<typeof settingsSchema>;
export class Store {
 db: Database.Database;
 constructor(path = process.env.APP_DATABASE_PATH ?? './data/app.db') {
  mkdirSync(dirname(path), {recursive:true, mode:0o700}); this.db = new Database(path);
  this.db.pragma('journal_mode = WAL'); this.db.pragma('foreign_keys = ON');
  this.db.exec(`CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
   CREATE TABLE IF NOT EXISTS admins(email TEXT PRIMARY KEY,password_hash TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL REFERENCES admins(email),expires INTEGER NOT NULL,csrf TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS conversations(jid TEXT PRIMARY KEY,updated_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,jid TEXT NOT NULL REFERENCES conversations(jid),role TEXT NOT NULL,content TEXT NOT NULL,type TEXT NOT NULL,button_id TEXT,created_at TEXT NOT NULL,source_id TEXT UNIQUE);
   CREATE INDEX IF NOT EXISTS messages_chat ON messages(jid,id);
   INSERT OR IGNORE INTO migrations VALUES(1);`);
  this.db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(JSON.stringify({name:config.agent.name,businessPrompt:config.agent.businessPrompt,model:config.aiProvider==='groq'?config.groq.model:config.apinex.model,maxTokens:config.apinex.maxTokens,temperature:null,maxHistoryMessages:config.agent.maxHistoryMessages,enabled:true}));
  if(config.aiProvider==='groq'&&this.settings().model.startsWith('free/'))this.saveSettings({...this.settings(),model:config.groq.model});
 }
 settings():Settings {return settingsSchema.parse(JSON.parse((this.db.prepare('SELECT value FROM settings WHERE id=1').get() as {value:string}).value));}
 saveSettings(value:unknown) {const s=settingsSchema.parse(value);this.db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(s));return s;}
 add(jid:string,role:'user'|'assistant',content:string,type:string,buttonId?:string,sourceId?:string):boolean {
 return this.db.transaction(()=>{this.db.prepare('INSERT INTO conversations VALUES(?,?) ON CONFLICT(jid) DO UPDATE SET updated_at=excluded.updated_at').run(jid,new Date().toISOString());return this.db.prepare('INSERT OR IGNORE INTO messages(jid,role,content,type,button_id,created_at,source_id) VALUES(?,?,?,?,?,?,?)').run(jid,role,content,type,buttonId??null,new Date().toISOString(),sourceId??null).changes>0;})();
 }
 history(jid:string,limit:number):Array<{role:'user'|'assistant';content:string}> {return (this.db.prepare('SELECT role,content FROM messages WHERE jid=? ORDER BY id DESC LIMIT ?').all(jid,limit) as Array<{role:'user'|'assistant';content:string}>).reverse();}
 conversations(){return this.db.prepare('SELECT c.*,count(m.id) AS total FROM conversations c LEFT JOIN messages m ON m.jid=c.jid GROUP BY c.jid ORDER BY updated_at DESC LIMIT 200').all();}
 messages(jid:string,before=Number.MAX_SAFE_INTEGER){return this.db.prepare('SELECT * FROM messages WHERE jid=? AND id<? ORDER BY id DESC LIMIT 100').all(jid,before).reverse();}
 counts(){return this.db.prepare('SELECT (SELECT count(*) FROM conversations) AS conversations,(SELECT count(*) FROM messages) AS messages').get();}
 close(){this.db.close();}
}
