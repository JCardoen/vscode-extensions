/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cp = require("child_process");
const goInstallTools_1 = require("./goInstallTools");
const util_1 = require("./util");
const missingToolMsg = 'Missing tool: ';
class Formatter {
    formatDocument(document) {
        return new Promise((resolve, reject) => {
            let filename = document.fileName;
            let goConfig = vscode.workspace.getConfiguration('go', document.uri);
            let formatTool = goConfig['formatTool'] || 'goreturns';
            let formatCommandBinPath = util_1.getBinPath(formatTool);
            let formatFlags = goConfig['formatFlags'].slice() || [];
            // We ignore the -w flag that updates file on disk because that would break undo feature
            if (formatFlags.indexOf('-w') > -1) {
                formatFlags.splice(formatFlags.indexOf('-w'), 1);
            }
            // Fix for https://github.com/Microsoft/vscode-go/issues/613 and https://github.com/Microsoft/vscode-go/issues/630
            if (formatTool === 'goimports') {
                formatFlags.push('-srcdir', filename);
            }
            let t0 = Date.now();
            let env = util_1.getToolsEnvVars();
            const p = cp.execFile(formatCommandBinPath, formatFlags, { env }, (err, stdout, stderr) => {
                if (err && err.code === 'ENOENT') {
                    return reject(missingToolMsg + formatTool);
                }
                if (err) {
                    console.log(err.message || stderr);
                    return reject('Check the console in dev tools to find errors when formatting.');
                }
                ;
                const fileStart = new vscode.Position(0, 0);
                const fileEnd = document.lineAt(document.lineCount - 1).range.end;
                const textEdits = [new vscode.TextEdit(new vscode.Range(fileStart, fileEnd), stdout)];
                let timeTaken = Date.now() - t0;
                /* __GDPR__
                   "format" : {
                      "tool" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                      "timeTaken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
                   }
                 */
                util_1.sendTelemetryEvent('format', { tool: formatTool }, { timeTaken });
                return resolve(textEdits);
            });
            p.stdin.end(document.getText());
        });
    }
}
exports.Formatter = Formatter;
class GoDocumentFormattingEditProvider {
    constructor() {
        this.formatter = new Formatter();
    }
    provideDocumentFormattingEdits(document, options, token) {
        return this.formatter.formatDocument(document).then(null, err => {
            // Prompt for missing tool is located here so that the
            // prompts dont show up when formatting is run on save
            if (typeof err === 'string' && err.startsWith(missingToolMsg)) {
                goInstallTools_1.promptForMissingTool(err.substr(missingToolMsg.length));
            }
            else {
                console.log(err);
            }
            return [];
        });
    }
}
exports.GoDocumentFormattingEditProvider = GoDocumentFormattingEditProvider;
//# sourceMappingURL=goFormat.js.map