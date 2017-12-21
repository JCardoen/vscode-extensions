"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("../block");
const doc_1 = require("../doc");
const TypeUtil_1 = require("../util/TypeUtil");
/**
 * Represents a function code block
 *
 * This is probably going to be the most complicated of all the
 * blocks as function signatures tend to be the most complex and
 * varied
 */
class FunctionBlock extends block_1.Block {
    constructor() {
        super(...arguments);
        /**
         * @inheritdoc
         */
        this.pattern = /^\s*((.*)(protected|private|public))?(.*)?\s*function\s+&?([A-Za-z0-9_]+)\s*\(([^{;]*)/m;
    }
    /**
     * @inheritdoc
     */
    parse() {
        let params = this.match();
        let doc = new doc_1.Doc('Undocumented function');
        let argString = this.getEnclosed(params[6], "(", ")");
        if (argString != "") {
            let args = argString.split(',');
            for (let index = 0; index < args.length; index++) {
                let arg = args[index];
                let parts = arg.match(/^\s*(\?)?\s*([A-Za-z0-9_\\]+)?\s*\&?((?:[.]{3})?\$[A-Za-z0-9_]+)\s*\=?\s*(.*)\s*/m);
                var type = '[type]';
                if (parts[2] != null && parts[1] === '?') {
                    type = parts[2] + '|null';
                }
                else if (parts[2] != null) {
                    type = parts[2];
                }
                else if (parts[4] != null && parts[4] != "") {
                    type = this.getTypeFromValue(parts[4]);
                }
                doc.params.push(new doc_1.Param(type, parts[3]));
            }
        }
        let returnType = this.signature.match(/.*\)\s*\:\s*(\?)?\s*([a-zA-Z\\]+)\s*$/m);
        if (returnType != null) {
            doc.return = (returnType[1] === '?') ? returnType[2] + '|null' : returnType[2];
        }
        else {
            doc.return = this.getReturnFromName(params[5]);
        }
        return doc;
    }
    /**
     * We can usually assume that these function names will
     * be certain return types and we can save ourselves some
     * effort by checking these
     *
     * @param {string} name
     * @returns {string}
     */
    getReturnFromName(name) {
        if (/^(is|has)/.test(name)) {
            return TypeUtil_1.default.instance.getFormattedTypeByName('bool');
        }
        switch (name) {
            case '__construct':
            case '__destruct':
            case '__set':
            case '__unset':
            case '__wakeup':
                return null;
            case '__isset':
                return TypeUtil_1.default.instance.getFormattedTypeByName('bool');
            case '__sleep':
            case '__debugInfo':
                return 'array';
            case '__toString':
                return 'string';
        }
        return 'void';
    }
}
exports.default = FunctionBlock;
//# sourceMappingURL=function.js.map