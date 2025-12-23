/**
 * 错误列表 TreeView Provider
 */
import * as vscode from 'vscode';
import type { MonitorError, ErrorGroup } from './types';
import { MonitorAPI } from './api';

export class ErrorTreeProvider implements vscode.TreeDataProvider<ErrorTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ErrorTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private errors: MonitorError[] = [];
  private groups: ErrorGroup[] = [];
  private api: MonitorAPI;
  private viewMode: 'list' | 'group' = 'list';

  constructor(api: MonitorAPI) {
    this.api = api;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setViewMode(mode: 'list' | 'group') {
    this.viewMode = mode;
    this.refresh();
  }

  async loadErrors(): Promise<void> {
    try {
      // 获取最近 24 小时的错误
      const startTime = Date.now() - 24 * 60 * 60 * 1000;
      this.errors = await this.api.getErrors({ startTime, limit: 100 });
      this.groups = await this.api.getErrorGroups();
      this.refresh();
    } catch (error) {
      console.error('Failed to load errors:', error);
      vscode.window.showErrorMessage(`加载错误列表失败: ${error}`);
    }
  }

  getTreeItem(element: ErrorTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ErrorTreeItem): Thenable<ErrorTreeItem[]> {
    if (!element) {
      // 根节点
      if (this.viewMode === 'group') {
        return Promise.resolve(this.getGroupItems());
      }
      return Promise.resolve(this.getErrorItems());
    }

    // 分组下的错误
    if (element.contextValue === 'errorGroup') {
      const groupErrors = this.errors.filter(e => e.fingerprint === element.fingerprint);
      return Promise.resolve(groupErrors.map(e => this.createErrorItem(e)));
    }

    return Promise.resolve([]);
  }

  private getErrorItems(): ErrorTreeItem[] {
    return this.errors.map(error => this.createErrorItem(error));
  }

  private getGroupItems(): ErrorTreeItem[] {
    return this.groups.map(group => {
      const item = new ErrorTreeItem(
        `${group.message.substring(0, 50)}...`,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.description = `${group.totalCount} 次`;
      item.tooltip = `${group.type}: ${group.message}\n发生 ${group.totalCount} 次`;
      item.contextValue = 'errorGroup';
      item.fingerprint = group.fingerprint;
      item.iconPath = new vscode.ThemeIcon('bug', new vscode.ThemeColor('errorForeground'));
      return item;
    });
  }

  private createErrorItem(error: MonitorError): ErrorTreeItem {
    const item = new ErrorTreeItem(
      error.message.substring(0, 60) + (error.message.length > 60 ? '...' : ''),
      vscode.TreeItemCollapsibleState.None
    );

    item.description = this.formatTime(error.timestamp);
    item.tooltip = this.createTooltip(error);
    item.contextValue = 'error';
    item.error = error;

    // 图标
    item.iconPath = new vscode.ThemeIcon(
      error.type === 'unhandledrejection' ? 'warning' : 'bug',
      new vscode.ThemeColor('errorForeground')
    );

    // 点击命令
    item.command = {
      command: 'monitor.openError',
      title: '打开错误位置',
      arguments: [error],
    };

    return item;
  }

  private createTooltip(error: MonitorError): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${error.type}**\n\n`);
    md.appendMarkdown(`${error.message}\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`📍 ${error.url}\n\n`);
    md.appendMarkdown(`🕐 ${new Date(error.timestamp).toLocaleString()}\n\n`);
    md.appendMarkdown(`🔢 发生 ${error.count} 次\n\n`);

    if (error.parsedStack && error.parsedStack.length > 0) {
      md.appendMarkdown(`---\n\n**堆栈:**\n\n`);
      error.parsedStack.slice(0, 3).forEach(frame => {
        const file = frame.originalFile || frame.file;
        const line = frame.originalLine || frame.line;
        md.appendMarkdown(`- \`${file}:${line}\`\n`);
      });
    }

    return md;
  }

  private formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    } else {
      return `${Math.floor(diff / 86400000)} 天前`;
    }
  }
}

export class ErrorTreeItem extends vscode.TreeItem {
  error?: MonitorError;
  fingerprint?: string;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
