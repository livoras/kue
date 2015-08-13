var $ = require("../dom")
var parser = require("../parser")

module.exports = {
  bind: function(ele, attr, kue, dir) {
    this.update(ele, attr, kue, dir)
  },
  update: function(ele, attr, kue, dir) {
    // TODO: should cache tokens and just rereload className
    // which has modified tokens.
    var $el = $(ele)
    for (var className in dir) {
      var shouldHasClass = parser.exec({
          exp: dir[className],
          tokens: parser.parseTokens(dir[className])
      }, kue.vm)
      if (shouldHasClass) {
        $el.addClass(className)
      } else {
        $el.removeClass(className)
      }
    }
  }
}
