const path = require('path')
const fs = require('fs-extra')
const ora = require('ora')
const chalk = require('chalk')
const { isArray, isString, assert } = require('./utils')
const resolve = path.resolve
const defaultDirectoryPath = resolve('node_modules/.dllstore')
const versionJsonPath = resolve(defaultDirectoryPath, './version.json')
const hooksMap = new WeakMap()
const { AsyncSeriesWaterfallHook } = require('tapable')

class CreateDllPlugin {
  constructor(options) {
    this.options = this.normalizeOptions(options || {})
  }

  normalizeOptions(rawOptions) {
    const { dllDir, manifestPath  } = rawOptions
    const defaultOptions = {
      modules: [],
      dllName: 'dll_module',
      dllDir: resolve(defaultDirectoryPath, './dll'),
      manifestPath: resolve(defaultDirectoryPath, './manifest.json')
    }
    const options = {
      ...defaultOptions,
      ...rawOptions
    }
    if (dllDir && !manifestPath) {
      options.manifestPath = resolve(dllDir, './manifest.json')
    }

    this.assertOptions(options)

    const { modules } = options
    options.modulesArr = isString(modules) ? [modules] : modules

    return options
  }

  assertOptions(options) {
    const { modules, dllName, dllDir, manifestPath  } = options
    assert(isArray(modules) || isString(modules), 'modules accepts string or array types')
    assert(isString(dllName), 'dllName accepts string types')
    assert(isString(dllDir), 'dllDir accepts string types')
    assert(isString(manifestPath), 'manifestPath accepts string types')
  }

  createWebpackConfigByOptions(webpack) {
    const { modules, dllName, dllDir, manifestPath  } = this.options
    return {
      mode: 'development',
      entry: {
        [dllName]: modules
      },
      output: {
        path: dllDir,
        filename: '[name].js',
        clean: true,
        library: '[name]_[fullhash]'
      },
      plugins: [
        new webpack.DllPlugin({
          entryOnly: true,
          name: '[name]_[fullhash]',
          path: manifestPath
        })
      ]
    }
  }

  createVersionJsonFile() {
    const versionMap = {}
    this.options.modulesArr.forEach(name => {
      const version = require(`${name}/package.json`).version
      versionMap[name] = version
    })
    fs.writeFile(versionJsonPath, JSON.stringify(versionMap))
    .catch(() => {
      console.log(chalk.red('build version.json fail'));
    })
  }

  checkVersionUpdate() {
    try {
      const versionMap = require(versionJsonPath)
      for(let i = 0; i < this.options.modulesArr.length; i++) {
        const name = this.options.modulesArr[i]
        const version = require(`${name}/package.json`).version
        if (versionMap[name] !== version) {
          return true
        }
      }
      return false
    } catch (error) {
      return false
    }
  }

  async checkDllExist() {
    const { dllName, dllDir, manifestPath  } = this.options
    const dllPath = resolve(dllDir, `./${dllName}.js`)
    return Promise.all([fs.access(dllPath), fs.access(manifestPath)])
  }

  async checkReconstruction() {
    try {
      await this.checkDllExist()
      const ischange = this.checkVersionUpdate()
      return ischange
    } catch (err) {
      return true
    }
  }

  create(compiler) {
    const {webpack } = compiler
    const dllWebpackConfig = this.createWebpackConfigByOptions(webpack)
    const spinner = ora(chalk.blue('start build dll'))
    spinner.start()
    const dllCompiler = webpack(dllWebpackConfig)
    dllCompiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return;
      }
    
      const info = stats.toJson();
    
      if (stats.hasErrors()) {
        console.error(info.errors);
      }
    
      if (stats.hasWarnings()) {
        console.warn(info.warnings);
      }
  
      dllCompiler.close((closeErr) => {
        if (closeErr) {
          console.error(closeErr)
        }
      })

      this.createVersionJsonFile()
      spinner.stop()
      console.log(chalk.green('build dll success'));
      getHooks(compiler).afterDllCreated.promise()
    })
  }

  async apply(compiler) {
    const needCreate = await this.checkReconstruction()
    if (needCreate) {
      this.create(compiler)
    }else {
      getHooks(compiler).afterDllCreated.promise()
    }
  }
}

function getHooks (compilerOrcompilation) {
  let hooks = hooksMap.get(compilerOrcompilation)
  if (!hooks) {
    hooksMap.set(compilerOrcompilation, hooks = {
      afterDllCreated: new AsyncSeriesWaterfallHook(['pluginArgs'])
    })
  }
  return hooks
}

CreateDllPlugin.getHooks = getHooks

module.exports = CreateDllPlugin