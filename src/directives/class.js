var $ = require("../dom")
var parser = require("../parser")

module.exports = {
  bind: function(ele, attr, component, dir) {
    this.update(ele, attr, component, dir)
  },
  update: function(ele, attr, component, dir) {
    // TODO: should cache tokens and just rereload className
    // which has modified tokens.
    var $el = $(ele)
    for (var className in dir) {
      var tokensAndPaths = parser.parseTokensAndPaths(dir[className])
      var shouldHasClass = parser.exec({
          exp: dir[className],
          tokens: tokensAndPaths.tokens,
          paths: tokensAndPaths.paths
      }, component.state)
      if (shouldHasClass) {
        $el.addClass(className)
      } else {
        $el.removeClass(className)
      }
    }
  }
}
