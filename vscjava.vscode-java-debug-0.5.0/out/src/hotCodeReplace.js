"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const runningSessions = new Set();
const suppressedReasons = new Set();
const NOT_SHOW_AGAIN = "Not show again";
const JAVA_LANGID = "java";
const HCR_EVENT = "hotCodeReplace";
const SAVEDOCUMENT_EVENT = "saveDocument";
var HcrEventType;
(function (HcrEventType) {
    HcrEventType["ERROR"] = "ERROR";
    HcrEventType["WARNING"] = "WARNING";
    HcrEventType["STARTING"] = "STARTING";
    HcrEventType["END"] = "END";
})(HcrEventType || (HcrEventType = {}));
function startHotCodeReplace(context) {
    context.subscriptions.push(vscode.debug.onDidStartDebugSession((session) => {
        const t = session ? session.type : undefined;
        if (t === JAVA_LANGID) {
            runningSessions.add(session);
        }
    }));
    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession((session) => {
        const t = session ? session.type : undefined;
        if (t === JAVA_LANGID) {
            runningSessions.delete(session);
            suppressedReasons.clear();
        }
    }));
    context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((customEvent) => {
        const t = customEvent.session ? customEvent.session.type : undefined;
        if (t === JAVA_LANGID) {
            if (customEvent.event === HCR_EVENT) {
                if (customEvent.body.eventType === HcrEventType.ERROR || customEvent.body.eventType === HcrEventType.WARNING) {
                    if (!suppressedReasons.has(customEvent.body.message)) {
                        vscode.window.showInformationMessage(`Hot code replace failed - ${customEvent.body.message}`, NOT_SHOW_AGAIN).then((res) => {
                            if (res === NOT_SHOW_AGAIN) {
                                suppressedReasons.add(customEvent.body.message);
                            }
                        });
                    }
                }
                else {
                    if (customEvent.body.eventType === HcrEventType.STARTING) {
                        vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p) => {
                            p.report({ message: customEvent.body.message });
                            return new Promise((resolve, reject) => {
                                const listener = vscode.debug.onDidReceiveDebugSessionCustomEvent((hcrEvent) => {
                                    p.report({ message: hcrEvent.body.message });
                                    if (hcrEvent.body.eventType === HcrEventType.END) {
                                        listener.dispose();
                                        resolve();
                                    }
                                });
                            });
                        });
                    }
                }
            }
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e) => {
        if (e.languageId === JAVA_LANGID) {
            runningSessions.forEach((session) => {
                return session.customRequest(SAVEDOCUMENT_EVENT, { documentUri: e.uri.toString() }).then(() => {
                }, () => { });
            });
        }
    }));
}
exports.startHotCodeReplace = startHotCodeReplace;
//# sourceMappingURL=hotCodeReplace.js.map