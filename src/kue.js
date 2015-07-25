var obserable = require("./obserable.js")
var parser = require("./parser.js")

function Kue() {
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App")
}

function compileNode(node) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    var children = node.childNodes;
    compileAttr(node)
    for(var i = 0, len = children.length; i < len; i++) {
      var el = children[i]
      compileNode(el)
    }
  } if (node.nodeType === 3) {
    //console.log('text', node);
    linkText(node, vm)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node) {
  var attrs = node.attributes;
  for (var i = 0, len = attrs.length; i < len; i++) {
    //console.log('attr', attrs[i])
  }
}

function linkText(textNode, vm) {
  var exps = parser.getExps(textNode.textContent)
  if (exps && exps.length) {
    console.log(exps);
  }
}

compileNode(document.getElementById("jerry"))
