var _ = require("./util")
var EventEmitter = require("./event-emitter")
var objectPath = require("./object-path")

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
    var fullPath = objectPath.join([self.currentPath, path])
    self.$root.broadcast(fullPath)
  })
}

pro.broadcast = function(changePath) {
  if (!this.emitter) return _.error("I am not a root!")
  var steps = objectPath.makeStepsFromPath(changePath)
  var self = this
  _.each(steps, function(path) {
    self.emitter.emit(path)
  })
}

pro.watch = function(path, fn) {
  var scopeAndPath = this.getScopeAndWatchPath(path)
  var watchPath = scopeAndPath.watchPath
  var pathLocalStore = this.watchPaths[path]
  if (pathLocalStore) {
    pathLocalStore.push(fn)
  } else {
    this.watchPaths[path] = [fn]
  }
  this.$root.emitter.on(watchPath, fn)
}

pro.getScopeAndWatchPath = function(path) {
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
  // TODO: unwatch when remove scope
  var scopes = this.subScopes
  for(var i = 0, len = scopes; i < len; i++) {
    if (scopes[i] === scope) {
      return scopes.splice(i, 1)
    }
  }
}

pro.get = function(token) {
  var scope = this.getRightScopeByToken(token)
  return _.isUndefined(scope.state[token])
    ? ""
    : scope.state[token]
}

pro.getObjectByPath = function(path) {
  return objectPath.getObjectByPath(this.state, path)
}

module.exports = Scope
