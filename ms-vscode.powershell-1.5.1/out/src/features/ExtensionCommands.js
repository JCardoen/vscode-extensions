"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
var InvokeExtensionCommandRequest;
(function (InvokeExtensionCommandRequest) {
    InvokeExtensionCommandRequest.type = new vscode_languageclient_1.RequestType('powerShell/invokeExtensionCommand');
})(InvokeExtensionCommandRequest = exports.InvokeExtensionCommandRequest || (exports.InvokeExtensionCommandRequest = {}));
var ExtensionCommandAddedNotification;
(function (ExtensionCommandAddedNotification) {
    ExtensionCommandAddedNotification.type = new vscode_languageclient_1.NotificationType('powerShell/extensionCommandAdded');
})(ExtensionCommandAddedNotification = exports.ExtensionCommandAddedNotification || (exports.ExtensionCommandAddedNotification = {}));
// ---------- Editor Operations ----------
function asRange(value) {
    if (value === undefined) {
        return undefined;
    }
    else if (value === null) {
        return null;
    }
    return { start: asPosition(value.start), end: asPosition(value.end) };
}
function asPosition(value) {
    if (value === undefined) {
        return undefined;
    }
    else if (value === null) {
        return null;
    }
    return { line: value.line, character: value.character };
}
function asCodeRange(value) {
    if (value === undefined) {
        return undefined;
    }
    else if (value === null) {
        return null;
    }
    return new vscode.Range(asCodePosition(value.start), asCodePosition(value.end));
}
function asCodePosition(value) {
    if (value === undefined) {
        return undefined;
    }
    else if (value === null) {
        return null;
    }
    return new vscode.Position(value.line, value.character);
}
var GetEditorContextRequest;
(function (GetEditorContextRequest) {
    GetEditorContextRequest.type = new vscode_languageclient_1.RequestType('editor/getEditorContext');
})(GetEditorContextRequest = exports.GetEditorContextRequest || (exports.GetEditorContextRequest = {}));
var EditorOperationResponse;
(function (EditorOperationResponse) {
    EditorOperationResponse[EditorOperationResponse["Unsupported"] = 0] = "Unsupported";
    EditorOperationResponse[EditorOperationResponse["Completed"] = 1] = "Completed";
})(EditorOperationResponse || (EditorOperationResponse = {}));
var InsertTextRequest;
(function (InsertTextRequest) {
    InsertTextRequest.type = new vscode_languageclient_1.RequestType('editor/insertText');
})(InsertTextRequest = exports.InsertTextRequest || (exports.InsertTextRequest = {}));
var SetSelectionRequest;
(function (SetSelectionRequest) {
    SetSelectionRequest.type = new vscode_languageclient_1.RequestType('editor/setSelection');
})(SetSelectionRequest = exports.SetSelectionRequest || (exports.SetSelectionRequest = {}));
var OpenFileRequest;
(function (OpenFileRequest) {
    OpenFileRequest.type = new vscode_languageclient_1.RequestType('editor/openFile');
})(OpenFileRequest = exports.OpenFileRequest || (exports.OpenFileRequest = {}));
var NewFileRequest;
(function (NewFileRequest) {
    NewFileRequest.type = new vscode_languageclient_1.RequestType('editor/newFile');
})(NewFileRequest = exports.NewFileRequest || (exports.NewFileRequest = {}));
var CloseFileRequest;
(function (CloseFileRequest) {
    CloseFileRequest.type = new vscode_languageclient_1.RequestType('editor/closeFile');
})(CloseFileRequest = exports.CloseFileRequest || (exports.CloseFileRequest = {}));
var ShowErrorMessageRequest;
(function (ShowErrorMessageRequest) {
    ShowErrorMessageRequest.type = new vscode_languageclient_1.RequestType('editor/showErrorMessage');
})(ShowErrorMessageRequest = exports.ShowErrorMessageRequest || (exports.ShowErrorMessageRequest = {}));
var ShowWarningMessageRequest;
(function (ShowWarningMessageRequest) {
    ShowWarningMessageRequest.type = new vscode_languageclient_1.RequestType('editor/showWarningMessage');
})(ShowWarningMessageRequest = exports.ShowWarningMessageRequest || (exports.ShowWarningMessageRequest = {}));
var ShowInformationMessageRequest;
(function (ShowInformationMessageRequest) {
    ShowInformationMessageRequest.type = new vscode_languageclient_1.RequestType('editor/showInformationMessage');
})(ShowInformationMessageRequest = exports.ShowInformationMessageRequest || (exports.ShowInformationMessageRequest = {}));
var SetStatusBarMessageRequest;
(function (SetStatusBarMessageRequest) {
    SetStatusBarMessageRequest.type = new vscode_languageclient_1.RequestType('editor/setStatusBarMessage');
})(SetStatusBarMessageRequest = exports.SetStatusBarMessageRequest || (exports.SetStatusBarMessageRequest = {}));
class ExtensionCommandsFeature {
    constructor() {
        this.extensionCommands = [];
        this.command = vscode.commands.registerCommand('PowerShell.ShowAdditionalCommands', () => {
            if (this.languageClient === undefined) {
                // TODO: Log error message
                return;
            }
            var editor = vscode.window.activeTextEditor;
            var start = editor.selection.start;
            var end = editor.selection.end;
            if (editor.selection.isEmpty) {
                start = new vscode.Position(start.line, 0);
            }
            this.showExtensionCommands(this.languageClient);
        });
        this.command2 = vscode.commands.registerCommand('PowerShell.InvokeRegisteredEditorCommand', (param) => {
            if (this.extensionCommands.length == 0) {
                return;
            }
            let commandToExecute = this.extensionCommands.find(x => x.name === param.commandName);
            if (commandToExecute) {
                this.languageClient.sendRequest(InvokeExtensionCommandRequest.type, { name: commandToExecute.name,
                    context: this.getEditorContext() });
            }
        });
    }
    setLanguageClient(languageclient) {
        // Clear the current list of extension commands since they were
        // only relevant to the previous session
        this.extensionCommands = [];
        this.languageClient = languageclient;
        if (this.languageClient !== undefined) {
            this.languageClient.onNotification(ExtensionCommandAddedNotification.type, command => this.addExtensionCommand(command));
            this.languageClient.onRequest(GetEditorContextRequest.type, details => this.getEditorContext());
            this.languageClient.onRequest(InsertTextRequest.type, details => this.insertText(details));
            this.languageClient.onRequest(SetSelectionRequest.type, details => this.setSelection(details));
            this.languageClient.onRequest(NewFileRequest.type, filePath => this.newFile());
            this.languageClient.onRequest(OpenFileRequest.type, filePath => this.openFile(filePath));
            this.languageClient.onRequest(CloseFileRequest.type, filePath => this.closeFile(filePath));
            this.languageClient.onRequest(ShowInformationMessageRequest.type, message => this.showInformationMessage(message));
            this.languageClient.onRequest(ShowErrorMessageRequest.type, message => this.showErrorMessage(message));
            this.languageClient.onRequest(ShowWarningMessageRequest.type, message => this.showWarningMessage(message));
            this.languageClient.onRequest(SetStatusBarMessageRequest.type, messageDetails => this.setStatusBarMessage(messageDetails));
        }
    }
    dispose() {
        this.command.dispose();
        this.command2.dispose();
    }
    addExtensionCommand(command) {
        this.extensionCommands.push({
            name: command.name,
            displayName: command.displayName
        });
        this.extensionCommands.sort((a, b) => a.name.localeCompare(b.name));
    }
    showExtensionCommands(client) {
        // If no extension commands are available, show a message
        if (this.extensionCommands.length == 0) {
            vscode.window.showInformationMessage("No extension commands have been loaded into the current session.");
            return;
        }
        var quickPickItems = this.extensionCommands.map(command => {
            return {
                label: command.displayName,
                description: command.name,
                command: command
            };
        });
        vscode.window
            .showQuickPick(quickPickItems, { placeHolder: "Select a command" })
            .then(command => this.onCommandSelected(command, client));
    }
    onCommandSelected(chosenItem, client) {
        if (chosenItem !== undefined) {
            client.sendRequest(InvokeExtensionCommandRequest.type, { name: chosenItem.command.name,
                context: this.getEditorContext() });
        }
    }
    insertText(details) {
        var edit = new vscode.WorkspaceEdit();
        edit.set(vscode.Uri.parse(details.filePath), [
            new vscode.TextEdit(new vscode.Range(details.insertRange.start.line, details.insertRange.start.character, details.insertRange.end.line, details.insertRange.end.character), details.insertText)
        ]);
        vscode.workspace.applyEdit(edit);
        return EditorOperationResponse.Completed;
    }
    getEditorContext() {
        return {
            currentFilePath: vscode.window.activeTextEditor.document.uri.toString(),
            cursorPosition: asPosition(vscode.window.activeTextEditor.selection.active),
            selectionRange: asRange(new vscode.Range(vscode.window.activeTextEditor.selection.start, vscode.window.activeTextEditor.selection.end))
        };
    }
    newFile() {
        return vscode.workspace.openTextDocument({ content: '' })
            .then(doc => vscode.window.showTextDocument(doc))
            .then(_ => EditorOperationResponse.Completed);
    }
    openFile(filePath) {
        // Make sure the file path is absolute
        if (!path.win32.isAbsolute(filePath)) {
            filePath = path.win32.resolve(vscode.workspace.rootPath, filePath);
        }
        var promise = vscode.workspace.openTextDocument(filePath)
            .then(doc => vscode.window.showTextDocument(doc))
            .then(_ => EditorOperationResponse.Completed);
        return promise;
    }
    closeFile(filePath) {
        var promise;
        // Make sure the file path is absolute
        if (!path.win32.isAbsolute(filePath)) {
            filePath = path.win32.resolve(vscode.workspace.rootPath, filePath);
        }
        // Normalize file path case for comparison
        var normalizedFilePath = filePath.toLowerCase();
        if (vscode.workspace.textDocuments.find(doc => doc.fileName.toLowerCase() == normalizedFilePath)) {
            promise =
                vscode.workspace.openTextDocument(filePath)
                    .then(doc => vscode.window.showTextDocument(doc))
                    .then(editor => vscode.commands.executeCommand("workbench.action.closeActiveEditor"))
                    .then(_ => EditorOperationResponse.Completed);
        }
        else {
            promise = Promise.resolve(EditorOperationResponse.Completed);
        }
        return promise;
    }
    setSelection(details) {
        vscode.window.activeTextEditor.selections = [
            new vscode.Selection(asCodePosition(details.selectionRange.start), asCodePosition(details.selectionRange.end))
        ];
        return EditorOperationResponse.Completed;
    }
    showInformationMessage(message) {
        return vscode.window
            .showInformationMessage(message)
            .then(_ => EditorOperationResponse.Completed);
    }
    showErrorMessage(message) {
        return vscode.window
            .showErrorMessage(message)
            .then(_ => EditorOperationResponse.Completed);
    }
    showWarningMessage(message) {
        return vscode.window
            .showWarningMessage(message)
            .then(_ => EditorOperationResponse.Completed);
    }
    setStatusBarMessage(messageDetails) {
        if (messageDetails.timeout) {
            vscode.window.setStatusBarMessage(messageDetails.message, messageDetails.timeout);
        }
        else {
            vscode.window.setStatusBarMessage(messageDetails.message);
        }
        return EditorOperationResponse.Completed;
    }
}
exports.ExtensionCommandsFeature = ExtensionCommandsFeature;
//# sourceMappingURL=ExtensionCommands.js.map