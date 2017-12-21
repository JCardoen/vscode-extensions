"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
/**
 * Provides helper function to types
 */
class TypeUtil {
    /**
     * Returns the instance for this util
     *
     * @returns {TypeUtil}
     */
    static get instance() {
        return this._instance || (this._instance = new this());
    }
    /**
     * Overwrites the value
     *
     * @param {boolean} value
     */
    set useShortNames(value) {
        this._useShortNames = value;
    }
    /**
     * Returns wether we use long names or not.
     */
    get useShortNames() {
        if (this._useShortNames == null) {
            let config = vscode_1.workspace.getConfiguration().get('php-docblocker');
            this._useShortNames = config.useShortNames || false;
        }
        return this._useShortNames;
    }
    /**
     * Returns the user configuration based name for the given type
     *
     * @param {string} name
     */
    getFormattedTypeByName(name) {
        switch (name) {
            case 'bool':
            case 'boolean':
                if (!this.useShortNames) {
                    return 'boolean';
                }
                return 'bool';
            case 'int':
            case 'integer':
                if (!this.useShortNames) {
                    return 'integer';
                }
                return 'int';
            default:
                return name;
        }
    }
}
exports.default = TypeUtil;
//# sourceMappingURL=TypeUtil.js.map