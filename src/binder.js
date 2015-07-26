var config = require("./config")
var _ = require("./util")
var parser = require("./parser")
var directives = require("./directives")

exports.bindText = function(textNode, kue) {
  var vm = kue.vm
  var text = textNode.textContent
  var expressions = parser.parse(text)
  function writeResult() {
    var textTpl = text
    _.each(expressions, function(expression) {
      var result = parser.exec(expression, vm)
      textTpl = textTpl.replace(expression.rawExp, result)
    })
    textNode.textContent = textTpl
  }
  writeResult()
  watchAllTokenrs(expressions, kue, writeResult)
}

function watchAllTokenrs(expressions, kue, fn) {
  var vm = kue.vm
  var tokens = {}
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      if (tokens[token]) return
      tokens[token] = 1
    })
  })

  for(token in tokens) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) continue
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

exports.bindDir = function(attr, node, vm) {
  var dirName = getDirName(attr)
  if(!dirName) return
  if(!directives[dirName]) {
    throw new Error("Directive" + dirName + " is not found.")
  }
  console.log(attr.name, dirName, directives)
}

function getDirName(attr) {
  var DIR_REG = new RegExp(("^" + config.directivePrefix + "-" + "([\\w\\d]+)"))
  var results = attr.name.match(DIR_REG)
  if(results) {
    return results[1]
  }
  return void 666
}