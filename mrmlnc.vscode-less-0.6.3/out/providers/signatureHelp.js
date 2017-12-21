'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const less_symbols_parser_1 = require("less-symbols-parser");
const parser_1 = require("../services/parser");
const symbols_1 = require("../utils/symbols");
const string_1 = require("../utils/string");
/**
 * Returns Mixin name and its parameters from line.
 */
function parseArgumentsAtLine(text) {
    text = text.trim();
    if (text.includes('{')) {
        text = text.slice(text.indexOf('{') + 1, text.length).trim();
    }
    const name = text.match(/.*(?:^|\s+)([^\(]+)(?=\()/);
    let paramsString = '';
    if (name) {
        const start = text.lastIndexOf(name[1] + '(') + name[1].length;
        paramsString = text.slice(start, text.length);
    }
    let parameters = 0;
    if (paramsString.substr(1).length !== 0) {
        const tokens = less_symbols_parser_1.tokenizer(paramsString);
        if (tokens.length === 1 && tokens[0][0] === 'brackets') {
            return {
                name: null,
                parameters
            };
        }
        let pos = 0;
        let token;
        let parenthesis = -1;
        while (pos < tokens.length) {
            token = tokens[pos];
            if (token[1] === ',' || token[1] === ';') {
                parameters++;
            }
            else if (token[0] === 'word' && token[1] !== ',' && token[1].includes(',') && parenthesis === 0) {
                const words = token[1].split(/(,)/);
                let index = pos;
                words.forEach((word) => {
                    if (word === '') {
                        return;
                    }
                    tokens.splice(index, 1, word === ',' ? [',', ',', 0] : ['word', word, 0]);
                    index++;
                });
            }
            else if (token[0] === '(') {
                parenthesis++;
            }
            else if (token[0] === ')') {
                parenthesis--;
            }
            pos++;
        }
    }
    return {
        name: name ? name[1] : null,
        parameters
    };
}
/**
 * Do Signature Help :)
 */
function doSignatureHelp(document, offset, cache, settings) {
    const mixins = [];
    const ret = {
        activeSignature: 0,
        activeParameter: 0,
        signatures: []
    };
    const documentPath = vscode_languageserver_1.Files.uriToFilePath(document.uri) || document.uri;
    if (!documentPath) {
        return ret;
    }
    // Skip suggestions if the text not include `(` or ends with `);`
    const textBeforeWord = string_1.getTextBeforePosition(document.getText(), offset);
    if (textBeforeWord.endsWith(');') || !textBeforeWord.includes('(')) {
        return ret;
    }
    const entry = parseArgumentsAtLine(textBeforeWord);
    if (!entry.name) {
        return ret;
    }
    const resource = parser_1.parseDocument(document, offset, settings);
    // Update Cache for current document
    cache.set(documentPath, resource.symbols);
    symbols_1.getSymbolsCollection(cache).forEach((symbols) => {
        symbols.mixins.forEach((mixin) => {
            if (entry.name === mixin.name && mixin.parameters.length >= entry.parameters) {
                mixins.push({
                    name: mixin.name,
                    parameters: mixin.parameters
                });
            }
        });
    });
    if (mixins.length === 0) {
        return ret;
    }
    ret.activeParameter = Math.max(0, entry.parameters);
    mixins.forEach((mixin) => {
        const paramsString = mixin.parameters.map((x) => `${x.name}: ${x.value}`).join(', ');
        const signatureInfo = vscode_languageserver_1.SignatureInformation.create(`${mixin.name} (${paramsString})`);
        mixin.parameters.forEach((param) => {
            signatureInfo.parameters.push({
                label: param.name,
                documentation: ''
            });
        });
        ret.signatures.push(signatureInfo);
    });
    return ret;
}
exports.doSignatureHelp = doSignatureHelp;
