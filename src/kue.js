var _ = require("./util")
var compiler = require("./compiler")
var objectPath = require("./object-path")
var parser = require("./parser")
var $ = require("./dom")
var EventEmitter = require("./event-emitter")
var Scope = require("./scope")
var components = require("./common").components

function Wat(options) {}

var componentMethods = {
  init: function(options, config, componentOpts) {
    config = config || _.extend(true, {}, defaultComponentConfig)
    this.el = $.getDOMNodeFromTemplate(componentOpts.template)
    this.state = options.state
    var parentScope = config.parent.scope
    this.scope = new Scope(config.currentPath, this.state, parentScope)
    compiler.compile(this.el, this)
  },
  update: function(newState) {
    this.scope.update(newState)
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

Wat.component = function(componentName, componentOpts) {
  var Component = function(options, config) {
    this.init(options, config, componentOpts)
  }
  var pro = Component.prototype
  _.extend(pro, componentMethods)
  components[componentName] = Component
  return Component
}

Wat.render = function(el, component) {
  el.innerHTML = ""
  el.appendChild(component.el)
}

require("./page-test")(Wat)
