var _ = require("../util")
var objectPath = require("../object-path")
var components = require("../common").components

module.exports = {
  bind: function(ele, attr, component, dir) {
    var componentNameAndStateName = attr.value.split(":")
    var componentName = _.trim(componentNameAndStateName[0])
    var stateName = _.trim(componentNameAndStateName[1])
    if (!components[componentName]) {
      _.error("Component `" + componentName + "` is not found.")
    }
    var Component = components[componentName]
    var state = objectPath.getObjectByPath(component.state, stateName)
    var subComponent = new Component({state: state}, {
      parent: component,
      currentPath: objectPath.join([
        component.scope.currentPath,
        stateName]
      )
    })
    // Don't make component content interupt compilation.
    _.nextTick(function() {
      ele.innerHTML = ""
      ele.appendChild(subComponent.el)
    })
  }
}
