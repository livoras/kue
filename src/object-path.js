var _ = require("./util")
var config = require("./config")

exports.getFirstProp = function(path) {
  var FIRST_PROP_REG = /(^[\w_\$][\w\$_]+)([\.\[\]])?/
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

exports.makePathsOfObj = function(obj) {
  var paths = []
  _.of(obj, processKey)
  function processKey(key, obj, prevPath) {
    var currentPath = exports.join([prevPath, key])
    if (_.isObject(obj)) {
      _.of(obj, function(key, obj) {
        processKey(key, obj, currentPath)
      })
    } else {
      paths.push(currentPath)
    }
  }
  return paths
}

exports.join = function(paths) {
  var allPath = ""
  _.each(paths, function(path, i) {
    if (_.isUndefined(path) || (_.isString(path) && path.length === 0)) return
    allPath = (allPath.length === 0)
      ? path
      : allPath + ("." + path)
  })
  return allPath
}

exports.getObjectByPath = function(obj, path) {
  var props = path.split(".")
  var currentObj = obj
  _.each(props, function(prop) {
    currentObj = currentObj[prop]
  })
  return currentObj
}

exports.makeObjectByPath = function(path, value) {
  var rootObj = {}
  var obj = rootObj
  path = exports.makePathFromRawPath(path)
  var props = path.split(".")
  var lastIdx = props.length - 1
  _.each(props, function(prop, i) {
    if (i !== lastIdx) {
      obj = obj[prop] = {}
    } else {
      obj[prop] = value
    }
  })
  return rootObj
}

exports.makeArrayEvent = function (method, path) {
  return config.arrayEventPrefix + ":" + method + ":" + path
}
