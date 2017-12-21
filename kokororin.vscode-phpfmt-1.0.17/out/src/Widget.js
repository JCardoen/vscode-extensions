"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class Widget {
    static getInstance(phpfmt) {
        if (!this.instance) {
            this.instance = new Widget(phpfmt);
        }
        return this.instance;
    }
    constructor(phpfmt) {
        this.phpfmt = phpfmt;
        this.outputChannel = vscode_1.window.createOutputChannel('phpfmt');
    }
    addToOutput(message) {
        if (this.phpfmt.getConfig().debug_mode) {
            const title = `${new Date().toLocaleString()}:`;
            this.outputChannel.appendLine(title);
            this.outputChannel.appendLine('-'.repeat(title.length));
            this.outputChannel.appendLine(`${message}\n`);
            this.outputChannel.show();
        }
    }
}
exports.default = Widget;
//# sourceMappingURL=Widget.js.map