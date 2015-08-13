var $ = require("../dom")
var parser = require("../parser")

module.exports = {
  bind: function(ele, attr, kue, dir) {
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
  },
  update: function(ele, attr, kue, dir, modifiedToken) {
    var classStr = ele
    var $el = $(ele)
  }
}
