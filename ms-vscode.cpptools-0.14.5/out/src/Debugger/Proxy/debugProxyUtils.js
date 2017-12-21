Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const os = require("os");
var extensionPath;
function getExtensionPath() {
    extensionPath = path.resolve(__dirname, '../../../../');
    console.log(extensionPath);
    return extensionPath;
}
exports.getExtensionPath = getExtensionPath;
function getDebugAdaptersPath(file) {
    return path.resolve(getExtensionPath(), "debugAdapters", file);
}
exports.getDebugAdaptersPath = getDebugAdaptersPath;
function checkInstallLockFile() {
    return checkFileExists(getInstallLockPath());
}
exports.checkInstallLockFile = checkInstallLockFile;
function checkPackageLockFile() {
    return checkFileExists(getPackageLockPath());
}
exports.checkPackageLockFile = checkPackageLockFile;
function checkFileExists(filePath) {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (stats && stats.isFile()) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    });
}
exports.checkFileExists = checkFileExists;
function touchFile(file) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, "", (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}
function touchDebuggerReloadFile() {
    return touchFile(getDebuggerReloadPath());
}
exports.touchDebuggerReloadFile = touchDebuggerReloadFile;
function getInstallLockPath() {
    return path.resolve(getExtensionPath(), `install.lock`);
}
exports.getInstallLockPath = getInstallLockPath;
function getPackageLockPath() {
    return path.resolve(getExtensionPath(), `package.lock`);
}
exports.getPackageLockPath = getPackageLockPath;
function getDebuggerReloadPath() {
    return path.resolve(getExtensionPath(), `debugger.reload`);
}
exports.getDebuggerReloadPath = getDebuggerReloadPath;
function logToFile(message) {
    var logFolder = path.resolve(getExtensionPath(), "extension.log");
    fs.writeFileSync(logFolder, `${message}${os.EOL}`, { flag: 'a' });
}
exports.logToFile = logToFile;
//# sourceMappingURL=debugProxyUtils.js.map