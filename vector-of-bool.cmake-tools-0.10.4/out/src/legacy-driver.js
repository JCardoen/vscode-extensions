"use strict";
/**
 * Module for the legacy driver. Talks to pre-CMake Server versions of CMake.
 * Can also talk to newer versions of CMake via the command line.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const driver_1 = require("./driver");
const rollbar_1 = require("./rollbar");
const pr_1 = require("./pr");
const config_1 = require("./config");
const util = require("./util");
// import * as proc from './proc';
const logging = require("./logging");
const cache_1 = require("./cache");
const compdb_1 = require("./compdb");
const log = logging.createLogger('legacy-driver');
/**
 * The legacy driver.
 */
class LegacyCMakeDriver extends driver_1.CMakeDriver {
    constructor() {
        super();
        this._needsReconfigure = true;
        this._compilationDatabase = Promise.resolve(null);
        this._onReconfiguredEmitter = new vscode.EventEmitter();
        /**
         * Watcher for the CMake cache file on disk.
         */
        this._cacheWatcher = vscode.workspace.createFileSystemWatcher(this.cachePath);
        this._cmakeCache = null;
    }
    get needsReconfigure() { return this._needsReconfigure; }
    async setKit(kit) {
        log.debug('Setting new kit', kit.name);
        this._needsReconfigure = true;
        const need_clean = this._kitChangeNeedsClean(kit);
        if (need_clean) {
            log.debug('Wiping build directory', this.binaryDir);
            await pr_1.fs.rmdir(this.binaryDir);
        }
        await this._setBaseKit(kit);
    }
    async compilationInfoForFile(filepath) {
        const db = await this._compilationDatabase;
        if (!db) {
            return null;
        }
        return db.getCompilationInfoForUri(vscode.Uri.file(filepath));
    }
    get onReconfigured() { return this._onReconfiguredEmitter.event; }
    // Legacy disposal does nothing
    async asyncDispose() {
        this._onReconfiguredEmitter.dispose();
        this._cacheWatcher.dispose();
    }
    async configure(extra_args, outputConsumer) {
        if (!await this._beforeConfigure()) {
            log.debug('Pre-configure steps aborted configure');
            // Pre-configure steps failed. Bad...
            return -1;
        }
        log.debug('Proceeding with configuration');
        // Build up the CMake arguments
        const args = [];
        if (!await pr_1.fs.exists(this.cachePath)) {
            // No cache! We are free to change the generator!
            const generator = await this.pickGenerator();
            if (generator) {
                log.info(`Using the ${generator.name} CMake generator`);
                args.push('-G' + generator.name);
                const platform = generator.platform || config_1.default.platform || null;
                if (platform) {
                    log.info(`Using the ${platform} generator platform`);
                    args.push('-A', platform);
                }
                const toolset = generator.toolset || config_1.default.toolset || null;
                if (toolset) {
                    log.info(`Using the ${toolset} generator toolset`);
                    args.push('-T', toolset);
                }
            }
            else {
                log.warning('Unable to automatically pick a CMake generator. Using default.');
            }
        }
        args.push(...await this._prepareConfigure());
        args.push(...extra_args);
        args.push('-H' + util.normalizePath(this.sourceDir));
        const bindir = util.normalizePath(this.binaryDir);
        args.push('-B' + bindir);
        log.debug('Invoking CMake', config_1.default.cmakePath, 'with arguments', JSON.stringify(args));
        const res = await this.executeCommand(config_1.default.cmakePath, args, outputConsumer).result;
        log.trace(res.stderr);
        log.trace(res.stdout);
        if (res.retc == 0) {
            this._needsReconfigure = false;
        }
        await this._reloadPostConfigure();
        this._onReconfiguredEmitter.fire();
        return res.retc === null ? -1 : res.retc;
    }
    async cleanConfigure(consumer) {
        const build_dir = this.binaryDir;
        const cache = this.cachePath;
        const cmake_files = path.join(build_dir, 'CMakeFiles');
        if (await pr_1.fs.exists(cache)) {
            log.info('Removing ', cache);
            await pr_1.fs.unlink(cache);
        }
        if (await pr_1.fs.exists(cmake_files)) {
            log.info('[vscode] Removing ', cmake_files);
            await pr_1.fs.rmdir(cmake_files);
        }
        return this.configure([], consumer);
    }
    async build(target, consumer) {
        const child = await this.doCMakeBuild(target, consumer);
        if (!child) {
            return child;
        }
        await this._reloadPostConfigure();
        this._onReconfiguredEmitter.fire();
        return child;
    }
    async _init() {
        await super._init();
        if (await pr_1.fs.exists(this.cachePath)) {
            await this._reloadPostConfigure();
        }
        this._cacheWatcher.onDidChange(() => {
            log.debug(`Reload CMake cache: ${this.cachePath} changed`);
            rollbar_1.default.invokeAsync('Reloading CMake Cache', () => this._reloadPostConfigure());
        });
    }
    static async create() {
        log.debug('Creating instance of LegacyCMakeDriver');
        const inst = new LegacyCMakeDriver();
        await inst._init();
        return inst;
    }
    get targets() { return []; }
    get executableTargets() { return []; }
    get cmakeCache() { return this._cmakeCache; }
    async _reloadPostConfigure() {
        // Force await here so that any errors are thrown into rollbar
        const new_cache = await cache_1.CMakeCache.fromPath(this.cachePath);
        this._cmakeCache = new_cache;
        const project = new_cache.get('CMAKE_PROJECT_NAME');
        if (project) {
            this.doSetProjectName(project.as());
        }
        this._compilationDatabase = compdb_1.CompilationDatabase.fromFilePath(path.join(this.binaryDir, 'compile_commands.json'));
    }
    get cmakeCacheEntries() {
        let ret = new Map();
        if (this.cmakeCache) {
            ret = util.reduce(this.cmakeCache.allEntries, ret, (acc, entry) => acc.set(entry.key, entry));
        }
        return ret;
    }
    get generatorName() {
        if (!this.cmakeCache) {
            return null;
        }
        const gen = this.cmakeCache.get('CMAKE_GENERATOR');
        return gen ? gen.as() : null;
    }
}
exports.LegacyCMakeDriver = LegacyCMakeDriver;
//# sourceMappingURL=legacy-driver.js.map