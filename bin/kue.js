(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = {}

config.prefix = "{"
config.suffix = "}"

module.exports = config
},{}],2:[function(require,module,exports){
var obserable = require("./obserable.js")
var parser = require("./parser.js")

function Kue() {
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App")
}

function compileNode(node) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    var children = node.childNodes;
    compileAttr(node)
    for(var i = 0, len = children.length; i < len; i++) {
      var el = children[i]
      compileNode(el)
    }
  } if (node.nodeType === 3) {
    //console.log('text', node);
    linkText(node, vm)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node) {
  var attrs = node.attributes;
  for (var i = 0, len = attrs.length; i < len; i++) {
    //console.log('attr', attrs[i])
  }
}

function linkText(textNode, vm) {
  var exps = parser.getExps(textNode.textContent)
  if (exps && exps.length) {
    console.log(exps);
  }
}

compileNode(document.getElementById("jerry"))

},{"./obserable.js":3,"./parser.js":4}],3:[function(require,module,exports){
var _ = require("./util.js")

function ObserableAttr(attr) {
  var that = this
  this.value = attr
  this.watchers = []
  function getOrSet(attr) {
    if (arguments.length === 0) {
      return that.value
    }
    that.value = attr
    that.notify()
  }
  getOrSet.$$ = that
  return getOrSet
}

ObserableAttr.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that)
  })
}

ObserableAttr.prototype.watch = function(fn) {
  this.watchers.push(fn)
}

function ObserableArray(arr) {
  
}

function obserable(obj) {
  if (!_.isArray(obj)) {
    return new ObserableAttr(obj)
  } else {
    return new ObserableArray(obj)
  }
}

module.exports = obserable

},{"./util.js":5}],4:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var exports = {}

exports.getExps = function(text) {
  var EXP_REG = new RegExp("\\" + config.prefix + "[\\S\\s]+?" + "\\" + config.suffix, 'g')
  var REMOVE_REG = new RegExp("\\" + config.prefix + "|" + "\\" + config.suffix, 'g')
  var results = text.match(EXP_REG)
  if (!results) return []
  var exps = []
  _.each(results, function(rawExp) {
    exps.push(rawExp.replace(REMOVE_REG, ""))
  })
  return exps
}

module.exports = exports
},{"./config":1,"./util":5}],5:[function(require,module,exports){
exports.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

exports.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

exports.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i])
  }
}
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZmFrZV8zZTQ3ZmYzZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0ge31cblxuY29uZmlnLnByZWZpeCA9IFwie1wiXG5jb25maWcuc3VmZml4ID0gXCJ9XCJcblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWciLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJhYmxlLmpzXCIpXG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyLmpzXCIpXG5cbmZ1bmN0aW9uIEt1ZSgpIHtcbn1cblxudmFyIHZtID0ge1xuICBuYW1lOiBvYnNlcmFibGUoXCJKZXJyeVwiKSxcbiAgYXBwOiBvYnNlcmFibGUoXCJLdWUgQXBwXCIpXG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVOb2RlKG5vZGUpIHtcbiAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdlbGUnLCBub2RlKVxuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICBjb21waWxlQXR0cihub2RlKVxuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgZWwgPSBjaGlsZHJlbltpXVxuICAgICAgY29tcGlsZU5vZGUoZWwpXG4gICAgfVxuICB9IGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgLy9jb25zb2xlLmxvZygndGV4dCcsIG5vZGUpO1xuICAgIGxpbmtUZXh0KG5vZGUsIHZtKVxuICAgIC8vbm9kZS50ZXh0Q29udGVudCA9IFwiamVycnkgaXMgZ29vZFwiXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZUF0dHIobm9kZSkge1xuICB2YXIgYXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIC8vY29uc29sZS5sb2coJ2F0dHInLCBhdHRyc1tpXSlcbiAgfVxufVxuXG5mdW5jdGlvbiBsaW5rVGV4dCh0ZXh0Tm9kZSwgdm0pIHtcbiAgdmFyIGV4cHMgPSBwYXJzZXIuZ2V0RXhwcyh0ZXh0Tm9kZS50ZXh0Q29udGVudClcbiAgaWYgKGV4cHMgJiYgZXhwcy5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmxvZyhleHBzKTtcbiAgfVxufVxuXG5jb21waWxlTm9kZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImplcnJ5XCIpKVxuIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUF0dHIoYXR0cikge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgdGhpcy52YWx1ZSA9IGF0dHJcbiAgdGhpcy53YXRjaGVycyA9IFtdXG4gIGZ1bmN0aW9uIGdldE9yU2V0KGF0dHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoYXQudmFsdWVcbiAgICB9XG4gICAgdGhhdC52YWx1ZSA9IGF0dHJcbiAgICB0aGF0Lm5vdGlmeSgpXG4gIH1cbiAgZ2V0T3JTZXQuJCQgPSB0aGF0XG4gIHJldHVybiBnZXRPclNldFxufVxuXG5PYnNlcmFibGVBdHRyLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVBdHRyLnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHRoaXMud2F0Y2hlcnMucHVzaChmbilcbn1cblxuZnVuY3Rpb24gT2JzZXJhYmxlQXJyYXkoYXJyKSB7XG4gIFxufVxuXG5mdW5jdGlvbiBvYnNlcmFibGUob2JqKSB7XG4gIGlmICghXy5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUF0dHIob2JqKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlQXJyYXkob2JqKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb2JzZXJhYmxlXG4iLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBleHBvcnRzID0ge31cblxuZXhwb3J0cy5nZXRFeHBzID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgRVhQX1JFRyA9IG5ldyBSZWdFeHAoXCJcXFxcXCIgKyBjb25maWcucHJlZml4ICsgXCJbXFxcXFNcXFxcc10rP1wiICsgXCJcXFxcXCIgKyBjb25maWcuc3VmZml4LCAnZycpXG4gIHZhciBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChcIlxcXFxcIiArIGNvbmZpZy5wcmVmaXggKyBcInxcIiArIFwiXFxcXFwiICsgY29uZmlnLnN1ZmZpeCwgJ2cnKVxuICB2YXIgcmVzdWx0cyA9IHRleHQubWF0Y2goRVhQX1JFRylcbiAgaWYgKCFyZXN1bHRzKSByZXR1cm4gW11cbiAgdmFyIGV4cHMgPSBbXVxuICBfLmVhY2gocmVzdWx0cywgZnVuY3Rpb24ocmF3RXhwKSB7XG4gICAgZXhwcy5wdXNoKHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpKVxuICB9KVxuICByZXR1cm4gZXhwc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMiLCJleHBvcnRzLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufSJdfQ==
