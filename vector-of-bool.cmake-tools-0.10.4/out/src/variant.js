"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const yaml = require("js-yaml");
const ajv = require("ajv");
const json5 = require("json5");
const logging = require("./logging");
const rollbar_1 = require("./rollbar");
const pr_1 = require("./pr");
const util = require("./util");
const watcher_1 = require("./watcher");
const log = logging.createLogger('variant');
exports.DEFAULT_VARIANTS = {
    buildType: {
        default: 'debug',
        description: 'The build type',
        choices: {
            debug: {
                short: 'Debug',
                long: 'Emit debug information without performing optimizations',
                buildType: 'Debug',
            },
            release: {
                short: 'Release',
                long: 'Enable optimizations, omit debug info',
                buildType: 'Release',
            },
            minsize: {
                short: 'MinSizeRel',
                long: 'Optimize for smallest binary size',
                buildType: 'MinSizeRel',
            },
            reldeb: {
                short: 'RelWithDebInfo',
                long: 'Perform optimizations AND include debugging information',
                buildType: 'RelWithDebInfo',
            }
        }
    }
};
class VariantManager {
    /**
     * Create a new VariantManager
     * @param stateManager The state manager for this instance
     */
    constructor(_context, stateManager) {
        this._context = _context;
        this.stateManager = stateManager;
        /**
         * The variants available for this project
         */
        this._variants = new Map();
        this._activeVariantChanged = new vscode.EventEmitter();
        /**
         * Watches for changes to the variants file on the filesystem
         */
        this._variantFileWatcher = new watcher_1.MultiWatcher();
        log.debug('Constructing VariantManager');
        if (!vscode.workspace.workspaceFolders) {
            return; // Nothing we can do. We have no directory open
        }
        const folder = vscode.workspace.workspaceFolders[0]; // TODO: Multi-root!
        if (!folder) {
            return; // No root folder open
        }
        const base_path = folder.uri.path;
        for (const filename of ['cmake-variants.yaml',
            'cmake-variants.json',
            '.vscode/cmake-variants.yaml',
            '.vscode/cmake-variants.json']) {
            this._variantFileWatcher.createWatcher(path.join(base_path, filename));
        }
        this._variantFileWatcher.onAnyEvent(e => {
            rollbar_1.default.invokeAsync(`Reloading variants file ${e.fsPath}`, () => this._reloadVariantsFile(e.fsPath));
        });
        rollbar_1.default.invokeAsync('Initial load of variants file', () => this._reloadVariantsFile());
    }
    get onActiveVariantChanged() { return this._activeVariantChanged.event; }
    dispose() {
        this._variantFileWatcher.dispose();
        this._activeVariantChanged.dispose();
    }
    async _reloadVariantsFile(filepath) {
        const schema_path = this._context.asAbsolutePath('schemas/variants-schema.json');
        const schema = JSON.parse((await pr_1.fs.readFile(schema_path)).toString());
        const validate = new ajv({ allErrors: true, format: 'full' }).compile(schema);
        const workdir = vscode.workspace.rootPath;
        if (!workdir) {
            // Can't read, we don't have a dir open
            return;
        }
        if (!filepath || !await pr_1.fs.exists(filepath)) {
            const candidates = [
                path.join(workdir, 'cmake-variants.json'),
                path.join(workdir, 'cmake-variants.json'),
                path.join(workdir, '.vscode/cmake-variants.json'),
                path.join(workdir, '.vscode/cmake-variants.yaml'),
            ];
            for (const testpath of candidates) {
                if (await pr_1.fs.exists(testpath)) {
                    filepath = testpath;
                    break;
                }
            }
        }
        // Todo: Check that we are loading default vars from config?
        let new_variants = exports.DEFAULT_VARIANTS;
        // Check once more that we have a file to read
        if (filepath && await pr_1.fs.exists(filepath)) {
            const content = (await pr_1.fs.readFile(filepath)).toString();
            try {
                if (filepath.endsWith('.json')) {
                    new_variants = json5.parse(content);
                }
                else {
                    new_variants = yaml.load(content);
                }
            }
            catch (e) {
                log.error(`Error parsing ${filepath}: ${e}`);
            }
        }
        const is_valid = validate(new_variants);
        if (!is_valid) {
            const errors = validate.errors;
            log.error('Invalid variants specified:');
            for (const err of errors) {
                log.error(` >> ${err.dataPath}: ${err.message}`);
            }
            new_variants = exports.DEFAULT_VARIANTS;
        }
        else {
            log.info("Loaded new set of variants");
        }
        const sets = new Map();
        for (const setting_name in new_variants) {
            const setting = new_variants[setting_name];
            const def = setting.default;
            const desc = setting.description;
            const choices = new Map();
            for (const choice_name in setting.choices) {
                const choice = setting.choices[choice_name];
                choices.set(choice_name, choice);
            }
            sets.set(setting_name, {
                default_: def,
                description: desc,
                choices: choices,
            });
        }
        this._variants = sets;
    }
    get haveVariant() { return !!this.stateManager.activeVariantSettings; }
    get activeVariantOptions() {
        const invalid_variant = {
            short: 'Unknown',
            long: 'Unknwon',
        };
        const kws = this.stateManager.activeVariantSettings;
        if (!kws) {
            return invalid_variant;
        }
        const vars = this._variants;
        if (!vars) {
            return invalid_variant;
        }
        const data = Array.from(kws.entries()).map(([param, setting]) => {
            if (!vars.has(param)) {
                debugger;
                throw new Error("Unexpected missing variant setting");
            }
            const choices = vars.get(param).choices;
            if (!choices.has(setting)) {
                debugger;
                throw new Error("Unexpected missing variant option");
            }
            return choices.get(setting);
        });
        const init = { short: '', long: '', settings: {} };
        const result = data.reduce((acc, el) => ({
            buildType: el.buildType || acc.buildType,
            generator: el.generator || acc.generator,
            linkage: el.linkage || acc.linkage,
            toolset: el.toolset || acc.toolset,
            settings: Object.assign({}, acc.settings, el.settings),
            short: [acc.short, el.short].join(' ').trim(),
            long: [acc.long, el.long].join(', '),
        }), init);
        return result;
    }
    async selectVariant() {
        const variants = Array.from(this._variants.entries())
            .map(([key, variant]) => Array.from(variant.choices.entries())
            .map(([value_name, value]) => ({
            settingKey: key,
            settingValue: value_name,
            settings: value
        })));
        const product = util.product(variants);
        const items = product.map(optionset => ({
            label: optionset.map(o => o.settings.short).join(' + '),
            keywordSettings: new Map(optionset.map(param => [param.settingKey, param.settingValue])),
            description: optionset.map(o => o.settings.long).join(' + '),
        }));
        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) {
            return false;
        }
        this.stateManager.activeVariantSettings = chosen.keywordSettings;
        this._activeVariantChanged.fire();
        return true;
    }
    async initialize() { await this._reloadVariantsFile(); }
}
exports.VariantManager = VariantManager;
//# sourceMappingURL=variant.js.map