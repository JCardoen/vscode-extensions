'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const formatting = require("./formatting");
const toc = require("./toc");
const preview = require("./preview");
const print = require("./print");
const listEditing = require("./listEditing");
const tableFormatter = require("./tableFormatter");
// let activated = false;
function activate(context) {
    // // If a folder is opened and contains Markdown file, activate this extension, that's all
    // workspace.findFiles('**/*.md', '**/node_modules/**', 1).then((files) => {
    //     if (files !== undefined && files.length !== 0) {
    //         activateMdExt(context);
    //         return;
    //     }
    // });
    // // Otherwise, use these events to make sure extension will be activated
    // window.onDidChangeActiveTextEditor(() => {
    //     if (window.activeTextEditor !== undefined && window.activeTextEditor.document.languageId === 'markdown') {
    //         activateMdExt(context);
    //     }
    // });
    // // The first time
    // if (window.activeTextEditor !== undefined && window.activeTextEditor.document.languageId === 'markdown') {
    //     activateMdExt(context);
    // }
    activateMdExt(context);
    return {
        extendMarkdownIt(md) {
            return md.use(require('markdown-it-task-lists'));
        }
    };
}
exports.activate = activate;
function activateMdExt(context) {
    // if (activated)
    //     return;
    // Override `Enter`, `Tab` and `Backspace` keys
    listEditing.activate(context);
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Auto show preview to side
    preview.activate(context);
    // Print to PDF
    print.activate(context);
    // Table formatter
    if (vscode_1.workspace.getConfiguration('markdown.extension.tableFormatter').get('enabled')) {
        tableFormatter.activate(context);
    }
    // Allow `*` in word pattern for quick styling
    vscode_1.languages.setLanguageConfiguration('markdown', {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s\，\。\《\》\？\；\：\‘\“\’\”\（\）\【\】\、]+)/g
    });
    // console.log('activated');
    // activated = true;
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map