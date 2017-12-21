"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api = require("./api");
const async = require("./async");
const util = require("./util");
const logging_1 = require("./logging");
class Entry {
    constructor(key, value, type, docs, advanced) {
        this._type = api.EntryType.Uninitialized;
        this._docs = '';
        this._key = '';
        this._value = null;
        this._advanced = false;
        this._key = key;
        this._type = type;
        if (type === api.EntryType.Bool) {
            this._value = util.isTruthy(value);
        }
        else {
            this._value = value;
        }
        this._docs = docs;
        this._advanced = advanced;
    }
    get type() {
        return this._type;
    }
    get helpString() {
        return this._docs;
    }
    get key() {
        return this._key;
    }
    get value() {
        return this._value;
    }
    as() {
        return this.value;
    }
    get advanced() {
        return this._advanced;
    }
}
exports.Entry = Entry;
;
class CMakeCache {
    constructor(path, exists, entries) {
        this._exists = false;
        this._path = '';
        this._entries = entries;
        this._path = path;
        this._exists = exists;
    }
    static async fromPath(path) {
        const exists = await async.exists(path);
        if (exists) {
            const content = await async.readFile(path);
            const entries = await CMakeCache.parseCache(content.toString());
            return new CMakeCache(path, exists, entries);
        }
        else {
            return new CMakeCache(path, exists, new Map());
        }
    }
    allEntries() {
        return Array.from(this._entries.values());
    }
    get exists() {
        return this._exists;
    }
    get path() {
        return this._path;
    }
    getReloaded() {
        return CMakeCache.fromPath(this.path);
    }
    static parseCache(content) {
        const lines = content.split(/\r\n|\n|\r/)
            .filter(line => !!line.length)
            .filter(line => !/^\s*#/.test(line));
        const entries = new Map();
        let docs_acc = '';
        for (const line of lines) {
            if (line.startsWith('//')) {
                docs_acc += /^\/\/(.*)/.exec(line)[1] + ' ';
            }
            else {
                const match = /^(.*?):(.*?)=(.*)/.exec(line);
                if (!match) {
                    logging_1.log.error(`Couldn't handle reading cache entry: ${line}`);
                    continue;
                }
                const [, name, typename, valuestr] = match;
                if (!name || !typename)
                    continue;
                if (name.endsWith('-ADVANCED') && valuestr === '1') {
                    // We skip the ADVANCED property variables. They're a little odd.
                }
                else {
                    const key = name;
                    const type = {
                        BOOL: api.EntryType.Bool,
                        STRING: api.EntryType.String,
                        PATH: api.EntryType.Path,
                        FILEPATH: api.EntryType.FilePath,
                        INTERNAL: api.EntryType.Internal,
                        UNINITIALIZED: api.EntryType.Uninitialized,
                        STATIC: api.EntryType.Static,
                    }[typename];
                    const docs = docs_acc.trim();
                    docs_acc = '';
                    if (type === undefined) {
                        logging_1.log.error(`Cache entry '${name}' has unknown type: '${typename}'`);
                    }
                    else {
                        entries.set(name, new Entry(key, valuestr, type, docs, false));
                    }
                }
            }
        }
        return entries;
    }
    get(key, defaultValue) {
        return this._entries.get(key) || null;
    }
}
exports.CMakeCache = CMakeCache;
//# sourceMappingURL=cache.js.map