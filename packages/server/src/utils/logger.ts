import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private logStream: WriteStream | null = null;
  private enableConsole: boolean;
  private enableFile: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.enableConsole = process.env.LOG_CONSOLE !== 'false';
    this.enableFile = process.env.LOG_FILE === 'true';
    
    if (this.enableFile) {
      this.initFileLogging();
    }
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private initFileLogging() {
    try {
      const logDir = process.env.LOG_DIR || './logs';
      const logFile = join(logDir, `sentinel-${new Date().toISOString().split('T')[0]}.log`);
      
      this.logStream = createWriteStream(logFile, { flags: 'a' });
      
      this.logStream.on('error', (error) => {
        console.error('[Logger] File logging error:', error);
        this.enableFile = false;
        this.logStream = null;
      });
    } catch (error) {
      console.error('[Logger] Failed to initialize file logging:', error);
      this.enableFile = false;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, module, message, data, error } = entry;
    let formatted = `[${timestamp}] [${level}] [${module}] ${message}`;
    
    if (data) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  private writeLog(level: LogLevel, levelName: string, module: string, message: string, data?: any, error?: Error) {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      module,
      message,
      data,
      error
    };

    const formatted = this.formatMessage(entry);

    // Console output
    if (this.enableConsole) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
      }
    }

    // File output
    if (this.enableFile && this.logStream) {
      this.logStream.write(formatted + '\n');
    }
  }

  error(module: string, message: string, data?: any, error?: Error) {
    this.writeLog(LogLevel.ERROR, 'ERROR', module, message, data, error);
  }

  warn(module: string, message: string, data?: any) {
    this.writeLog(LogLevel.WARN, 'WARN', module, message, data);
  }

  info(module: string, message: string, data?: any) {
    this.writeLog(LogLevel.INFO, 'INFO', module, message, data);
  }

  debug(module: string, message: string, data?: any) {
    this.writeLog(LogLevel.DEBUG, 'DEBUG', module, message, data);
  }

  // 创建模块特定的logger
  module(moduleName: string) {
    return {
      error: (message: string, data?: any, error?: Error) => this.error(moduleName, message, data, error),
      warn: (message: string, data?: any) => this.warn(moduleName, message, data),
      info: (message: string, data?: any) => this.info(moduleName, message, data),
      debug: (message: string, data?: any) => this.debug(moduleName, message, data),
    };
  }

  // 优雅关闭
  async close() {
    if (this.logStream) {
      return new Promise<void>((resolve) => {
        this.logStream!.end(() => {
          this.logStream = null;
          resolve();
        });
      });
    }
  }
}

export const logger = new Logger();

// 导出模块特定的logger
export const createModuleLogger = (moduleName: string) => logger.module(moduleName);