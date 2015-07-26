var _ = require("./util")
var obserable = require("./obserable")
var parser = require("./parser")

function Kue() {
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App")
}

function compileNode(node) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    compileAttr(node)
    _.each(node.childNodes, compileNode)
  } if (node.nodeType === 3) {
    //console.log('text', node);
    linkText(node, vm)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    //console.log('');
  })
}

function watchAllTokenrs(expressions, vm, fn) {
  var tokens = {}
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      if (tokens[token]) return
      tokens[token] = 1
    })
  })

  for(token in tokens) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) return
    if (isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

function isObserable(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

function linkText(textNode, vm) {
  window.textNode = textNode
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
  watchAllTokenrs(expressions, vm, writeResult)
}

window.vm = vm
compileNode(document.getElementById("jerry"))
