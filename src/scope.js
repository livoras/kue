var _ = require("./util")
var EventEmitter = require("./event-emitter")
var objectPath = require("./object-path")
var config = require("./config")
var ArrayFactory = require("./array-factory")

function Scope(path, state, parentScope) {
  this.currentPath = path
  this.state = state
  this.watchPaths = {} // for unmouting
  this.subScopes = []
  this.parentScope = parentScope

  if (parentScope && parentScope.$root && path) {
    this.$root = parentScope.$root
    parentScope.subScopes.push(this)
  } else {
    this.$root = this
    this.emitter = new EventEmitter
  }
}

var pro = Scope.prototype

pro.update = function(newState) {
  var self = this
  var paths = objectPath.makePathsOfObj(newState)
  _.update(this.state, newState)
  _.each(paths, function(path) {
    var obj = self.getObjectByPath(path)
    var fullPath = objectPath.join([self.currentPath, path])
    if (_.isArray(obj)) {
      fullPath = config.arrayEventPrefix + ":replace:" + fullPath
    }
    self.$root.broadcast(fullPath)
  })
}

pro.updateArray = function(path) {
  var arr = this.getObjectByPath(path)
  if (!_.isArray(arr)) _.error(path + " is not an array")
  return new ArrayFactory(arr, path, this)
}

pro.watchArray = function(path, fn) {
  var arr = this.getObjectByPath(path)
  if (!_.isArray(arr)) _.error(path + " is not an array")
  var arrMethods = [
    "replace",
    "pop",
    "push",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
  ]
  var self = this
  _.each(arrMethods, function(method) {
    var eventName = objectPath.makeArrayEvent(method, path)
    var func = function() {
      var params = [].slice.call(arguments, 0)
      fn(method, params)
    }
    self.$root.emitter.on(eventName, func)
    self.addLocalWatchPath(eventName, func)
  })
}

pro.broadcast = function(changePath) {
  if (!this.emitter) return _.error("I am not a root!")

  if(isArrayEvent(changePath)) {
    this.$root.emitter.emit(changePath)
    var arrayPath = changePath.split(":")[2]
    // 触发数组中子元素的事件
    // TODO: 不要触发无关的子元素事件。例如，pop掉了最后一个，不要触发第一个的事件。
    for (var evenName in this.emitter.events) {
      if(_.startsWith(evenName, arrayPath) && (
         evenName.length > arrayPath.length)) { // 只触发真子元素
        this.emitter.emit(evenName)
      }
    }
    changePath = arrayPath
  }

  // 触发父对象的事件
  var steps = objectPath.makeStepsFromPath(changePath)
  var self = this
  _.each(steps, function(path) {
    self.$root.emitter.emit(path)
  })
}

function isArrayEvent(name) {
  return _.startsWith(name, config.arrayEventPrefix)
}

pro.watch = function(path, fn) {
  var scopeAndPath = this.getScopeAndWatchPath(path)
  var watchPath = scopeAndPath.watchPath
  this.addLocalWatchPath(path, fn)
  this.$root.emitter.on(watchPath, fn)
}

pro.addLocalWatchPath = function(path, fn) {
  var pathLocalStore = this.watchPaths[path]
  if (pathLocalStore) {
    pathLocalStore.push(fn)
  } else {
    this.watchPaths[path] = [fn]
  }
}

pro.getScopeAndWatchPath = function(path) {
  path = objectPath.makePathFromRawPath(path)
  var firstProp = objectPath.getFirstProp(path)
  var scope = this.getRightScopeByToken(firstProp)
  var watchPath = objectPath.join([scope.currentPath, path])
  return {
    scope: scope,
    watchPath: watchPath
  }
}

pro.getRightScopeByToken = function(token) {
  var scope = this
  while(scope.currentPath != ""
        && _.isUndefined(scope.state[token])
        && _.isUndefined(scope.extra[token])) {
    scope = scope.parentScope
  }
  return !_.isUndefined(scope.state[token])
    ? scope
    : this
}

pro.removeSubScope = function(scope) {
  var scopes = this.subScopes
  for(var i = 0, len = scopes.length; i < len; i++) {
    if (scopes[i] === scope) {
      unwatch(scope)
      return scopes.splice(i, 1)
    }
  }
}

function unwatch(scope) {
  // TODO: Test this functionality
  var watchPaths = scope.watchPaths
  var root = scope.$root
  for (var path in watchPaths) {
    _.each(watchPaths[path], function(fn) {
      var fullPath = objectPath.join([scope.currentPath, path])
      root.emitter.off(fullPath, fn)
    })
  }
}

pro.get = function(token) {
  var scope = this.getRightScopeByToken(token)
  var value = scope.state[token] || scope.extra[token]
  return _.isUndefined(value)
    ? ""
    : value
}

pro.getObjectByPath = function(path) {
  path = objectPath.makePathFromRawPath(path)
  var token = objectPath.getFirstProp(path)
  var scope = this.getRightScopeByToken(token)
  return objectPath.getObjectByPath(scope.state, path)
}

module.exports = Scope
