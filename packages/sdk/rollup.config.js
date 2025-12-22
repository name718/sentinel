import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'umd', name: 'Monitor', sourcemap: true },
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true }
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })]
  }
];
