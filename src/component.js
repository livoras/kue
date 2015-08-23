var _ = require("./util")
var compiler = require("./compiler")
var objectPath = require("./object-path")
var parser = require("./parser")
var $ = require("./dom")
var EventEmitter = require("./event-emitter")
var Scope = require("./scope")
var common = require("./common")
var register = require("./register")
var components = common.components

var componentMethods = {
  init: function(options, config, componentOpts) {
    config = config || _.extend(true, {}, defaultComponentConfig)
    this.el = options.el || $.getDOMNodeFromTemplate(componentOpts.template)
    this.state = options.state
    this.parent = config.parent
    var parentScope = config.parent.scope
    this.scope = new Scope(config.currentPath, this.state, parentScope)
    this.scope.extra = config.extra || {}
    this.scope.extra.$this = this
    delete options.el // FUCK IE7
    _.extend(this, options)
    var $el = $(this.el)
    $el.addClass("wet-compiling")
    compiler.compile(this.el, this)
    $el.removeClass("wet-compiling")
  },
  update: function(newState) {
    this.scope.update(newState)
  },
  updateArray: function() {
    return this.scope.updateArray.apply(this.scope, arguments)
  },
  callMethod: function(method, args) {
    var current = this
    while(current && !current[method]) {
      current = current.parent
    }
    if(current && current[method]) {
      current[method].apply(current, args)
    } else {
      _.error("method `" + method + "` is not found.")
    }
  }
}

var defaultComponentConfig = {
  currentPath: "",
  parent: { // parent component
    emit: function() {/* In case of root*/},
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
    if (!componentOpts.notEmitter) {
      EventEmitter.call(this)
    }
    this.init(options, config, componentOpts)
  }
  register(componentName, Component)
  var pro = Component.prototype
  if (!componentOpts.notEmitter) {
    _.extend(pro, EventEmitter.prototype)
  }
  _.extend(pro, componentMethods)
  _.of(componentOpts, function(key, value) {
    if(_.isFunction(value)) {
      pro[key] = value
    }
  })
  return Component
}
