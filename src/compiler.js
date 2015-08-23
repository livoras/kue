var _ = require("./util")
var binder = require("./binder")
var $ = require("./dom")
var config = require("./config")
var prefix = config.directivePrefix

function compileNode(node, component) {
  if (node.nodeType === 1) {
    compileAttr(node, component)
    if ($(node).attr(prefix + "-ignore")) return
    var nodes = toArray(node.childNodes)
    _.each(nodes, function(node) {
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

function toArray(nodes) {
  var ret = []
  _.each(nodes, function(node) {
    ret.push(node)
  })
  return ret
}

exports.compile = compileNode
