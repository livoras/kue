var config = require("./config")
var _ = require("./util")
var parser = require("./parser")
var directives = require("./directives")

exports.bindText = function(textNode, component) {
  var text = textNode.textContent || textNode.nodeValue // fuck IE7, 8
  var expressions = parser.parse(text)
  function writeResult() {
    var textTpl = text
    _.each(expressions, function(expression) {
      var result = parser.exec(expression, component.scope)
      textTpl = textTpl.replace(expression.rawExp, result)
    })
    if (textNode.nodeValue) {
      textNode.nodeValue = textTpl
    } else {
      textNode.textNode = textTpl
    }
  }
  writeResult()
  watchAllTokens(expressions, component, writeResult)
}

function watchAllTokens(expressions, component, fn) {
  _.each(expressions, function(expression) {
    _.each(expression.paths, function(path) {
      component.scope.watch(path, fn)
    })
  })
}

exports.bindDir = function(attr, node, component) {
  var dirName = getDirName(attr)
  if(!dirName) return
  if(!directives[dirName]) {
    throw new Error("Directive `" + dirName + "` is not found.")
  }
  var directive = parser.parseDirective(attr.value)
  var paths = getTokensAndPathsFromDirective(directive).paths
  var dirObj = directives[dirName]
  dirObj.bind(node, attr, component, directive)
  if (inNotUpdateList(dirName)) return
  _.each(paths, function(path) {
    component.scope.watch(path, function() {
      dirObj.update(node, attr, component, directive)
    })
  })
}

function getTokensAndPathsFromDirective(directive) {
  if (_.isString(directive)) {
    return parser.parseTokensAndPaths(directive)
  } else {
    var allDirsStr = ""
    for (key in directive) {
      allDirsStr += directive[key]
    }
    return parser.parseTokensAndPaths(allDirsStr)
  }
}

function getDirName(attr) {
  var DIR_REG = new RegExp(("^" + config.directivePrefix + "-" + "([\\w\\d]+)"))
  var results = attr.name.match(DIR_REG)
  if(results) {
    return results[1]
  }
  return void 666
}

function inNotUpdateList(name) {
  var list = ["component"]
  for (var i = 0, len = list.length; i < len; i++) {
    if (list[i] === name) {
      return true
    }
  }
  return false
}

exports.getTokensAndPathsFromDirective = getTokensAndPathsFromDirective
