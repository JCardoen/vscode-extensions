"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const html = require("vscode-html-languageservice");
const lst = require("vscode-languageserver-types");
const service = html.getLanguageService();
class DocumentHighlight {
    provideDocumentHighlights(document, position, token) {
        let doc = lst.TextDocument.create(document.uri.fsPath, 'html', 1, document.getText());
        return service.findDocumentHighlights(doc, position, service.parseHTMLDocument(doc));
    }
}
class DocumentFormat {
    provideDocumentFormattingEdits(document, options, token) {
        let doc = lst.TextDocument.create(document.uri.fsPath, 'html', 1, document.getText());
        let range = lst.Range.create(lst.Position.create(0, 0), lst.Position.create(doc.lineCount, 1));
        let format = vscode.workspace.getConfiguration('html.format');
        return service.format(doc, range, format);
    }
}
function activate(context) {
    let documentSelector = {
        language: 'blade',
        scheme: 'file'
    };
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(documentSelector, new DocumentHighlight));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(documentSelector, new DocumentFormat));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map