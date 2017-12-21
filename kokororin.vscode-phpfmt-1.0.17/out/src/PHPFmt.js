"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const child_process_1 = require("child_process");
const detectIndent = require("detect-indent");
const Widget_1 = require("./Widget");
class PHPFmt {
    constructor() {
        this.args = [];
        this.loadSettings();
        this.widget = Widget_1.default.getInstance(this);
    }
    loadSettings() {
        this.config = vscode_1.workspace.getConfiguration('phpfmt');
        this.args.length = 0;
        if (this.config.custom_arguments !== '') {
            this.args.push(this.config.custom_arguments);
            return;
        }
        if (this.config.psr1) {
            this.args.push('--psr1');
        }
        if (this.config.psr1_naming) {
            this.args.push('--psr1-naming');
        }
        if (this.config.psr2) {
            this.args.push('--psr2');
        }
        if (!this.config.detect_indent) {
            const spaces = this.config.indent_with_space;
            if (spaces === true) {
                this.args.push('--indent_with_space');
            }
            else if (spaces > 0) {
                this.args.push(`--indent_with_space=${spaces}`);
            }
        }
        if (this.config.enable_auto_align) {
            this.args.push('--enable_auto_align');
        }
        if (this.config.visibility_order) {
            this.args.push('--visibility_order');
        }
        const passes = this.config.passes;
        if (passes.length > 0) {
            this.args.push(`--passes=${passes.join(',')}`);
        }
        const exclude = this.config.exclude;
        if (exclude.length > 0) {
            this.args.push(`--exclude=${exclude.join(',')}`);
        }
        if (this.config.smart_linebreak_after_curly) {
            this.args.push('--smart_linebreak_after_curly');
        }
        if (this.config.yoda) {
            this.args.push('--yoda');
        }
        if (this.config.cakephp) {
            this.args.push('--cakephp');
        }
    }
    getConfig() {
        return this.config;
    }
    getArgs(fileName) {
        const args = this.args.slice(0);
        args.push(fileName);
        return args;
    }
    format(context, text) {
        return new Promise((resolve, reject) => {
            if (this.config.detect_indent) {
                const indentInfo = detectIndent(text);
                if (!indentInfo.type) {
                    this.args.push('--indent_with_space');
                }
                else if (indentInfo.type === 'space') {
                    this.args.push(`--indent_with_space=${indentInfo.amount}`);
                }
            }
            try {
                const stdout = child_process_1.execSync(`${this.config.php_bin} -r "echo PHP_VERSION_ID;"`);
                if (Number(stdout.toString()) < 50600) {
                    return reject(new Error('phpfmt: php version < 5.6'));
                }
            }
            catch (err) {
                return reject(new Error('phpfmt: cannot find php bin'));
            }
            const tmpDir = os.tmpdir();
            const fileName = `${tmpDir}/temp-${Math.random()
                .toString(36)
                .replace(/[^a-z]+/g, '')
                .substr(0, 10)}.php`;
            try {
                fs.writeFileSync(fileName, text);
            }
            catch (e) {
                this.widget.addToOutput(e.message);
                return reject(new Error(`phpfmt: cannot create tmp file in "${tmpDir}"`));
            }
            try {
                child_process_1.execSync(`${this.config.php_bin} -l ${fileName}`);
            }
            catch (e) {
                this.widget.addToOutput(e.message);
                vscode_1.window.setStatusBarMessage('phpfmt: format failed - syntax errors found', 4500);
                return reject();
            }
            const args = this.getArgs(fileName);
            args.unshift(path.join(context.extensionPath, PHPFmt.pharRelPath));
            const exec = child_process_1.spawn(this.config.php_bin, args);
            this.widget.addToOutput(`${this.config.php_bin} ${args.join(' ')}`);
            exec.addListener('error', e => {
                this.widget.addToOutput(e.message);
                reject(new Error('phpfmt: run phpfmt failed'));
            });
            exec.addListener('exit', (code) => {
                if (code === 0) {
                    const formatted = fs.readFileSync(fileName, 'utf-8');
                    if (formatted.length > 0) {
                        resolve(formatted);
                    }
                    else {
                        reject();
                    }
                }
                else {
                    reject(new Error(`phpfmt: fmt.phar returns an invalid code ${code}`));
                }
                try {
                    fs.unlinkSync(fileName);
                }
                catch (err) { }
            });
        });
    }
}
PHPFmt.pharRelPath = 'vendor/phpfmt-next/fmt/bin/fmt.phar';
exports.default = PHPFmt;
//# sourceMappingURL=PHPFmt.js.map