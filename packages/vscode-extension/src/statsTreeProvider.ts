/**
 * 统计概览 TreeView Provider
 */
import * as vscode from 'vscode';
import type { MonitorStats } from './types';
import { MonitorAPI } from './api';

export class StatsTreeProvider implements vscode.TreeDataProvider<StatsTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StatsTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private stats: MonitorStats = {
    totalErrors: 0,
    errorGroups: 0,
    affectedPages: 0,
  };
  private connected = false;
  private api: MonitorAPI;

  constructor(api: MonitorAPI) {
    this.api = api;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setConnected(connected: boolean) {
    this.connected = connected;
    this.refresh();
  }

  async loadStats(): Promise<void> {
    try {
      const errors = await this.api.getErrors({ limit: 1000 });
      const groups = await this.api.getErrorGroups();

      this.stats = {
        totalErrors: errors.length,
        errorGroups: groups.length,
        affectedPages: new Set(errors.map(e => e.url)).size,
      };
      this.connected = true;
      this.refresh();
    } catch (error) {
      this.connected = false;
      this.refresh();
    }
  }

  getTreeItem(element: StatsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<StatsTreeItem[]> {
    const items: StatsTreeItem[] = [];

    // 连接状态
    const statusItem = new StatsTreeItem(
      this.connected ? '✅ 已连接' : '❌ 未连接',
      vscode.TreeItemCollapsibleState.None
    );
    statusItem.description = this.connected ? '监控服务器' : '点击配置';
    statusItem.iconPath = new vscode.ThemeIcon(
      this.connected ? 'check' : 'error',
      new vscode.ThemeColor(this.connected ? 'testing.iconPassed' : 'errorForeground')
    );
    if (!this.connected) {
      statusItem.command = {
        command: 'monitor.configure',
        title: '配置服务器',
      };
    }
    items.push(statusItem);

    if (this.connected) {
      // 错误总数
      const errorsItem = new StatsTreeItem(
        `${this.stats.totalErrors}`,
        vscode.TreeItemCollapsibleState.None
      );
      errorsItem.description = '错误总数（24h）';
      errorsItem.iconPath = new vscode.ThemeIcon('bug');
      items.push(errorsItem);

      // 错误分组
      const groupsItem = new StatsTreeItem(
        `${this.stats.errorGroups}`,
        vscode.TreeItemCollapsibleState.None
      );
      groupsItem.description = '错误分组';
      groupsItem.iconPath = new vscode.ThemeIcon('folder');
      items.push(groupsItem);

      // 影响页面
      const pagesItem = new StatsTreeItem(
        `${this.stats.affectedPages}`,
        vscode.TreeItemCollapsibleState.None
      );
      pagesItem.description = '影响页面';
      pagesItem.iconPath = new vscode.ThemeIcon('file');
      items.push(pagesItem);
    }

    return Promise.resolve(items);
  }
}

class StatsTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
