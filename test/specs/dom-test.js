describe("Test DOM", function() {
  function compileNode(node) {
    //console.log(node.nodeType);
    if (node.nodeType === 1) {
      var children = node.childNodes;
      for(var i = 0, len = children.length; i < len; i++) {
        var el = children[i]
        compileNode(el)
      }
    } if (node.nodeType === 3) {
      //console.log(node.innerHTML);
      //compileNode(node)
    }
  }
  it("should iterate all dom nodes", function() {
    //var tpl = require("../fixtures/tpl.html");
    var tpl = "<div id='main'>{name}<ul><li k-repeat='todos'>{name}</li></ul></div>"
    var dom = document.createElement("div")
    dom.innerHTML = tpl;
    compileNode(dom)
  })
})
