"use strict";
/**
 * Defines base class for CMake drivers
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const rollbar_1 = require("./rollbar");
const kit_1 = require("./kit");
const util = require("./util");
const config_1 = require("./config");
const logging = require("./logging");
const pr_1 = require("./pr");
const proc = require("./proc");
const log = logging.createLogger('driver');
/**
 * Base class for CMake drivers.
 *
 * CMake drivers are separated because different CMake version warrant different
 * communication methods. Older CMake versions need to be driven by the command
 * line, but newer versions may be controlled via CMake server, which provides
 * a much richer interface.
 *
 * This class defines the basis for what a driver must implement to work.
 */
class CMakeDriver {
    /**
     * Construct the driver. Concrete instances should provide their own creation
     * routines.
     */
    constructor() {
        /**
         * The current Kit. Starts out `null`, but once set, is never `null` again.
         * We do some separation here to protect ourselves: The `_baseKit` property
         * is `private`, so derived classes cannot change it, except via
         * `_setBaseKit`, which only allows non-null kits. This prevents the derived
         * classes from resetting the kit back to `null`.
         */
        this._baseKit = null;
        /**
         * The environment variables required by the current kit
         */
        this._kitEnvironmentVariables = new Map();
        this._projectNameChangedEmitter = new vscode.EventEmitter();
        /**
         * The CMAKE_BUILD_TYPE to use
         */
        this._variantBuildType = 'Debug';
        /**
         * The arguments to pass to CMake during a configuration according to the current variant
         */
        this._variantConfigureSettings = {};
        /**
         * Determine if we set BUILD_SHARED_LIBS to TRUE or FALSE
         */
        this._variantLinkage = null;
        this._isBusy = false;
        /**
         * The currently running process. We keep a handle on it so we can stop it
         * upon user request
         */
        this._currentProcess = null;
    }
    /**
     * Dispose the driver. This disposes some things synchronously, but also
     * calls the `asyncDispose()` method to start any asynchronous shutdown.
     */
    dispose() {
        log.debug('Disposing base CMakeDriver');
        rollbar_1.default.invokeAsync('Async disposing CMake driver', () => this.asyncDispose());
        this._projectNameChangedEmitter.dispose();
    }
    /**
     * Sets the kit on the base class.
     * @param k The new kit
     */
    async _setBaseKit(k) {
        this._baseKit = Object.seal(Object.assign({}, k));
        log.debug('CMakeDriver Kit set to', k.name);
        this._kitEnvironmentVariables = new Map();
        switch (this._baseKit.type) {
            case 'vsKit': {
                const vars = await kit_1.getVSKitEnvironment(this._baseKit);
                if (!vars) {
                    log.error('Invalid VS environment:', this._baseKit.name);
                    log.error('We couldn\'t find the required environment variables');
                }
                else {
                    this._kitEnvironmentVariables = vars;
                }
            }
            default: {
                // Other kits don't have environment variables
            }
        }
    }
    /**
     * Get the environment variables required by the current Kit
     */
    _getKitEnvironmentVariablesObject() {
        return util.reduce(this._kitEnvironmentVariables.entries(), {}, (acc, [key, value]) => Object.assign(acc, { [key]: value }));
    }
    /**
     * Event fired when the name of the CMake project is discovered or changes
     */
    get onProjectNameChanged() { return this._projectNameChangedEmitter.event; }
    get projectName() { return this._projectName; }
    doSetProjectName(v) {
        this._projectName = v;
        this._projectNameChangedEmitter.fire(v);
    }
    /**
     * Get the current kit. Once non-`null`, the kit is never `null` again.
     */
    get _kit() { return this._baseKit; }
    /**
     * Get the current kit as a `CompilerKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `compilerKit`.
     * Guarded with an `assert`
     */
    get _compilerKit() {
        console.assert(this._kit && this._kit.type == 'compilerKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Get the current kit as a `ToolchainKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `toolchainKit`.
     * Guarded with an `assert`
     */
    get _toolchainFileKit() {
        console.assert(this._kit && this._kit.type == 'toolchainKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Get the current kit as a `VSKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `vsKit`.
     * Guarded with an `assert`
     */
    get _vsKit() {
        console.assert(this._kit && this._kit.type == 'vsKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Determine if we need to wipe the build directory if we change adopt `kit`
     * @param kit The new kit
     * @returns `true` if the new kit requires a clean reconfigure.
     */
    _kitChangeNeedsClean(kit) {
        log.debug('Checking if Kit change necessitates cleaning');
        if (!this._kit) {
            // First kit? We never clean
            log.debug('Clean not needed: No prior Kit selected');
            return false;
        }
        if (kit.type !== this._kit.type) {
            // If the kit type changed, we must clean up
            log.debug('Need clean: Kit type changed', this._kit.type, '->', kit.type);
            return true;
        }
        switch (kit.type) {
            case 'compilerKit': {
                // We need to wipe out the build directory if the compiler for any language was changed.
                const comp_changed = Object.keys(this._compilerKit.compilers).some(lang => {
                    return !!this._compilerKit.compilers[lang]
                        && this._compilerKit.compilers[lang] !== kit.compilers[lang];
                });
                if (comp_changed) {
                    log.debug('Need clean: Compilers for one or more languages changed');
                }
                else {
                    log.debug('Clean not needed: No compilers changed');
                }
                return comp_changed;
            }
            case 'toolchainKit': {
                // We'll assume that a new toolchain is very destructive
                const tc_chained = kit.toolchainFile !== this._toolchainFileKit.toolchainFile;
                if (tc_chained) {
                    log.debug('Need clean: Toolchain file changed', this._toolchainFileKit.toolchainFile, '->', kit.toolchainFile);
                }
                else {
                    log.debug('Clean not needed: toolchain file unchanged');
                }
                return tc_chained;
            }
            case 'vsKit': {
                // Switching VS changes everything
                const vs_changed = kit.visualStudio !== this._vsKit.visualStudio
                    || kit.visualStudioArchitecture !== this._vsKit.visualStudioArchitecture;
                if (vs_changed) {
                    const old_vs = this._vsKit.name;
                    const new_vs = kit.name;
                    log.debug('Need clean: Visual Studio changed:', old_vs, '->', new_vs);
                }
                else {
                    log.debug('Clean not needed: Same Visual Studio');
                }
                return vs_changed;
            }
        }
    }
    executeCommand(command, args, consumer, options) {
        const cur_env = process.env;
        const env = util.mergeEnvironment(cur_env, this._getKitEnvironmentVariablesObject(), (options && options.environment) ? options.environment : {});
        const exec_options = Object.assign({}, options, { environment: env });
        return proc.execute(command, args, consumer, exec_options);
    }
    /**
     * Change the current options from the variant.
     * @param opts The new options
     */
    async setVariantOptions(opts) {
        log.debug('Setting new variant', opts.long || '(Unnamed)');
        this._variantBuildType = opts.buildType || this._variantBuildType;
        this._variantConfigureSettings = opts.settings || this._variantConfigureSettings;
        this._variantLinkage = opts.linkage || null;
    }
    /**
     * Is the driver busy? ie. running a configure/build/test
     */
    get isBusy() { return this._isBusy; }
    /**
     * The source directory, where the root CMakeLists.txt lives.
     *
     * @note This is distinct from the config values, since we do variable
     * substitution.
     */
    get sourceDir() {
        const dir = util.replaceVars(config_1.default.sourceDirectory);
        return util.normalizePath(dir);
    }
    /**
     * Path to where the root CMakeLists.txt file should be
     */
    get mainListFile() {
        const file = path.join(this.sourceDir, 'CMakeLists.txt');
        return util.normalizePath(file);
    }
    /**
     * Directory where build output is stored.
     */
    get binaryDir() {
        const dir = util.replaceVars(config_1.default.buildDirectory);
        return util.normalizePath(dir);
    }
    /**
     * @brief Get the path to the CMakeCache file in the build directory
     */
    get cachePath() {
        // TODO: Cache path can change if build dir changes at runtime
        const file = path.join(this.binaryDir, 'CMakeCache.txt');
        return util.normalizePath(file);
    }
    /**
     * Get the current build type, according to the current selected variant.
     *
     * This is the value passed to CMAKE_BUILD_TYPE or --config for multiconf
     */
    get currentBuildType() { return this._variantBuildType; }
    get isMultiConf() {
        return this.generatorName ? util.isMultiConfGenerator(this.generatorName) : false;
    }
    get allTargetName() {
        const gen = this.generatorName;
        if (gen && (gen.includes('Visual Studio') || gen.toLowerCase().includes('xcode'))) {
            return 'ALL_BUILD';
        }
        else {
            return 'all';
        }
    }
    /**
     * The ID of the current compiler, as best we can tell
     */
    get compilerID() {
        const entries = this.cmakeCacheEntries;
        const languages = ['CXX', 'C', 'CUDA'];
        for (const lang of languages) {
            const entry = entries.get(`CMAKE_${lang}_COMPILER`);
            if (!entry) {
                continue;
            }
            const compiler = entry.value;
            if (compiler.endsWith('cl.exe')) {
                return 'MSVC';
            }
            else if (/g(cc|)\+\+)/.test(compiler)) {
                return 'GNU';
            }
            else if (/clang(\+\+)?[^/]*/.test(compiler)) {
                return 'Clang';
            }
        }
        return null;
    }
    get linkerID() {
        const entries = this.cmakeCacheEntries;
        const entry = entries.get('CMAKE_LINKER');
        if (!entry) {
            return null;
        }
        const linker = entry.value;
        if (linker.endsWith('link.exe')) {
            return 'MSVC';
        }
        else if (linker.endsWith('ld')) {
            return 'GNU';
        }
        return null;
    }
    async testHaveCommand(program, args = ['--version']) {
        const child = this.executeCommand(program, args, undefined, { silent: true });
        try {
            await child.result;
            return true;
        }
        catch (e) {
            const e2 = e;
            if (e2.code == 'ENOENT') {
                return false;
            }
            throw e;
        }
    }
    getPreferredGenerators() {
        const user_preferred = config_1.default.preferredGenerators.map(g => ({ name: g }));
        if (this._kit && this._kit.preferredGenerator) {
            // The kit has a preferred generator attached as well
            user_preferred.push(this._kit.preferredGenerator);
        }
        return user_preferred;
    }
    /**
     * Picks the best generator to use on the current system
     */
    async pickGenerator() {
        // User can override generator with a setting
        const user_generator = config_1.default.generator;
        if (user_generator) {
            log.debug(`Using generator from user configuration: ${user_generator}`);
            return {
                name: user_generator,
                platform: config_1.default.platform || undefined,
                toolset: config_1.default.toolset || undefined,
            };
        }
        log.debug("Trying to detect generator supported by system");
        const platform = process.platform;
        const candidates = this.getPreferredGenerators();
        for (const gen of candidates) {
            const gen_name = gen.name;
            const generator_present = await (async () => {
                if (gen_name == 'Ninja') {
                    return await this.testHaveCommand('ninja-build') || await this.testHaveCommand('ninja');
                }
                if (gen_name == 'MinGW Makefiles') {
                    return platform === 'win32' && await this.testHaveCommand('make')
                        || await this.testHaveCommand('mingw32-make');
                }
                if (gen_name == 'NMake Makefiles') {
                    return platform === 'win32' && await this.testHaveCommand('nmake', ['/?']);
                }
                if (gen_name == 'Unix Makefiles') {
                    return platform !== 'win32' && await this.testHaveCommand('make');
                }
                return false;
            })();
            if (!generator_present) {
                const vsMatch = /^(Visual Studio \d{2} \d{4})($|\sWin64$|\sARM$)/.exec(gen.name);
                if (platform === 'win32' && vsMatch) {
                    return {
                        name: vsMatch[1],
                        platform: gen.platform || vsMatch[2],
                        toolset: gen.toolset,
                    };
                }
                if (gen.name.toLowerCase().startsWith('xcode') && platform === 'darwin') {
                    return gen;
                }
                vscode.window.showErrorMessage('Unknown CMake generator "' + gen.name + '"');
                continue;
            }
            else {
                return gen;
            }
        }
        return null;
    }
    /**
     * Execute pre-configure tasks to check if we are ready to run a full
     * configure. This should be called by a derived driver before any
     * configuration tasks are run
     */
    async _beforeConfigure() {
        log.debug('Runnnig pre-configure checks and steps');
        if (this._isBusy) {
            log.debug('No configuring: We\'re busy.');
            vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to configure.');
            return false;
        }
        if (!this.sourceDir) {
            log.debug('No configuring: There is no source directory.');
            vscode.window.showErrorMessage('You do not have a source directory open');
            return false;
        }
        const cmake_list = this.mainListFile;
        if (!await pr_1.fs.exists(cmake_list)) {
            log.debug('No configuring: There is no', cmake_list);
            const do_quickstart = await vscode.window.showErrorMessage('You do not have a CMakeLists.txt', 'Quickstart a new CMake project');
            if (do_quickstart)
                vscode.commands.executeCommand('cmake.quickStart');
            return false;
        }
        // Save open files before we configure/build
        if (config_1.default.saveBeforeBuild) {
            log.debug('Saving open files before configure/build');
            const save_good = await vscode.workspace.saveAll();
            if (!save_good) {
                log.debug('Saving open files failed');
                const chosen = await vscode.window.showErrorMessage('Not all open documents were saved. Would you like to continue anyway?', {
                    title: 'Yes',
                    isCloseAffordance: false,
                }, {
                    title: 'No',
                    isCloseAffordance: true,
                });
                return chosen !== undefined && (chosen.title === 'Yes');
            }
        }
        return true;
    }
    async doCMakeBuild(target, consumer) {
        const ok = await this._beforeConfigure();
        if (!ok) {
            return null;
        }
        const gen = this.generatorName;
        const generator_args = (() => {
            if (!gen)
                return [];
            else if (/(Unix|MinGW) Makefiles|Ninja/.test(gen) && target !== 'clean')
                return ['-j', config_1.default.numJobs.toString()];
            else if (gen.includes('Visual Studio'))
                return [
                    '/m',
                    '/property:GenerateFullPaths=true',
                ]; // TODO: Older VS doesn't support these flags
            else
                return [];
        })();
        const args = ['--build', this.binaryDir, '--config', this.currentBuildType, '--target', target, '--']
            .concat(generator_args);
        const child = this.executeCommand(config_1.default.cmakePath, args, consumer);
        this._currentProcess = child;
        await child.result;
        this._currentProcess = null;
        return child;
    }
    /**
     * Stops the currently running process at user request
     */
    async stopCurrentProcess() {
        const cur = this._currentProcess;
        if (!cur) {
            return false;
        }
        await util.termProc(cur.child);
        return true;
    }
    /**
     * Asynchronous initialization. Should be called by base classes during
     * their initialization.
     */
    async _init() { log.debug('Base _init() of CMakeDriver'); }
    /**
     * Do pre-configure tasks and return the arguments that should be passed
     * to CMake to configure.
     */
    async _prepareConfigure() {
        const settings = Object.assign({}, config_1.default.configureSettings);
        const _makeFlag = (key, cmval) => {
            switch (cmval.type) {
                case 'UNKNOWN':
                    return `-D${key}=${cmval.value}`;
                default:
                    return `-D${key}:${cmval.type}=${cmval.value}`;
            }
        };
        util.objectPairs(this._variantConfigureSettings).forEach(([key, value]) => settings[key] = value);
        if (this._variantLinkage !== null) {
            settings.BUILD_SHARED_LIBS = this._variantLinkage === 'shared';
        }
        // Always export so that we have compile_commands.json
        settings.CMAKE_EXPORT_COMPILE_COMMANDS = true;
        if (!this.isMultiConf) {
            // Mutliconf generators do not need the CMAKE_BUILD_TYPE property
            settings.CMAKE_BUILD_TYPE = this.currentBuildType;
        }
        const settings_flags = util.objectPairs(settings).map(([key, value]) => _makeFlag(key, util.cmakeify(value)));
        const flags = ['--no-warn-unused-cli'];
        console.assert(!!this._kit);
        if (!this._kit) {
            throw new Error('No kit is set!');
        }
        switch (this._kit.type) {
            case 'compilerKit':
                {
                    log.debug('Using compilerKit', this._kit.name, 'for usage');
                    flags.push(...util.objectPairs(this._kit.compilers)
                        .map(([lang, comp]) => `-DCMAKE_${lang}_COMPILER:FILEPATH=${comp}`));
                }
                break;
            case 'toolchainKit':
                {
                    log.debug('Using CMake toolchain', this._kit.name, 'for configuring');
                    flags.push(`-DCMAKE_TOOLCHAIN_FILE=${this._kit.toolchainFile}`);
                }
                break;
            default:
                log.debug('Kit requires no extra CMake arguments');
        }
        if (this._kit.cmakeSettings) {
            flags.push(...util.objectPairs(this._kit.cmakeSettings)
                .map(([key, val]) => _makeFlag(key, util.cmakeify(val))));
        }
        const final_flags = flags.concat(settings_flags);
        log.trace('CMake flags are', JSON.stringify(final_flags));
        return final_flags;
    }
}
exports.CMakeDriver = CMakeDriver;
//# sourceMappingURL=driver.js.map