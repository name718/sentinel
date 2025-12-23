/**
 * 文件打开器 - 根据错误信息打开对应文件并定位
 */
import * as vscode from 'vscode';
import * as path from 'path';
import type { MonitorError, MonitorConfig } from './types';

export class FileOpener {
  private config: MonitorConfig;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  updateConfig(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * 打开错误对应的文件
   */
  async openError(error: MonitorError): Promise<boolean> {
    // 获取文件路径和行号
    let filePath: string | null = null;
    let line = 1;
    let column = 1;

    // 优先使用解析后的堆栈
    if (error.parsedStack && error.parsedStack.length > 0) {
      const frame = error.parsedStack[0];
      filePath = frame.originalFile || frame.file;
      line = frame.originalLine || frame.line;
      column = frame.originalColumn || frame.column;
    } else if (error.filename) {
      filePath = error.filename;
      line = error.lineno || 1;
      column = error.colno || 1;
    }

    if (!filePath) {
      vscode.window.showWarningMessage('无法确定错误文件位置');
      return false;
    }

    // 解析本地路径
    const localPath = await this.resolveLocalPath(filePath);
    
    if (!localPath) {
      // 尝试让用户手动选择
      const result = await vscode.window.showWarningMessage(
        `找不到文件: ${filePath}`,
        '手动选择',
        '配置路径映射'
      );

      if (result === '手动选择') {
        return this.manualSelectFile(filePath, line, column);
      } else if (result === '配置路径映射') {
        vscode.commands.executeCommand('monitor.configure');
      }
      return false;
    }

    // 打开文件
    return this.openFile(localPath, line, column);
  }

  /**
   * 解析本地文件路径
   */
  private async resolveLocalPath(remotePath: string): Promise<string | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    // 标准化路径
    const normalizedRemote = remotePath.replace(/\\/g, '/');

    // 1. 尝试路径映射
    for (const [remote, local] of Object.entries(this.config.pathMapping)) {
      if (normalizedRemote.startsWith(remote)) {
        const mappedPath = normalizedRemote.replace(remote, local);
        for (const folder of workspaceFolders) {
          const fullPath = path.join(folder.uri.fsPath, mappedPath);
          if (await this.fileExists(fullPath)) {
            return fullPath;
          }
        }
      }
    }

    // 2. 直接在工作区查找
    for (const folder of workspaceFolders) {
      // 尝试直接拼接
      const directPath = path.join(folder.uri.fsPath, normalizedRemote);
      if (await this.fileExists(directPath)) {
        return directPath;
      }

      // 尝试去掉 src/ 前缀
      if (normalizedRemote.startsWith('src/')) {
        const withoutSrc = normalizedRemote.substring(4);
        const pathWithoutSrc = path.join(folder.uri.fsPath, 'src', withoutSrc);
        if (await this.fileExists(pathWithoutSrc)) {
          return pathWithoutSrc;
        }
      }
    }

    // 3. 使用 VS Code 搜索
    const fileName = path.basename(normalizedRemote);
    const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules/**', 5);
    
    if (files.length === 1) {
      return files[0].fsPath;
    } else if (files.length > 1) {
      // 多个匹配，尝试找最佳匹配
      for (const file of files) {
        if (file.fsPath.replace(/\\/g, '/').endsWith(normalizedRemote)) {
          return file.fsPath;
        }
      }
      // 返回第一个
      return files[0].fsPath;
    }

    return null;
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 打开文件并定位
   */
  private async openFile(filePath: string, line: number, column: number): Promise<boolean> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // 定位到指定行列
      const position = new vscode.Position(Math.max(0, line - 1), Math.max(0, column - 1));
      const range = new vscode.Range(position, position);
      
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      // 高亮当前行
      const lineRange = new vscode.Range(
        new vscode.Position(line - 1, 0),
        new vscode.Position(line - 1, Number.MAX_VALUE)
      );
      
      const decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
        isWholeLine: true,
      });
      
      editor.setDecorations(decoration, [lineRange]);

      // 3 秒后移除高亮
      setTimeout(() => {
        decoration.dispose();
      }, 3000);

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`打开文件失败: ${error}`);
      return false;
    }
  }

  /**
   * 手动选择文件
   */
  private async manualSelectFile(remotePath: string, line: number, column: number): Promise<boolean> {
    const fileName = path.basename(remotePath);
    
    const files = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Source Files': ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte'],
      },
      title: `选择文件: ${fileName}`,
    });

    if (files && files.length > 0) {
      return this.openFile(files[0].fsPath, line, column);
    }

    return false;
  }
}
