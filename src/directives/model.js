var $ = require("../dom")

var fns = {}

fns["text"] = {
  bind: function(ele, attr, component, dir) {
    this.update(ele, attr, component, dir)
    $(ele).on("input", updateVM)
    $(ele).on("keyup", updateVM)
    function updateVM() {
      var name = dir.replace(/\(\)/g, "")
      var state = {}
      state[name] = ele.value
      component.scope.update(state)
    }
  },
  update: function(ele, attr, component, dir) {
    var name = dir.replace(/\(\)/g, "")
    ele.value = component.scope.state[name]
  }
}

fns["checkbox"] = {
  bind: function(ele, attr, component, dir) {
    var $ele = $(ele)
    this.update(ele, attr, component, dir)
    $ele.on("click", function() {
      var name = dir.replace(/\(\)/g, "")
      if (ele.checked) {
        var value = true
      } else {
        var value = false
      }
      var state = {}
      state[name] = value
      component.scope.update(state)
    })
  },
  update: function(ele, attr, component, dir) {
    var name = dir.replace(/\(\)/g, "")
    var $ele = $(ele)
    if (component.scope.state[name]) {
      $ele.attr("checked", "checked")
    } else {
      $ele.removeAttr("checked")
    }
  }
}

module.exports = {
  bind: function(ele, attr, component, dir) {
    var type = $(ele).attr("type") || "text"
    if (type === "textarea") type = "text"
    fns[type].bind(ele, attr, component, dir)
  },
  update: function(ele, attr, component, dir) {
    var type = $(ele).attr("type") || "text"
    if (type === "textarea") type = "text"
    fns[type].update(ele, attr, component, dir)
  }
}
