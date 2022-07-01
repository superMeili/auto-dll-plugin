const HtmlInjectDllPlugin = require('./html-inject-dll-plugin')
const CreateDllPlugin = require('./create-dll-plugin')
let dllCreatedResolve
const dllCreatedPromise = new Promise(resolve => {
  dllCreatedResolve = resolve
})

class AutoDllPlugin {
  constructor(options) {
    this.options = options
  }

  apply(compiler) {
    const { dllDir, manifestPath } = this.installCreateDllPlugin(compiler, this.options)
    this.installDllReferencePlugin(compiler, manifestPath)
    this.installHtmlInjectDllPlugin(compiler, dllDir)
  }

  installCreateDllPlugin(compiler, options) {
    CreateDllPlugin.getHooks(compiler).afterDllCreated.tapPromise('dllCreated', async () => {
      dllCreatedResolve()
    })
    const instance = new CreateDllPlugin(options)
    instance.apply(compiler)
    return instance.options
  }

  installDllReferencePlugin(compiler, manifestPath) {
    compiler.hooks.beforeCompile.tapPromise('waitDllCreate', async () => {
      await dllCreatedPromise
    })
    const { webpack } = compiler
    new webpack.DllReferencePlugin({
      manifest: manifestPath
    }).apply(compiler)
  }

  installHtmlInjectDllPlugin(compiler, dllDir) {
    HtmlInjectDllPlugin.getHooks(compiler).beforeCreateDllAssets.tapPromise('waitDllCreate', async () => {
      await dllCreatedPromise
    })
    new HtmlInjectDllPlugin(dllDir).apply(compiler)
  }
}

module.exports = AutoDllPlugin