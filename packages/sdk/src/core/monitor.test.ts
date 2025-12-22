/**
 * @file Monitor 核心模块测试
 * @description 测试用户信息、上下文、采样率、过滤等功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Monitor } from './monitor';
import type { ErrorEvent, PerformanceData } from '../types';

describe('Monitor - 用户和上下文', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = Monitor.getInstance();
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report'
    });
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('应该能设置和获取用户信息', () => {
    const user = {
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    };

    monitor.setUser(user);
    expect(monitor.getUser()).toEqual(user);
  });

  it('应该能清空用户信息', () => {
    monitor.setUser({ id: 'user123' });
    expect(monitor.getUser()).toBeTruthy();

    monitor.setUser(null);
    expect(monitor.getUser()).toBeNull();
  });

  it('应该能设置和获取上下文', () => {
    const context = {
      version: '1.0.0',
      environment: 'production'
    };

    monitor.setContext(context);
    expect(monitor.getContext()).toMatchObject(context);
  });

  it('应该能设置单个标签', () => {
    monitor.setTag('feature', 'test');
    expect(monitor.getContext().tags).toEqual({ feature: 'test' });

    monitor.setTag('page', 'home');
    expect(monitor.getContext().tags).toEqual({ feature: 'test', page: 'home' });
  });

  it('应该能设置额外数据', () => {
    monitor.setExtra('buildId', '12345');
    expect(monitor.getContext().extra).toEqual({ buildId: '12345' });

    monitor.setExtra('timestamp', Date.now());
    expect(monitor.getContext().extra).toHaveProperty('buildId');
    expect(monitor.getContext().extra).toHaveProperty('timestamp');
  });

  it('上报的事件应该包含用户信息', () => {
    const user = { id: 'user123', username: 'test' };
    monitor.setUser(user);

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
      url: 'http://test.com',
      breadcrumbs: []
    };

    monitor.report(errorEvent);

    expect(pushSpy).toHaveBeenCalled();
    const reportedEvent = pushSpy.mock.calls[0][0] as ErrorEvent;
    expect(reportedEvent.user).toEqual(user);
  });

  it('上报的事件应该包含上下文信息', () => {
    monitor.setContext({ version: '1.0.0', environment: 'test' });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
      url: 'http://test.com',
      breadcrumbs: []
    };

    monitor.report(errorEvent);

    expect(pushSpy).toHaveBeenCalled();
    const reportedEvent = pushSpy.mock.calls[0][0] as ErrorEvent;
    expect(reportedEvent.context?.version).toBe('1.0.0');
    expect(reportedEvent.context?.environment).toBe('test');
  });

  it('上报的事件应该包含设备信息', () => {
    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
      url: 'http://test.com',
      breadcrumbs: []
    };

    monitor.report(errorEvent);

    expect(pushSpy).toHaveBeenCalled();
    const reportedEvent = pushSpy.mock.calls[0][0] as ErrorEvent;
    expect(reportedEvent.context?.device).toBeDefined();
  });
});

describe('Monitor - 采样率', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = Monitor.getInstance();
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('errorSampleRate 为 0 时不应上报错误', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      errorSampleRate: 0
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
      url: 'http://test.com',
      breadcrumbs: []
    };

    // 多次尝试，应该都不上报
    for (let i = 0; i < 10; i++) {
      monitor.report(errorEvent);
    }

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('errorSampleRate 为 1 时应该上报所有错误', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      errorSampleRate: 1
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
      url: 'http://test.com',
      breadcrumbs: []
    };

    monitor.report(errorEvent);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('performanceSampleRate 应该独立于 errorSampleRate', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      errorSampleRate: 0,
      performanceSampleRate: 1
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    const perfData: PerformanceData = {
      fp: 100,
      fcp: 200,
      url: 'http://test.com',
      timestamp: Date.now()
    };

    monitor.report(perfData);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Monitor - URL 过滤', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = Monitor.getInstance();
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('应该过滤 ignoreUrls 中的错误', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      ignoreUrls: ['chrome-extension://', /localhost:9999/]
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    // 模拟来自 chrome-extension 的错误
    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Error from extension',
      timestamp: Date.now(),
      url: 'chrome-extension://abc123/script.js',  // 使用 chrome-extension URL
      breadcrumbs: []
    };

    monitor.report(errorEvent);
    
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('allowUrls 应该只允许匹配的 URL', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      allowUrls: ['myapp.com']
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    // 不在白名单中的 URL
    const errorEvent: ErrorEvent = {
      type: 'error',
      message: 'Error from other domain',
      timestamp: Date.now(),
      url: 'http://other-domain.com/page',
      breadcrumbs: []
    };

    monitor.report(errorEvent);
    
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

describe('Monitor - 错误消息过滤', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = Monitor.getInstance();
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('应该过滤 ignoreErrors 中的错误消息', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      ignoreErrors: [/Script error/i, 'ResizeObserver']
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    // 应该被过滤
    monitor.captureMessage('Script error', 'error');
    monitor.captureMessage('ResizeObserver loop limit exceeded', 'error');
    
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('不匹配的错误消息应该正常上报', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      ignoreErrors: [/Script error/i]
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    monitor.captureMessage('Real error message', 'error');
    
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Monitor - beforeSend 钩子', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = Monitor.getInstance();
  });

  afterEach(() => {
    monitor.destroy();
  });

  it('beforeSend 返回 false 应该阻止上报', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      beforeSend: () => false
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    monitor.captureError(new Error('Test error'));
    
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('beforeSend 返回 null 应该阻止上报', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      beforeSend: () => null
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    monitor.captureError(new Error('Test error'));
    
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('beforeSend 可以修改事件', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      beforeSend: (event) => {
        if ('message' in event) {
          return {
            ...event,
            message: 'Modified: ' + event.message
          };
        }
        return event;
      }
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    monitor.captureMessage('Original message', 'error');
    
    expect(pushSpy).toHaveBeenCalled();
    const reportedEvent = pushSpy.mock.calls[0][0] as ErrorEvent;
    expect(reportedEvent.message).toContain('Modified:');
  });

  it('beforeSend 返回事件对象应该正常上报', () => {
    monitor.init({
      dsn: 'test-dsn',
      reportUrl: 'http://localhost:3000/api/report',
      beforeSend: (event) => event
    });

    const reporter = monitor.getReporter();
    const pushSpy = vi.spyOn(reporter!, 'push');

    monitor.captureError(new Error('Test error'));
    
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
});
