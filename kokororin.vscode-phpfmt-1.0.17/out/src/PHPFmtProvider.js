"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class PHPFmtProvider {
    constructor(phpfmt) {
        this.phpfmt = phpfmt;
    }
    onDidChangeConfiguration() {
        return vscode_1.workspace.onDidChangeConfiguration(() => {
            this.phpfmt.loadSettings();
        });
    }
    textEditorCommand() {
        return vscode_1.commands.registerTextEditorCommand('phpfmt.format', textEditor => {
            if (textEditor.document.languageId === 'php') {
                vscode_1.commands.executeCommand('editor.action.formatDocument');
            }
        });
    }
    documentFormattingEditProvider(context) {
        return vscode_1.languages.registerDocumentFormattingEditProvider('php', {
            provideDocumentFormattingEdits: document => {
                return new Promise((resolve, reject) => {
                    const originalText = document.getText();
                    const lastLine = document.lineAt(document.lineCount - 1);
                    const range = new vscode_1.Range(new vscode_1.Position(0, 0), lastLine.range.end);
                    this.phpfmt
                        .format(context, originalText)
                        .then((text) => {
                        if (text !== originalText) {
                            resolve([new vscode_1.TextEdit(range, text)]);
                        }
                        else {
                            reject();
                        }
                    })
                        .catch(err => {
                        if (err instanceof Error) {
                            vscode_1.window.showErrorMessage(err.message);
                        }
                        reject();
                    });
                });
            }
        });
    }
    documentRangeFormattingEditProvider(context) {
        return vscode_1.languages.registerDocumentRangeFormattingEditProvider('php', {
            provideDocumentRangeFormattingEdits: (document, range) => {
                return new Promise((resolve, reject) => {
                    let originalText = document.getText(range);
                    if (originalText.replace(/\s+/g, '').length === 0) {
                        return reject();
                    }
                    let hasModified = false;
                    if (originalText.search(/^\s*<\?php/i) === -1) {
                        originalText = `<?php\n${originalText}`;
                        hasModified = true;
                    }
                    this.phpfmt
                        .format(context, originalText)
                        .then((text) => {
                        if (hasModified) {
                            text = text.replace(/^<\?php\r?\n/, '');
                        }
                        if (text !== originalText) {
                            resolve([new vscode_1.TextEdit(range, text)]);
                        }
                        else {
                            reject();
                        }
                    })
                        .catch(err => {
                        if (err instanceof Error) {
                            vscode_1.window.showErrorMessage(err.message);
                        }
                        reject();
                    });
                });
            }
        });
    }
}
exports.default = PHPFmtProvider;
//# sourceMappingURL=PHPFmtProvider.js.map