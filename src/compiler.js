var _ = require("./util")
var obserable = require("./obserable")
var binder = require("./binder")

function compileNode(node, kue) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    compileAttr(node, kue)
    _.each(node.childNodes, function(node) {
      compileNode(node, kue)
    })
  } if (node.nodeType === 3) {
    //console.log('text', node);
    binder.bindText(node, kue)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node, kue) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    binder.bindDir(attr, node, kue)
  })
}

exports.compile = compileNode
