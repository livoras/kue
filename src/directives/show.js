var $ = require("../dom")

module.exports = {
  bind: function(ele, attr, component) {
    this.update(ele, attr, component)
  },
  update: function(ele, attr, component) {
    var isShow = component.scope.state[attr.value]
    $(ele).css("display", isShow ? "block": "none")
  }
}
