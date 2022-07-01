const HtmlWebpackPlugin = require('html-webpack-plugin');
const pluginName = 'html-inject-dll-plugin'
const fs = require('fs-extra')
const path = require('path')
const { AsyncSeriesWaterfallHook } = require('tapable')

const hooksMap = new WeakMap()

class HtmlInjectDllPlugin {
  constructor(dllDir) {
    this.dllDir = dllDir
  }
  apply(compiler) {
    const { webpack } = compiler
    const { Compilation } = webpack
    const { RawSource } = webpack.sources

    const publicPath = compiler.options.output.publicPath || ''
    const dllAssetsPromise = this.createDllAssets(compiler)
    
    compiler.hooks.compilation.tap(pluginName, compilation => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(pluginName, (data, cb) => {
        try {
          const allAssets = compilation.getAssets()
          for(let i = 0; i < allAssets.length; i++) {
            const { name, info: { dll_chunk } } = allAssets[i]
            if (dll_chunk) {
              data.assetTags.scripts.unshift(
              {
                tagName: 'script',
                voidTag: false,
                meta: { plugin: 'html-webpack-plugin' },
                attributes: { defer: false, type: undefined, src: publicPath + name }
              })
            }
          }
          cb(null, data)
        } catch (error) {
          cb(error, null)
        }
      })

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        async () => {
          const dllAssets = await dllAssetsPromise
          Object.entries(dllAssets).forEach(([dllFileName, dllContent]) => {
            compilation.emitAsset(dllFileName, new RawSource(dllContent), {
              dll_chunk: true
            })
          })
        }
      );
    })
  }

  async createDllAssets(compiler) {
    await getHooks(compiler).beforeCreateDllAssets.promise()
    const filesPathArr = await fs.readdir(this.dllDir, 'utf8')
    const sep = path.sep
    const pathSplit = this.dllDir.split(sep)
    const dllDirName = pathSplit[pathSplit.length - 1]
    const assets = {}
    for(let i = 0; i < filesPathArr.length; i++) {
      const cur = filesPathArr[i]
      
      if (/\.js$/.test(cur)) {
        const assetsPath = `${dllDirName}/${cur}`
        assets[assetsPath] = await fs.readFile(path.resolve(this.dllDir, `./${cur}`), 'utf8')
      }
    }
    return assets
  }
}

function getHooks (compilerOrcompilation) {
  let hooks = hooksMap.get(compilerOrcompilation)
  if (!hooks) {
    hooksMap.set(compilerOrcompilation, hooks = {
      beforeCreateDllAssets: new AsyncSeriesWaterfallHook(['pluginArgs'])
    })
  }
  return hooks
}

HtmlInjectDllPlugin.getHooks = getHooks 

module.exports = HtmlInjectDllPlugin