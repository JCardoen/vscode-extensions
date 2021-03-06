/**
 * "Nag" is a sad word, but it best describes what this module is for.
 *
 * Module for getting "nags" from a remote.
 */ /** */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const https = require('https');
const yaml = require('js-yaml');
const ajv = require('ajv');
const open = require('open');
const NAG_REMOTE_URL = 'https://vector-of-bool.github.io/vscode-cmt-nags.yaml';
function parseNagData(items) {
    const validator = new ajv({ allErrors: true, format: 'full' }).compile({
        type: 'object',
        properties: {
            nags: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        id: { type: 'string' },
                        resetSeconds: { type: 'number' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    isCloseAffordance: { type: 'boolean' },
                                    openLink: { type: 'string' },
                                    askLater: { type: 'boolean' },
                                    neverAgain: { type: 'boolean' },
                                },
                                required: [
                                    'title',
                                    'isCloseAffordance',
                                ],
                            },
                        },
                    },
                    required: [
                        'message',
                        'items',
                        'id',
                        'resetSeconds',
                    ],
                },
            },
        },
        required: [
            'nags',
        ],
    });
    const is_valid = validator(items);
    if (!is_valid) {
        const errors = validator.errors;
        for (const err of errors) {
            console.error(`Error validating nag data: ${err.dataPath}: ${err.message}`);
        }
        return null;
    }
    return items['nags'];
}
exports.parseNagData = parseNagData;
function parseNagYAML(str) {
    try {
        const raw_data = yaml.load(str);
        return parseNagData(raw_data);
    }
    catch (e) {
        console.error('Error parsing YAML nag data', e);
        return null;
    }
}
exports.parseNagYAML = parseNagYAML;
function writeNagState(ext, state) {
    ext.globalState.update('nagState', state);
}
function getOrInitNagState(ext) {
    const state = ext.globalState.get('nagState');
    if (state) {
        return state;
    }
    const init_state = {
        nagsByID: {}
    };
    writeNagState(ext, init_state);
    return init_state;
}
class NagManager {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        this._nagEmitter = new vscode.EventEmitter();
        this._nagState = getOrInitNagState(this.extensionContext);
    }
    get onNag() { return this._nagEmitter.event; }
    _writeNagState() { writeNagState(this.extensionContext, this._nagState); }
    _pollRemoteForNags() {
        const req = https.get(NAG_REMOTE_URL, (res) => {
            if (res.statusCode !== 200) {
                // Stop trying.
                console.error('Not polling for CMake-Tools updates.');
                res.resume();
                return;
            }
            res.setEncoding('utf-8');
            let dataAcc = '';
            res.on('data', chunk => dataAcc += chunk);
            res.on('end', () => {
                this.pumpYAMLString(dataAcc)
                    .then(ok => {
                    if (ok) {
                        // Poll again after two hours
                        setTimeout(() => this._pollRemoteForNags(), 1000 * 60 * 60 * 2);
                    }
                })
                    .catch(e => {
                    console.error('Exception while pumping nag items', e);
                    debugger;
                });
            });
        });
        req.on('error', (err) => {
            console.error('Error polling remote for nags', err);
            setTimeout(() => {
                // Poll again in ten minutes
                this._pollRemoteForNags();
            }, 1000 * 60 * 10);
        });
    }
    pumpYAMLString(str) {
        return __awaiter(this, void 0, void 0, function* () {
            const nags = parseNagYAML(str);
            if (!nags) {
                console.error('Invalid nag data. Not polling anymore');
                return false;
            }
            const state = this._nagState;
            for (const nag of nags) {
                const nag_state = state.nagsByID[nag.id];
                const current_time_ms = new Date().getTime();
                if (nag_state && nag_state.neverAgain) {
                    continue; // User doesn't want to see this ever again
                }
                const show_nag = nag_state === undefined || nag_state.nextShowTimeMS < current_time_ms;
                if (!show_nag) {
                    // Nag is still in a cooldown
                    continue;
                }
                // New nag, or the reset time has expired
                const chosen = yield vscode.window.showInformationMessage(nag.message, ...nag.items);
                if (!chosen) {
                    // They didn't choose. Ask again on next poll.
                    continue;
                }
                const next_time_ms = current_time_ms + (nag.resetSeconds * 1000);
                if (chosen.askLater) {
                    // We'll ask again when the reset timer is met
                    state.nagsByID[nag.id] = {
                        neverAgain: false,
                        nextShowTimeMS: next_time_ms,
                    };
                }
                else if (chosen.neverAgain) {
                    // User doesn't want to be bothered again
                    state.nagsByID[nag.id] = {
                        neverAgain: true,
                        nextShowTimeMS: next_time_ms,
                    };
                }
                if (chosen.openLink) {
                    const link = chosen.openLink;
                    open(link);
                }
            }
            this._writeNagState();
            return true;
        });
    }
    start() {
        try {
            this._pollRemoteForNags();
        }
        catch (e) {
            console.error('Error starting up initial event polling.', e);
        }
    }
}
exports.NagManager = NagManager;
;
//# sourceMappingURL=nag.js.map