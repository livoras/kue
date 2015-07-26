(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = {}

config.openTag = "{"
config.closeTag = "}"

module.exports = config
},{}],2:[function(require,module,exports){
var _ = require("./util")
var obserable = require("./obserable")
var parser = require("./parser")

function Kue() {
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App")
}

function compileNode(node) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    compileAttr(node)
    _.each(node.childNodes, compileNode)
  } if (node.nodeType === 3) {
    //console.log('text', node);
    linkText(node, vm)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    //console.log('');
  })
}

function watchAllTokenrs(expressions, vm, fn) {
  var tokens = {}
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      if (tokens[token]) return
      tokens[token] = 1
    })
  })

  for(token in tokens) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) return
    if (isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

function isObserable(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

function linkText(textNode, vm) {
  window.textNode = textNode
  var text = textNode.textContent
  var expressions = parser.parse(text)
  function writeResult() {
    var textTpl = text
    _.each(expressions, function(expression) {
      var result = parser.exec(expression, vm)
      textTpl = textTpl.replace(expression.rawExp, result)
    })
    textNode.textContent = textTpl
  }
  writeResult()
  watchAllTokenrs(expressions, vm, writeResult)
}

window.vm = vm
compileNode(document.getElementById("jerry"))

},{"./obserable":3,"./parser":4,"./util":5}],3:[function(require,module,exports){
var _ = require("./util.js")

function ObserableKey(attr) {
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

ObserableKey.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that)
  })
}

ObserableKey.prototype.watch = function(fn) {
  this.watchers.push(fn)
}

function ObserableArray(arr) {
  
}

function obserable(obj) {
  if (!_.isArray(obj)) {
    return new ObserableKey(obj)
  } else {
    return new ObserableArray(obj)
  }
}

obserable.ObserableKey = ObserableKey
obserable.ObserableArray = ObserableArray

module.exports = obserable

},{"./util.js":5}],4:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var exports = {}

var EXP_REG = new RegExp("\\" + config.openTag + "[\\S\\s]+?" + "\\" + config.closeTag, 'g')
var REMOVE_REG = new RegExp("\\" + config.openTag + "|" + "\\" + config.closeTag, 'g')

exports.getRawExps = function(text) {
  var results = text.match(EXP_REG) || []
  return results
}

exports.getExpFromRawExp = function(rawExp) {
  return rawExp.replace(REMOVE_REG, "")
}

/** 
 * Steal from Vue.js: 
 * https://github.com/yyx990803/vue/blob/dev/src/parsers/expression.js
 */
var KEYWORD_REG = /[_\w][_$\w\d]+/g
var ignoreKeywords =
  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
  'encodeURIComponent,parseInt,parseFloat'
var IGNORE_KEYWORDS_REG = 
  new RegExp('^(' + ignoreKeywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Parse text and return expressions.
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
  var rawExps = exports.getRawExps(text)
  var expressions = []
  _.each(rawExps, function(rawExp) {
    var exp = exports.getExpFromRawExp(rawExp)
    var candidates = exp.match(KEYWORD_REG) || []
    var tokens = []
    _.each(candidates, function(candidate) {
      if (IGNORE_KEYWORDS_REG.test(candidate)) return
      tokens.push(candidate)
    })
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens:tokens 
    }
    expressions.push(expression)
  })
  return expressions 
}

exports.exec = function(expression, vm) {
  var args = []
  var tokens = expression.tokens
  _.each(tokens, function(token) {
    args.push(vm[token])
  })
  var exp = "return " + expression.exp + ";"
  return (new Function(tokens, exp)).apply(vm, args)
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
exports.isUndefined = function(obj) {
  return obj === void 666;
};

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
exports.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  exports['is' + name] = function(obj) {
    return bject.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});


},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZmFrZV8xMWQ4NzdlYS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0ge31cblxuY29uZmlnLm9wZW5UYWcgPSBcIntcIlxuY29uZmlnLmNsb3NlVGFnID0gXCJ9XCJcblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWciLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcbnZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi9wYXJzZXJcIilcblxuZnVuY3Rpb24gS3VlKCkge1xufVxuXG52YXIgdm0gPSB7XG4gIG5hbWU6IG9ic2VyYWJsZShcIkplcnJ5XCIpLFxuICBhcHA6IG9ic2VyYWJsZShcIkt1ZSBBcHBcIilcbn1cblxuZnVuY3Rpb24gY29tcGlsZU5vZGUobm9kZSkge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgIC8vY29uc29sZS5sb2coJ2VsZScsIG5vZGUpXG4gICAgY29tcGlsZUF0dHIobm9kZSlcbiAgICBfLmVhY2gobm9kZS5jaGlsZE5vZGVzLCBjb21waWxlTm9kZSlcbiAgfSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgIC8vY29uc29sZS5sb2coJ3RleHQnLCBub2RlKTtcbiAgICBsaW5rVGV4dChub2RlLCB2bSlcbiAgICAvL25vZGUudGV4dENvbnRlbnQgPSBcImplcnJ5IGlzIGdvb2RcIlxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVBdHRyKG5vZGUpIHtcbiAgdmFyIGF0dHJzID0gbm9kZS5hdHRyaWJ1dGVzO1xuICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAvL2NvbnNvbGUubG9nKCcnKTtcbiAgfSlcbn1cblxuZnVuY3Rpb24gd2F0Y2hBbGxUb2tlbnJzKGV4cHJlc3Npb25zLCB2bSwgZm4pIHtcbiAgdmFyIHRva2VucyA9IHt9XG4gIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgIF8uZWFjaChleHByZXNzaW9uLnRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgIGlmICh0b2tlbnNbdG9rZW5dKSByZXR1cm5cbiAgICAgIHRva2Vuc1t0b2tlbl0gPSAxXG4gICAgfSlcbiAgfSlcblxuICBmb3IodG9rZW4gaW4gdG9rZW5zKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IHZtW3Rva2VuXVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKG9ic2VyYWJsZUtleSkpIHJldHVyblxuICAgIGlmIChpc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZm4pXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzT2JzZXJhYmxlKG9iaikge1xuICB2YXIgb2JqID0gb2JqLiQkXG4gIHJldHVybiAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUtleSkgfHxcbiAgICAgICAgIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkpXG59XG5cbmZ1bmN0aW9uIGxpbmtUZXh0KHRleHROb2RlLCB2bSkge1xuICB3aW5kb3cudGV4dE5vZGUgPSB0ZXh0Tm9kZVxuICB2YXIgdGV4dCA9IHRleHROb2RlLnRleHRDb250ZW50XG4gIHZhciBleHByZXNzaW9ucyA9IHBhcnNlci5wYXJzZSh0ZXh0KVxuICBmdW5jdGlvbiB3cml0ZVJlc3VsdCgpIHtcbiAgICB2YXIgdGV4dFRwbCA9IHRleHRcbiAgICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICAgIHZhciByZXN1bHQgPSBwYXJzZXIuZXhlYyhleHByZXNzaW9uLCB2bSlcbiAgICAgIHRleHRUcGwgPSB0ZXh0VHBsLnJlcGxhY2UoZXhwcmVzc2lvbi5yYXdFeHAsIHJlc3VsdClcbiAgICB9KVxuICAgIHRleHROb2RlLnRleHRDb250ZW50ID0gdGV4dFRwbFxuICB9XG4gIHdyaXRlUmVzdWx0KClcbiAgd2F0Y2hBbGxUb2tlbnJzKGV4cHJlc3Npb25zLCB2bSwgd3JpdGVSZXN1bHQpXG59XG5cbndpbmRvdy52bSA9IHZtXG5jb21waWxlTm9kZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImplcnJ5XCIpKVxuIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUtleShhdHRyKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICB0aGlzLnZhbHVlID0gYXR0clxuICB0aGlzLndhdGNoZXJzID0gW11cbiAgZnVuY3Rpb24gZ2V0T3JTZXQoYXR0cikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdC52YWx1ZVxuICAgIH1cbiAgICB0aGF0LnZhbHVlID0gYXR0clxuICAgIHRoYXQubm90aWZ5KClcbiAgfVxuICBnZXRPclNldC4kJCA9IHRoYXRcbiAgcmV0dXJuIGdldE9yU2V0XG59XG5cbk9ic2VyYWJsZUtleS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICBfLmVhY2godGhpcy53YXRjaGVycywgZnVuY3Rpb24od2F0Y2hlcikge1xuICAgIHdhdGNoZXIodGhhdC52YWx1ZSwgdGhhdClcbiAgfSlcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHRoaXMud2F0Y2hlcnMucHVzaChmbilcbn1cblxuZnVuY3Rpb24gT2JzZXJhYmxlQXJyYXkoYXJyKSB7XG4gIFxufVxuXG5mdW5jdGlvbiBvYnNlcmFibGUob2JqKSB7XG4gIGlmICghXy5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUtleShvYmopXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVBcnJheShvYmopXG4gIH1cbn1cblxub2JzZXJhYmxlLk9ic2VyYWJsZUtleSA9IE9ic2VyYWJsZUtleVxub2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5ID0gT2JzZXJhYmxlQXJyYXlcblxubW9kdWxlLmV4cG9ydHMgPSBvYnNlcmFibGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIGV4cG9ydHMgPSB7fVxuXG52YXIgRVhQX1JFRyA9IG5ldyBSZWdFeHAoXCJcXFxcXCIgKyBjb25maWcub3BlblRhZyArIFwiW1xcXFxTXFxcXHNdKz9cIiArIFwiXFxcXFwiICsgY29uZmlnLmNsb3NlVGFnLCAnZycpXG52YXIgUkVNT1ZFX1JFRyA9IG5ldyBSZWdFeHAoXCJcXFxcXCIgKyBjb25maWcub3BlblRhZyArIFwifFwiICsgXCJcXFxcXCIgKyBjb25maWcuY2xvc2VUYWcsICdnJylcblxuZXhwb3J0cy5nZXRSYXdFeHBzID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgcmVzdWx0cyA9IHRleHQubWF0Y2goRVhQX1JFRykgfHwgW11cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwID0gZnVuY3Rpb24ocmF3RXhwKSB7XG4gIHJldHVybiByYXdFeHAucmVwbGFjZShSRU1PVkVfUkVHLCBcIlwiKVxufVxuXG4vKiogXG4gKiBTdGVhbCBmcm9tIFZ1ZS5qczogXG4gKiBodHRwczovL2dpdGh1Yi5jb20veXl4OTkwODAzL3Z1ZS9ibG9iL2Rldi9zcmMvcGFyc2Vycy9leHByZXNzaW9uLmpzXG4gKi9cbnZhciBLRVlXT1JEX1JFRyA9IC9bX1xcd11bXyRcXHdcXGRdKy9nXG52YXIgaWdub3JlS2V5d29yZHMgPVxuICAnTWF0aCxEYXRlLHRoaXMsdHJ1ZSxmYWxzZSxudWxsLHVuZGVmaW5lZCxJbmZpbml0eSxOYU4sJyArXG4gICdpc05hTixpc0Zpbml0ZSxkZWNvZGVVUkksZGVjb2RlVVJJQ29tcG9uZW50LGVuY29kZVVSSSwnICtcbiAgJ2VuY29kZVVSSUNvbXBvbmVudCxwYXJzZUludCxwYXJzZUZsb2F0J1xudmFyIElHTk9SRV9LRVlXT1JEU19SRUcgPSBcbiAgbmV3IFJlZ0V4cCgnXignICsgaWdub3JlS2V5d29yZHMucmVwbGFjZSgvLC9nLCAnXFxcXGJ8JykgKyAnXFxcXGIpJylcblxuLyoqXG4gKiBQYXJzZSB0ZXh0IGFuZCByZXR1cm4gZXhwcmVzc2lvbnMuXG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgcmF3RXhwcyA9IGV4cG9ydHMuZ2V0UmF3RXhwcyh0ZXh0KVxuICB2YXIgZXhwcmVzc2lvbnMgPSBbXVxuICBfLmVhY2gocmF3RXhwcywgZnVuY3Rpb24ocmF3RXhwKSB7XG4gICAgdmFyIGV4cCA9IGV4cG9ydHMuZ2V0RXhwRnJvbVJhd0V4cChyYXdFeHApXG4gICAgdmFyIGNhbmRpZGF0ZXMgPSBleHAubWF0Y2goS0VZV09SRF9SRUcpIHx8IFtdXG4gICAgdmFyIHRva2VucyA9IFtdXG4gICAgXy5lYWNoKGNhbmRpZGF0ZXMsIGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgaWYgKElHTk9SRV9LRVlXT1JEU19SRUcudGVzdChjYW5kaWRhdGUpKSByZXR1cm5cbiAgICAgIHRva2Vucy5wdXNoKGNhbmRpZGF0ZSlcbiAgICB9KVxuICAgIHZhciBleHByZXNzaW9uID0ge1xuICAgICAgcmF3RXhwOiByYXdFeHAsXG4gICAgICBleHA6IGV4cCxcbiAgICAgIHRva2Vuczp0b2tlbnMgXG4gICAgfVxuICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbilcbiAgfSlcbiAgcmV0dXJuIGV4cHJlc3Npb25zIFxufVxuXG5leHBvcnRzLmV4ZWMgPSBmdW5jdGlvbihleHByZXNzaW9uLCB2bSkge1xuICB2YXIgYXJncyA9IFtdXG4gIHZhciB0b2tlbnMgPSBleHByZXNzaW9uLnRva2Vuc1xuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIGFyZ3MucHVzaCh2bVt0b2tlbl0pXG4gIH0pXG4gIHZhciBleHAgPSBcInJldHVybiBcIiArIGV4cHJlc3Npb24uZXhwICsgXCI7XCJcbiAgcmV0dXJuIChuZXcgRnVuY3Rpb24odG9rZW5zLCBleHApKS5hcHBseSh2bSwgYXJncylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzIiwiZXhwb3J0cy5tYXAgPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIHZhciByZXN1bHRzID0gW11cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjtpICsrKSB7XG4gICAgcmVzdWx0cy5wdXNoKGZuKGFycltpXSkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmbihhcnJbaV0pXG4gIH1cbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIG9iaiA9PT0gdm9pZCA2NjY7XG59O1xuXG4vKipcbiAqIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLCBpc0Vycm9yLlxuICogc3RlYWwgZnJvbSB1bmRlcnNjb3JlOiBodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9kb2NzL3VuZGVyc2NvcmUuaHRtbFxuICovXG5leHBvcnRzLmVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCcsICdFcnJvciddLCBmdW5jdGlvbihuYW1lKSB7XG4gIGV4cG9ydHNbJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGJqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICB9O1xufSk7XG5cbiJdfQ==
