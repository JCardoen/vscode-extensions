Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const os = require("os");
const attachToProcess_1 = require("./attachToProcess");
const nativeAttach_1 = require("./nativeAttach");
const configurationProvider_1 = require("./configurationProvider");
const util = require("../common");
const path = require("path");
let disposables = [];
function activate() {
    let attachItemsProvider = nativeAttach_1.NativeAttachItemsProviderFactory.Get();
    let attacher = new attachToProcess_1.AttachPicker(attachItemsProvider);
    disposables.push(vscode.commands.registerCommand('extension.pickNativeProcess', () => attacher.ShowAttachEntries()));
    let remoteAttacher = new attachToProcess_1.RemoteAttachPicker();
    disposables.push(vscode.commands.registerCommand('extension.pickRemoteNativeProcess', (any) => remoteAttacher.ShowAttachEntries(any)));
}
exports.activate = activate;
function registerConfigurationProviders() {
    let configurationProvider = configurationProvider_1.ConfigurationAssetProviderFactory.getConfigurationProvider();
    if (os.platform() === 'win32') {
        disposables.push(vscode.debug.registerDebugConfigurationProvider('cppvsdbg', new configurationProvider_1.CppVsDbgConfigurationProvider(configurationProvider)));
    }
    disposables.push(vscode.debug.registerDebugConfigurationProvider('cppdbg', new configurationProvider_1.CppDbgConfigurationProvider(configurationProvider)));
    configurationProvider.getConfigurationSnippets();
    disposables.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor));
    onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
}
exports.registerConfigurationProviders = registerConfigurationProviders;
function deactivate() {
    disposables.forEach(d => d.dispose());
}
exports.deactivate = deactivate;
function onDidChangeActiveTextEditor(editor) {
    if (util.getShowReloadPromptOnce() && editor && editor.document.fileName.endsWith(path.sep + "launch.json"))
        util.showReloadOrWaitPromptOnce();
}
//# sourceMappingURL=extension.js.map