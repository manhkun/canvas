const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/main.ts'),
      name: 'Canvas',
      fileName: (format) => `canvas.${format}.js`
    }
  }
})