var _ = require("./util")

function EventEmitter() {
  this.events = {}
}

var pro = EventEmitter.prototype

pro.on = function(name, callback) {
  if (!this.events[name]) {
    this.events[name] = [callback]
  } else {
    this.events[name].push(callback)
  }
}

pro.emit = function(name) {
  var callbacks = this.events[name]
  if (!callbacks) return
  var params = [].slice.call(arguments, 1)
  _.each(callbacks, function(callback) {
    callback.apply(callback, params)
  })
}

pro.off = function(name, callback) {
  var callbacks = this.events[name]
  if (!callbacks) return
  for (var i = 0, len = callbacks.length; i < len; i++) {
    if (callbacks[i] === callback) {
      callbacks.splice(i, 1)
      if (callbacks.length === 0) {
        delete this.events[name]
      }
    }
  }
}

module.exports = EventEmitter
