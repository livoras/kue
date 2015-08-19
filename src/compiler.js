var _ = require("./util")
var obserable = require("./obserable")
var binder = require("./binder")
var $ = require("./dom")
var config = require("./config")
var prefix = config.directivePrefix

function compileNode(node, component) {
  if (node.nodeType === 1) {
    compileAttr(node, component)
    if ($(node).attr(prefix + "-repeat")) return
    _.each(node.childNodes, function(node) {
      compileNode(node, component)
    })
  } else if (node.nodeType === 3) {
    binder.bindText(node, component)
  }
}

function compileAttr(node, component) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    binder.bindDir(attr, node, component)
  })
}

exports.compile = compileNode
