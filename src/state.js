var _ = require("./util")
var EventEmitter = require("./event-emitter")
var objectPath = require("./object-path")

function State(path, model, $root) {
  EventEmitter.call(this)
  this.$root = $root || this
  this.currentPath = path
  this.model = model
  this.watchPaths = this.events
  this.subStates = []
}

var pro = _.extend(State.prototype, EventEmitter.prototype)

pro.update = function(newModel) {
  var self = this
  var paths = objectPath.makePathsOfObj(newModel)
  _.extend(true, this.model, newModel)
  _.each(paths, function(path) {
    var fullPath = objectPath.join([self.currentPath, path])
    self.$root.deliverChange(fullPath)
  })
}

pro.deliverChange = function(changePath) {
  if (!isSubPath(this.currentPath, changePath)) return
  this.emitCurrentWatchers(changePath)
  this.deliverChangeToSubStates(changePath)
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

pro.deliverChangeToSubStates = function(changePath) {
  _.each(this.subStates, function(state) {
    if (isSubPath(state.currentPath, changePath)) {
      state.deliverChange(changePath)
    }
  })
}

function isSubPath(parentPath, childPath) {
  return _.startsWith(childPath, parentPath)
}

module.exports = State
