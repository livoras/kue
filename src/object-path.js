var _ = require("./util")

exports.getFirstProp = function(path) {
  var FIRST_PROP_REG = /(^[\w_][\w$_]+)([\.\[\]])?/
  return path.match(FIRST_PROP_REG)[1]
}

exports.makePathFromRawPath = function(rawPath) {
  var REPLACE_DOT = /(\[)|(\](\.)?)/g
  return rawPath.replace(REPLACE_DOT, ".").replace(/\.$/, "")
}

exports.makeStepsFromPath = function(path) {
  var props = path.split(".")
  var current = props[0]
  var steps = [current]
  _.each(props, function(prop, i) {
    if (i == 0) return
    current += ("." + prop)
    steps.push(current)
  })
  return steps
}
