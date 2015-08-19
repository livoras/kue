var _ = require("./util")
var EventEmitter = require("./event-emitter")
var objectPath = require("./object-path")

function Scope(path, state, parentScope) {
  this.currentPath = path
  this.state = state
  this.watchPaths = {} // for unmouting
  this.subScopes = []

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
  var watchPath = objectPath.join([this.currentPath, path])
  var pathLocalStore = this.watchPaths[path]
  if (pathLocalStore) {
    pathLocalStore.push(fn)
  } else {
    this.watchPaths[path] = [fn]
  }
  this.$root.emitter.on(watchPath, fn)
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
  return this.state[token] || this.extra[token] || ""
}

pro.getObjectByPath = function(path) {
  return objectPath.getObjectByPath(this.state, path)
}

module.exports = Scope
