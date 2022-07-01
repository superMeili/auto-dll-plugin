# auto-dll-plugin

Webpack5 plug-in for simplifying DLL usage

It's very easy to use

***You need to use it in a development environment, not a prodution environment***

# Installation

```
npm install auto-dll-plugin -D
```

# Examples

## usage with webpack5

```js
const AutoDllPlugin = require('auto-dll-plugin')
const webpckConfig = {
  mode: 'development'
  plugins: [
		new AutoDllPlugin({
      modules: ['vue']
    })
	]
}
```
# options

Basic options

| name    | use                                       | type                                | default |
| ------- | ----------------------------------------- | ----------------------------------- | ------- |
| modules | Used to set up the module to be processed | string/array                        | []      |