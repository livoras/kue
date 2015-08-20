var _ = require("./util")
var compiler = require("./compiler")
var objectPath = require("./object-path")
var parser = require("./parser")
var $ = require("./dom")
var EventEmitter = require("./event-emitter")
var Scope = require("./scope")
var common = require("./common")
var components = common.components

var componentMethods = {
  init: function(options, config, componentOpts) {
    config = config || _.extend(true, {}, defaultComponentConfig)
    this.el = $.getDOMNodeFromTemplate(componentOpts.template)
    this.state = options.state
    var parentScope = config.parent.scope
    this.scope = new Scope(config.currentPath, this.state, parentScope)
    this.scope.extra = config.extra || {}
    compiler.compile(this.el, this)
  },
  update: function(newState) {
    this.scope.update(newState)
  },
  updateArray: function() {
    return this.scope.updateArray.apply(this.scope, arguments)
  }
}

var defaultComponentConfig = {
  currentPath: "",
  parent: { // parent component
    scope: {
      $root: null,
      currentPath: ""
    }
  }
}

common.component = module.exports = function(componentName, componentOpts) {
  var componentOpts = (arguments.length >= 2)
    ? componentOpts
    : componentName
  var Component = function(options, config) {
    this.init(options, config, componentOpts)
  }
  var pro = Component.prototype
  _.extend(pro, componentMethods)
  if (_.isString(componentName) && componentName.length > 0) {
    components[componentName] = Component
  }
  return Component
}
