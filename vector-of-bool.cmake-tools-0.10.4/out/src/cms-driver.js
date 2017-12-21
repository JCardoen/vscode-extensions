"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const driver_1 = require("./driver");
const config_1 = require("./config");
const cms = require("./cms-client");
const util = require("./util");
const pr_1 = require("./pr");
const logging_1 = require("./logging");
const log = logging_1.createLogger('cms-driver');
class CMakeServerClientDriver extends driver_1.CMakeDriver {
    constructor(extensionContext) {
        super();
        this.extensionContext = extensionContext;
        this._cacheEntries = new Map();
        this._dirty = false;
        this._onReconfiguredEmitter = new vscode.EventEmitter();
        this._onMessageEmitter = new vscode.EventEmitter();
    }
    get codeModel() { return this._codeModel; }
    set codeModel(v) {
        this._codeModel = v;
        if (v && v.configurations.length && v.configurations[0].projects.length) {
            this.doSetProjectName(v.configurations[0].projects[0].name);
        }
        else {
            this.doSetProjectName('No project');
        }
    }
    async asyncDispose() {
        if (this._cmsClient) {
            await (await this._cmsClient).shutdown();
        }
    }
    async cleanConfigure(consumer) {
        const old_cl = await this._cmsClient;
        this._cmsClient = (async () => {
            // Stop the server before we try to rip out any old files
            await old_cl.shutdown();
            const build_dir = this.binaryDir;
            const cache = this.cachePath;
            const cmake_files = path.join(build_dir, 'CMakeFiles');
            if (await pr_1.fs.exists(cache)) {
                log.info('Removing', cache);
                await pr_1.fs.unlink(cache);
            }
            if (await pr_1.fs.exists(cmake_files)) {
                log.info('Removing', cmake_files);
                await pr_1.fs.rmdir(cmake_files);
            }
            return this._startNewClient();
        })();
        return this.configure([], consumer);
    }
    async configure(extra_args, _consumer) {
        if (!await this._beforeConfigure()) {
            return -1;
        }
        // XXX: Switch up inheritence model to have public impls call private derived
        // methods, to wrap proper common functionality.
        const config_args = await this._prepareConfigure();
        const cl = await this._cmsClient;
        const sub = this.onMessage(msg => {
            if (_consumer) {
                for (const line of msg.split('\n')) {
                    _consumer.output(line);
                }
            }
        });
        try {
            await cl.configure({ cacheArguments: config_args.concat(extra_args) });
            await cl.compute();
            this._dirty = false;
            // TODO: Parse diags
        }
        catch (e) {
            if (e instanceof cms.ServerError) {
                // TODO: Parse diags
                log.error(`Error during CMake configure: ${e}`);
                return 1;
            }
            else {
                throw e;
            }
        }
        finally {
            sub.dispose();
        }
        this._codeModel = await cl.sendRequest('codemodel');
        this._onReconfiguredEmitter.fire();
        return 0;
    }
    get targets() {
        if (!this._codeModel) {
            return [];
        }
        const config = this._codeModel.configurations.find(conf => conf.name == this.currentBuildType);
        if (!config) {
            log.error('Found no matching code model for the current build type. This shouldn\'t be possible');
            return [];
        }
        return config.projects
            .reduce((acc, project) => acc.concat(project.targets.map(t => ({
            type: 'rich',
            name: t.name,
            filepath: t.artifacts && t.artifacts.length
                ? path.normalize(t.artifacts[0])
                : 'Utility target',
            targetType: t.type,
        }))), [{
                type: 'rich',
                name: this.allTargetName,
                filepath: 'A special target to build all available targets',
                targetType: 'META',
            }]);
    }
    get executableTargets() {
        return this.targets.filter(t => t.targetType === 'EXECUTABLE').map(t => ({
            name: t.name,
            path: t.filepath,
        }));
    }
    get generatorName() {
        return this._globalSettings ? this._globalSettings.generator : null;
    }
    markDirty() { this._dirty = true; }
    get needsReconfigure() { return this._dirty; }
    get onReconfigured() { return this._onReconfiguredEmitter.event; }
    get cmakeCacheEntries() { return this._cacheEntries; }
    async setKit(kit) {
        log.debug('Setting new kit', kit.name);
        this._dirty = true;
        const need_clean = this._kitChangeNeedsClean(kit);
        await (await this._cmsClient).shutdown();
        if (need_clean) {
            log.debug('Wiping build directory');
            await pr_1.fs.rmdir(this.binaryDir);
        }
        await this._setBaseKit(kit);
        await this._restartClient();
    }
    async compilationInfoForFile(filepath) {
        if (!this.codeModel) {
            return null;
        }
        const config = this.codeModel.configurations.length === 1
            ? this.codeModel.configurations[0]
            : this.codeModel.configurations.find(c => c.name == this.currentBuildType);
        if (!config) {
            return null;
        }
        for (const project of config.projects) {
            for (const target of project.targets) {
                for (const group of target.fileGroups) {
                    const found = group.sources.find(source => {
                        const abs_source = path.isAbsolute(filepath) ? source : path.join(target.sourceDirectory, source);
                        const abs_filepath = path.isAbsolute(filepath) ? filepath : path.join(this.sourceDir, filepath);
                        return util.normalizePath(abs_source) === util.normalizePath(abs_filepath);
                    });
                    if (found) {
                        const defs = (group.defines || []).map(util.parseCompileDefinition);
                        const defs_o = defs.reduce((acc, [key, value]) => { return Object.assign(acc, { [key]: value }); }, {});
                        const includes = (group.includePath ||
                            []).map(p => ({ path: p.path, isSystem: p.isSystem || false }));
                        const flags = util.splitCommandLine(group.compileFlags);
                        return {
                            file: found,
                            compileDefinitions: defs_o,
                            compileFlags: flags,
                            includeDirectories: includes,
                        };
                    }
                }
            }
        }
        return null;
    }
    async build(target, consumer) {
        const child = await this.doCMakeBuild(target, consumer);
        if (!child) {
            return child;
        }
        return child;
    }
    async _restartClient() {
        this._cmsClient = this._doRestartClient();
        await this._cmsClient;
    }
    async _doRestartClient() {
        const old_client = this._cmsClient;
        if (old_client) {
            const cl = await old_client;
            await cl.shutdown();
        }
        return this._startNewClient();
    }
    _startNewClient() {
        return cms.CMakeServerClient.start({
            binaryDir: this.binaryDir,
            sourceDir: this.sourceDir,
            cmakePath: config_1.default.cmakePath,
            environment: this._getKitEnvironmentVariablesObject(),
            onDirty: async () => { this._dirty = true; },
            onMessage: async (msg) => { this._onMessageEmitter.fire(msg.message); },
            onProgress: async (_prog) => { },
            pickGenerator: () => this.pickGenerator(),
        });
    }
    get onMessage() { return this._onMessageEmitter.event; }
    async _init() {
        await super._init();
        await this._restartClient();
    }
    static async create(ctx) {
        const driver = new CMakeServerClientDriver(ctx);
        await driver._init();
        return driver;
    }
}
exports.CMakeServerClientDriver = CMakeServerClientDriver;
//# sourceMappingURL=cms-driver.js.map