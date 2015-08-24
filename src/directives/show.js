var $ = require("../dom")
var parser = require("../parser")

module.exports = {
  bind: function(ele, attr, component) {
    this.update(ele, attr, component)
  },
  update: function(ele, attr, component) {
    var tokensAndPaths = parser.parseTokensAndPaths(attr.value)
    var isShow = parser.exec({
        exp: attr.value,
        tokens: tokensAndPaths.tokens,
        paths: tokensAndPaths.paths
    }, component.scope)
    var $el = $(ele)
    if (isShow) {
      $el.show()
    } else {
      $el.hide()
    }
  }
}
