import typescript from 'rollup-plugin-typescript2';

const external = ['fs', 'path', 'http', 'https', 'url', 'vite', 'webpack'];

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
    useTsconfigDeclarationDir: true,
  }),
];

export default [
  // Main entry
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'cjs', exports: 'named' },
      { file: 'dist/index.mjs', format: 'es' },
    ],
    external,
    plugins,
  },
  // Vite plugin
  {
    input: 'src/vite.ts',
    output: [
      { file: 'dist/vite.js', format: 'cjs', exports: 'named' },
      { file: 'dist/vite.mjs', format: 'es' },
    ],
    external,
    plugins,
  },
  // Webpack plugin
  {
    input: 'src/webpack.ts',
    output: [
      { file: 'dist/webpack.js', format: 'cjs', exports: 'named' },
      { file: 'dist/webpack.mjs', format: 'es' },
    ],
    external,
    plugins,
  },
];
