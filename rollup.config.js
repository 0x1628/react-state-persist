const replace = require('rollup-plugin-replace')

export default [{
  input: 'lib/index.js',
  output: {
    file: 'dist/react-state-persistent.umd.js',
    format: 'umd',
    name: 'ReactStatePersistent',
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      'react-dom/test-utils': 'ReactTestUtils'
    },
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
    })
  ]
}]