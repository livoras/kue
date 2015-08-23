var _ = require("../util")
var objectPath = require("../object-path")
var components = require("../common").components

module.exports = {
  bind: function(ele, attr, component, dir) {
    var componentNameAndStateName = attr.value.split(":")
    var componentName = _.trim(componentNameAndStateName[0])
    var stateName = componentNameAndStateName[1]
      ? _.trim(componentNameAndStateName[1])
      : "$item"
    if (!components[componentName]) {
      _.error("Component `" + componentName + "` is not found.")
    }
    var Component = components[componentName]
    var state = component.scope.getObjectByPath(stateName)
    var path = (stateName === "$item")
      ? ""
      : stateName
    // Here to get method from parent component
    // TODO: to test
    // @NOTE: REMOVE FRO NO NESSCESSARY ACCESSING PARENT SCOPE FRO IGNORANT COMPONENT
    // function F() {}
    // F.prototype = component.constructor.prototype
    // var pro = new F()
    // _.extend(pro, Component.prototype)
    // Component.prototype = pro

    var subComponent = new Component({state: state}, {
      parent: component,
      currentPath: objectPath.join([component.scope.currentPath, path])
    })

    // Don't make component content interupt compilation.
    _.nextTick(function() {
      ele.innerHTML = ""
      ele.appendChild(subComponent.el)
    })
  }
}
