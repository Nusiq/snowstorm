"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const fs = require("fs");
class SnowstormEditorProvider {
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        const provider = new SnowstormEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('x11.snowstorm', provider);
        return providerRegistration;
    }
    /**
     * Called when our custom editor is opened.
     */
    resolveCustomTextEditor(document, webviewPanel, _token) {
        return __awaiter(this, void 0, void 0, function* () {
            webviewPanel.webview.options = {
                enableScripts: true,
            };
            webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
            let latest_change_from_snowstorm = false;
            function updateWebview() {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                    fromExtension: true
                });
            }
            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.toString() === document.uri.toString() && !latest_change_from_snowstorm) {
                    console.log('Snowstorm Updates');
                    updateWebview();
                }
                latest_change_from_snowstorm = false;
            });
            webviewPanel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });
            webviewPanel.webview.onDidReceiveMessage(e => {
                switch (e.type) {
                    case 'save':
                        this.updateText(document, e.content);
                        latest_change_from_snowstorm = true;
                        break;
                    case 'reopen':
                        //vscode.window.showTextDocument(document, vscode.ViewColumn.Beside)
                        vscode.commands.executeCommand('workbench.action.splitEditor');
                        vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', 'left');
                        //vscode.commands.executeCommand('workbench.action.splitEditor').then(() => {
                        //setTimeout(() => {
                        //	console.log('test')
                        //	vscode.commands.executeCommand('reOpenWith')
                        //}, 1000)
                        //})
                        break;
                    case 'request_texture':
                        let path_arr = document.fileName.split(path.sep);
                        let particle_index = path_arr.indexOf('particles');
                        path_arr.splice(particle_index);
                        let filePath = path.join(path_arr.join(path.sep), e.path.replace(/\.png$/, '') + '.png');
                        if (fs.existsSync(filePath)) {
                            const tex_url = webviewPanel.webview.asWebviewUri(vscode.Uri.file(filePath));
                            webviewPanel.webview.postMessage({
                                type: 'provide_texture',
                                url: tex_url.toString(),
                                fromExtension: true
                            });
                        }
                        else {
                            webviewPanel.webview.postMessage({
                                type: 'provide_texture',
                                url: null,
                                fromExtension: true
                            });
                        }
                        break;
                }
            });
            updateWebview();
        });
    }
    getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'snowstorm', 'app.js')));
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					* {
						margin: 0;
						padding: 0;
					}
					#app {
						margin-left: -20px;
					}
				</style>
			</head>
			<body>
				<div id="app"></div>
				<script src="${scriptUri}"></script>
			</body>
		</html>`;
    }
    updateText(document, text) {
        let original = document.getText().replace(/\r/g, '');
        if (text === original)
            return;
        // Find start and end of change
        let start_i = 0;
        let start_line = 0;
        let start_pos = 0;
        for (let char of original) {
            if (original[start_i] !== text[start_i]) {
                break;
            }
            if (char == '\n') {
                start_line++;
                start_pos = 0;
            }
            start_pos++;
            start_i++;
        }
        let total_lines = (original.match(/\n/g) || []).length + 1;
        let end_i = original.length - 1;
        let end_text_i = text.length;
        let end_line = total_lines - 1;
        let end_pos = 0;
        let unmatched = false;
        while (end_i >= 0) {
            if (original[end_i] == '\n') {
                if (unmatched)
                    break;
                end_line--;
            }
            if (original[end_i] !== text[text.length - (original.length - end_i)] || end_i <= start_i) {
                unmatched = true;
            }
            if (unmatched) {
                end_pos++;
            }
            else {
                end_text_i--;
            }
            end_i--;
        }
        text = text.substring(start_i, end_text_i);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(start_line, start_pos - 1, end_line, end_pos), text);
        return vscode.workspace.applyEdit(edit);
    }
}
exports.SnowstormEditorProvider = SnowstormEditorProvider;
//# sourceMappingURL=snowstormEditor.js.map