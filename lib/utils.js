exports.isString = val => typeof val === 'string'
exports.isArray = val => Array.isArray(val)

exports.assert = (judge, msg) => {
  if (!judge) {
		throw Error(msg)
	}
}