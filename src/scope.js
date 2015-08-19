var _ = require("./util")
var EventEmitter = require("./event-emitter")
var objectPath = require("./object-path")

function Scope(path, state, parentScope) {
  EventEmitter.call(this)
  if (parentScope && parentScope.$root) {
    this.$root = parentScope.$root
    parentScope.subScopes.push(this)
  } else {
    this.$root = this
  }
  this.currentPath = path
  this.state = state
  this.watchPaths = this.events
  this.subScopes = []
}

var pro = _.extend(Scope.prototype, EventEmitter.prototype)

pro.update = function(newState) {
  var self = this
  var paths = objectPath.makePathsOfObj(newState)
  _.update(this.state, newState)
  _.each(paths, function(path) {
    var fullPath = objectPath.join([self.currentPath, path])
    self.$root.deliverChange(fullPath)
  })
}

pro.deliverChange = function(changePath) {
  if (!isSubPath(this.currentPath, changePath)) return
  this.emitCurrentWatchers(changePath)
  this.deliverChangeToSubScopes(changePath)
}

pro.emitCurrentWatchers = function(changePath) {
  var watchPaths = this.watchPaths
  for (var watchPath in watchPaths) {
    if(isSubPath(watchPath, changePath)) {
      this.emit(watchPath)
    }
  }
}

pro.watch = function(path, fn) {
  var watchPath = objectPath.join([this.currentPath, path])
  this.on(watchPath, fn)
}

pro.removeSubScope = function(scope) {
  var scopes = this.subScopes
  for(var i = 0, len = scopes; i < len; i++) {
    if (scopes[i] === scope) {
      return scopes.splice(i, 1)
    }
  }
}

pro.deliverChangeToSubScopes = function(changePath) {
  _.each(this.subScopes, function(state) {
    if (isSubPath(state.currentPath, changePath)) {
      state.deliverChange(changePath)
    }
  })
}

pro.get = function(token) {
  return this.state[token] || this.extra[token] || ""
}

pro.getObjectByPath = function(path) {
  return objectPath.getObjectByPath(this.state, path)
}

function isSubPath(parentPath, childPath) {
  return _.startsWith(childPath, parentPath)
}

module.exports = Scope
