"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PHPFmt_1 = require("./PHPFmt");
const PHPFmtProvider_1 = require("./PHPFmtProvider");
function activate(context) {
    const provider = new PHPFmtProvider_1.default(new PHPFmt_1.default());
    context.subscriptions.push(provider.onDidChangeConfiguration(), provider.textEditorCommand(), provider.documentFormattingEditProvider(context), provider.documentRangeFormattingEditProvider(context));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map