function Kue() {
}

function compileNode(node) {
    if (node.nodeType === 1) {
      console.log('ele', node)
      var children = node.childNodes;
      compileAttr(node)
      for(var i = 0, len = children.length; i < len; i++) {
        var el = children[i]
        compileNode(el)
      }
    } if (node.nodeType === 3) {
      console.log('text', node);
      linkText(node, vm)
      //node.textContent = "jerry is good"
    }
}

function compileAttr(node) {
  var attrs = node.attributes;
  for (var i = 0, len = attrs.length; i < len; i++) {
    console.log('attr', attrs[i])
  }
}
compileNode(document.getElementById("jerry"))
