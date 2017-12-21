'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Modified from https://github.com/hnw/vscode-auto-open-markdown-preview
 */
const vscode_1 = require("vscode");
let currentDoc;
function activate(context) {
    vscode_1.window.onDidChangeActiveTextEditor(editor => {
        preview(editor);
    });
    // The first time
    preview(vscode_1.window.activeTextEditor);
}
exports.activate = activate;
function preview(editor) {
    if (!vscode_1.workspace.getConfiguration('markdown.extension.preview').get('autoShowPreviewToSide'))
        return;
    if (!editor || editor.document.languageId !== 'markdown')
        return;
    let doc = editor.document;
    if (doc != currentDoc) {
        vscode_1.commands.executeCommand('markdown.showPreviewToSide').then(() => {
            vscode_1.commands.executeCommand('workbench.action.navigateBack');
        });
        currentDoc = doc;
    }
}
//# sourceMappingURL=preview.js.map