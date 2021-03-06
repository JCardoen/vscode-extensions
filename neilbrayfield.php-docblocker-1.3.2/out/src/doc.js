"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
/**
 * Represents a comment block.
 *
 * This class collects data about the snippet then builds
 * it with the appropriate tags
 */
class Doc {
    /**
     * Creates an instance of Doc.
     *
     * @param {string} [message='']
     */
    constructor(message = '') {
        /**
         * List of param tags
         *
         * @type {Array<Param>}
         */
        this.params = [];
        this.message = message;
    }
    /**
     * Set class properties from a standard object
     *
     * @param {*} input
     */
    fromObject(input) {
        if (input.return !== undefined) {
            this.return = input.return;
        }
        if (input.var !== undefined) {
            this.var = input.var;
        }
        if (input.message !== undefined) {
            this.message = input.message;
        }
        if (input.params !== undefined && Array.isArray(input.params)) {
            input.params.forEach(param => {
                this.params.push(new Param(param.type, param.name));
            });
        }
    }
    /**
     * Get the config from either vs code or the manually set one
     *
     * @returns {*}
     */
    getConfig() {
        if (this.config == null) {
            this.config = vscode_1.workspace.getConfiguration().get('php-docblocker');
        }
        return this.config;
    }
    /**
     * Set the config object
     *
     * @param {*} config
     */
    setConfig(config) {
        this.config = config;
    }
    /**
     * Build all the set values into a SnippetString ready for use
     *
     * @param {boolean} [isEmpty=false]
     * @returns {SnippetString}
     */
    build(isEmpty = false) {
        let snippet = new vscode_1.SnippetString();
        let extra = this.getConfig().extra;
        let gap = !this.getConfig().gap;
        if (isEmpty) {
            gap = true;
            extra = [];
        }
        let stop = 2;
        snippet.appendText("/**");
        snippet.appendText("\n * ");
        snippet.appendVariable('1', this.message);
        if (this.params.length) {
            if (!gap) {
                snippet.appendText("\n *");
                gap = true;
            }
            this.params.forEach(param => {
                snippet.appendText("\n * @param ");
                snippet.appendVariable(stop++ + '', param.type);
                snippet.appendText(" ");
                snippet.appendVariable(stop++ + '', param.name);
            });
        }
        if (this.var) {
            if (!gap) {
                snippet.appendText("\n *");
                gap = true;
            }
            snippet.appendText("\n * @var ");
            snippet.appendVariable(stop++ + '', this.var);
        }
        if (this.return) {
            if (!gap) {
                snippet.appendText("\n *");
                gap = true;
            }
            snippet.appendText("\n * @return ");
            snippet.appendVariable(stop++ + '', this.return);
        }
        if (Array.isArray(extra) && extra.length > 0) {
            if (!gap) {
                snippet.appendText("\n *");
                gap = true;
            }
            for (var index = 0; index < extra.length; index++) {
                var element = extra[index];
                snippet.appendText("\n * " + element);
            }
        }
        snippet.appendText("\n */");
        return snippet;
    }
}
exports.Doc = Doc;
/**
 * A simple paramter object
 */
class Param {
    /**
     * Creates an instance of Param.
     *
     * @param {string} type
     * @param {string} name
     */
    constructor(type, name) {
        this.type = type;
        this.name = name;
    }
}
exports.Param = Param;
//# sourceMappingURL=doc.js.map