/**
 * 代码内联装饰 - 在错误行显示标记
 */
import * as vscode from 'vscode';
import * as path from 'path';
import type { MonitorError, MonitorConfig } from './types';

export class ErrorDecorationProvider {
  private decorationType: vscode.TextEditorDecorationType;
  private errors: MonitorError[] = [];
  private config: MonitorConfig;

  constructor(config: MonitorConfig) {
    this.config = config;
    
    // 创建装饰类型
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        color: new vscode.ThemeColor('errorForeground'),
      },
      backgroundColor: new vscode.ThemeColor('diffEditor.removedTextBackground'),
      isWholeLine: true,
    });
  }

  updateConfig(config: MonitorConfig) {
    this.config = config;
    this.updateDecorations();
  }

  setErrors(errors: MonitorError[]) {
    this.errors = errors;
    this.updateDecorations();
  }

  updateDecorations() {
    if (!this.config.showInlineDecorations) {
      // 清除所有装饰
      vscode.window.visibleTextEditors.forEach(editor => {
        editor.setDecorations(this.decorationType, []);
      });
      return;
    }

    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateEditorDecorations(editor);
    });
  }

  private updateEditorDecorations(editor: vscode.TextEditor) {
    const filePath = editor.document.uri.fsPath;
    const decorations: vscode.DecorationOptions[] = [];

    // 查找与当前文件相关的错误
    for (const error of this.errors) {
      const errorFile = this.resolveErrorFile(error);
      if (!errorFile) continue;

      // 检查文件是否匹配
      if (this.isFileMatch(filePath, errorFile)) {
        const line = this.getErrorLine(error);
        if (line !== null && line > 0 && line <= editor.document.lineCount) {
          const range = new vscode.Range(line - 1, 0, line - 1, Number.MAX_VALUE);
          
          decorations.push({
            range,
            hoverMessage: this.createHoverMessage(error),
            renderOptions: {
              after: {
                contentText: ` 🐛 ${error.type}: ${error.message.substring(0, 30)}... (${error.count}次)`,
              },
            },
          });
        }
      }
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  private resolveErrorFile(error: MonitorError): string | null {
    // 优先使用解析后的堆栈
    if (error.parsedStack && error.parsedStack.length > 0) {
      const frame = error.parsedStack[0];
      return frame.originalFile || frame.file;
    }
    return error.filename || null;
  }

  private getErrorLine(error: MonitorError): number | null {
    if (error.parsedStack && error.parsedStack.length > 0) {
      const frame = error.parsedStack[0];
      return frame.originalLine || frame.line;
    }
    return error.lineno || null;
  }

  private isFileMatch(localPath: string, errorFile: string): boolean {
    // 标准化路径
    const normalizedLocal = localPath.replace(/\\/g, '/');
    const normalizedError = errorFile.replace(/\\/g, '/');

    // 直接匹配
    if (normalizedLocal.endsWith(normalizedError)) {
      return true;
    }

    // 使用路径映射
    for (const [remote, local] of Object.entries(this.config.pathMapping)) {
      if (normalizedError.startsWith(remote)) {
        const mappedPath = normalizedError.replace(remote, local);
        if (normalizedLocal.endsWith(mappedPath)) {
          return true;
        }
      }
    }

    // 只比较文件名
    const localFileName = path.basename(normalizedLocal);
    const errorFileName = path.basename(normalizedError);
    return localFileName === errorFileName;
  }

  private createHoverMessage(error: MonitorError): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### 🐛 ${error.type}\n\n`);
    md.appendMarkdown(`${error.message}\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`- **发生次数:** ${error.count}\n`);
    md.appendMarkdown(`- **页面:** ${error.url}\n`);
    md.appendMarkdown(`- **时间:** ${new Date(error.timestamp).toLocaleString()}\n\n`);

    if (error.parsedStack && error.parsedStack.length > 0) {
      md.appendMarkdown(`**堆栈:**\n\n`);
      error.parsedStack.slice(0, 5).forEach(frame => {
        const file = frame.originalFile || frame.file;
        const line = frame.originalLine || frame.line;
        const name = frame.originalName || 'anonymous';
        md.appendMarkdown(`- \`${name}\` at \`${file}:${line}\`\n`);
      });
    }

    return md;
  }

  dispose() {
    this.decorationType.dispose();
  }
}
