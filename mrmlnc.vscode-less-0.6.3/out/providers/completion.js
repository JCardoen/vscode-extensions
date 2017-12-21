'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const nodes_1 = require("../types/nodes");
const parser_1 = require("../services/parser");
const symbols_1 = require("../utils/symbols");
const document_1 = require("../utils/document");
const string_1 = require("../utils/string");
/**
 * Return Mixin as string.
 */
function makeMixinDocumentation(symbol) {
    const args = symbol.parameters.map((item) => `${item.name}: ${item.value}`).join(', ');
    return `${symbol.name}(${args}) {\u2026}`;
}
/**
 * Skip suggestions for parent Mixin inside Mixins.
 */
function mixinSuggestionsFilter(mixin, node) {
    if (!node) {
        return false;
    }
    while (node.type !== nodes_1.NodeType.Stylesheet) {
        if (node.type === nodes_1.NodeType.MixinDeclaration) {
            const identifier = node.getIdentifier();
            if (identifier && identifier.getText() === mixin.name) {
                return true;
            }
        }
        node = node.getParent();
    }
    return false;
}
/**
 * Check context for Variables suggestions.
 */
function checkVariableContext(textBeforeWord, currentWord, isInterpolation) {
    const isPropertyValue = /.*:\s*/.test(textBeforeWord);
    const isEmptyValue = /.*:\s*$/.test(textBeforeWord);
    const isQuotes = /['"]/.test(textBeforeWord.replace(/['"](?:[^'"\\]|\\.)*['"]/g, ''));
    if (isPropertyValue && !isEmptyValue && !isQuotes) {
        return currentWord.includes('@');
    }
    else if (isQuotes) {
        return isInterpolation;
    }
    return currentWord[0] === '@' || isInterpolation || isEmptyValue;
}
/**
 * Check context for Mixins suggestions.
 */
function checkMixinsContext(textBeforeWord, currentWord) {
    return !/.*:\s*/.test(textBeforeWord) && (currentWord[0] === '.' || currentWord[0] === '#');
}
/**
 * Do Completion :)
 */
function doCompletion(document, offset, settings, cache) {
    const completions = vscode_languageserver_1.CompletionList.create([], false);
    const documentPath = vscode_languageserver_1.Files.uriToFilePath(document.uri) || document.uri;
    if (!documentPath) {
        return null;
    }
    const resource = parser_1.parseDocument(document, offset, settings);
    // Update Cache for current document
    cache.set(documentPath, resource.symbols);
    const symbolsList = symbols_1.getSymbolsCollection(cache);
    const documentImports = document_1.getCurrentDocumentImportPaths(symbolsList, documentPath);
    const currentWord = string_1.getCurrentWord(document.getText(), offset);
    const textBeforeWord = string_1.getTextBeforePosition(document.getText(), offset);
    // Is .@{NAME}-test { ... }
    const isInterpolation = currentWord.includes('@{');
    // Bad idea: Drop suggestions inside `//` and `/* */` comments
    if (/^(\/(\/|\*)|\*)/.test(textBeforeWord.trim())) {
        return completions;
    }
    if (settings.suggestVariables && checkVariableContext(textBeforeWord, currentWord, isInterpolation)) {
        symbolsList.forEach((symbols) => {
            const fsPath = document_1.getDocumentPath(documentPath, symbols.document);
            const isImplicitlyImport = symbols.document !== documentPath && documentImports.indexOf(symbols.document) === -1;
            symbols.variables.forEach((variable) => {
                // Drop Variable if its value is RuleSet in interpolation
                // .test-@{|cursor}
                if (isInterpolation && variable.value && variable.value[0] === '{') {
                    return;
                }
                // Add 'implicitly' prefix for Path if the file imported implicitly
                let detailPath = fsPath;
                if (isImplicitlyImport && settings.implicitlyLabel) {
                    detailPath = settings.implicitlyLabel + ' ' + detailPath;
                }
                // Add 'argument from MIXIN_NAME' suffix if Variable is Mixin argument
                let detailText = detailPath;
                if (variable.mixin) {
                    detailText = `argument from ${variable.mixin}, ${detailText}`;
                }
                completions.items.push({
                    // If variable interpolation, then remove the @ character from label
                    label: isInterpolation ? variable.name.substr(1) : variable.name,
                    kind: vscode_languageserver_1.CompletionItemKind.Variable,
                    detail: detailText,
                    documentation: string_1.getLimitedString(variable.value)
                });
            });
        });
    }
    else if (settings.suggestMixins && checkMixinsContext(textBeforeWord, currentWord)) {
        symbolsList.forEach((symbols) => {
            const fsPath = document_1.getDocumentPath(documentPath, symbols.document);
            const isImplicitlyImport = symbols.document !== documentPath && documentImports.indexOf(symbols.document) === -1;
            symbols.mixins.forEach((mixin) => {
                if (mixinSuggestionsFilter(mixin, resource.node)) {
                    return;
                }
                // Add 'implicitly' prefix for Path if the file imported implicitly
                let detailPath = fsPath;
                if (isImplicitlyImport && settings.implicitlyLabel) {
                    detailPath = settings.implicitlyLabel + ' ' + detailPath;
                }
                completions.items.push({
                    label: mixin.name,
                    kind: vscode_languageserver_1.CompletionItemKind.Function,
                    detail: detailPath,
                    documentation: makeMixinDocumentation(mixin),
                    insertText: mixin.name
                });
            });
        });
    }
    return completions;
}
exports.doCompletion = doCompletion;
