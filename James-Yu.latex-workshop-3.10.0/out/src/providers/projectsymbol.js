"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class ProjectSymbolProvider {
    constructor(extension) {
        this.extension = extension;
    }
    provideWorkspaceSymbols(_query, _token) {
        return new Promise((resolve, _reject) => {
            const symbols = [];
            Object.keys(this.extension.completer.reference.referenceData).forEach(key => {
                const reference = this.extension.completer.reference.referenceData[key];
                symbols.push(new vscode.SymbolInformation(key, vscode.SymbolKind.Key, '', new vscode.Location(vscode.Uri.file(reference.file), reference.item.position)));
            });
            Object.keys(this.extension.completer.citation.citationData).forEach(key => {
                const citation = this.extension.completer.citation.citationData[key];
                symbols.push(new vscode.SymbolInformation(key, vscode.SymbolKind.Property, '', new vscode.Location(vscode.Uri.file(citation.file), citation.position)));
            });
            Object.keys(this.extension.completer.command.newcommandData).forEach(key => {
                const command = this.extension.completer.command.newcommandData[key];
                symbols.push(new vscode.SymbolInformation(key, vscode.SymbolKind.Function, '', new vscode.Location(vscode.Uri.file(command.file), command.position)));
            });
            resolve(symbols);
        });
    }
}
exports.ProjectSymbolProvider = ProjectSymbolProvider;
//# sourceMappingURL=projectsymbol.js.map