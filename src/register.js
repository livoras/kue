var _ = require("./util")
var components = require("./common").components

module.exports = function(componentName, Component) {
  if (_.isString(componentName) && componentName.length > 0) {
    if (!components[componentName]) {
      components[componentName] = Component
      Component.componentName = componentName
    } else {
      return _.error("component name " + componentName + " has been used.")
    }
  }
}
