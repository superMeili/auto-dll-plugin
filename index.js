const HtmlInjectDllPlugin = require('./lib/html-inject-dll-plugin')
const CreateDllPlugin = require('./lib/create-dll-plugin')
const AutoDllPlugin = require('./lib/auto-dll-plugin')

AutoDllPlugin.HtmlInjectDllPlugin = HtmlInjectDllPlugin
AutoDllPlugin.CreateDllPlugin = CreateDllPlugin

module.exports = AutoDllPlugin
