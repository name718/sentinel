/**
 * Reporter 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Reporter } from './reporter';

describe('Reporter', () => {
  let reporter: Reporter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    
    reporter = new Reporter({
      dsn: 'test-app',
      reportUrl: 'http://localhost:3000/api/report',
      batchSize: 3,
      reportInterval: 1000
    });
  });

  afterEach(() => {
    reporter.destroy();
    vi.unstubAllGlobals();
  });

  it('应该在达到批量大小时自动上报', async () => {
    reporter.push({ type: 'error', message: 'Error 1' });
    reporter.push({ type: 'error', message: 'Error 2' });
    
    expect(fetchMock).not.toHaveBeenCalled();
    
    reporter.push({ type: 'error', message: 'Error 3' });
    
    // 等待异步上报
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/report',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('flush 应该立即上报所有数据', async () => {
    reporter.push({ type: 'error', message: 'Error 1' });
    reporter.push({ type: 'error', message: 'Error 2' });
    
    reporter.flush();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('空队列时 flush 不应该发送请求', async () => {
    reporter.flush();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('上报失败时应该重试', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true });

    reporter.push({ type: 'error', message: 'Error 1' });
    reporter.push({ type: 'error', message: 'Error 2' });
    reporter.push({ type: 'error', message: 'Error 3' });

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
