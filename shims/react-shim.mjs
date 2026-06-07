// Shim that makes React's CJS exports (including useEffectEvent) available
// to webpack as ESM named imports. `export * from 'cjs'` creates a dynamic
// namespace at runtime instead of enumerating exports statically.
export * from 'react';
export { default } from 'react';
