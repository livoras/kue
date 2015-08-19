var $ = require("../dom")
var objectPath = require("../object-path")

var fns = {}

fns["text"] = {
  bind: function(ele, attr, component, dir) {
    this.update(ele, attr, component, dir)
    $(ele).on("input", updateVM)
    $(ele).on("keyup", updateVM)
    function updateVM() {
      var name = dir.replace(/\(\)/g, "")
      var path = objectPath.makePathFromRawPath(name)
      var obj = objectPath.makeObjectByPath(path, ele.value)
      var firstProp = objectPath.getFirstProp(path)
      var scope = component.scope.getRightScopeByToken(firstProp)
      scope.update(obj)
    }
  },
  update: function(ele, attr, component, dir) {
    var name = dir.replace(/\(\)/g, "")
    var path = objectPath.makePathFromRawPath(name)
    var firstProp = objectPath.getFirstProp(path)
    var scope = component.scope.getRightScopeByToken(firstProp)
    var newVal = scope.getObjectByPath(path)
    if (newVal !== ele.value) {
      ele.value = newVal
    }
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
