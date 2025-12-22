/**
 * 工具函数模块 - 用于演示 SourceMap 解析
 */

export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function divideNumbers(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

export function processUserData(user: { name: string; age: number }) {
  if (!user.name) {
    throw new Error('User name is required');
  }
  if (user.age < 0) {
    throw new Error('User age cannot be negative');
  }
  return `${user.name} is ${user.age} years old`;
}

export async function fetchData(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function deepNestedError(): void {
  function level1() {
    level2();
  }
  function level2() {
    level3();
  }
  function level3() {
    throw new Error('Error from deeply nested function');
  }
  level1();
}
