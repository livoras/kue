(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var parser = require("./parser")
var directives = require("./directives")

exports.bindText = function(textNode, kue) {
  var vm = kue.vm
  var text = textNode.textContent || textNode.nodeValue // fuck IE7, 8
  var expressions = parser.parse(text)
  function writeResult() {
    var textTpl = text
    _.each(expressions, function(expression) {
      var result = parser.exec(expression, vm)
      textTpl = textTpl.replace(expression.rawExp, result)
    })
    if (textNode.nodeValue) {
      textNode.nodeValue = textTpl
    } else {
      textNode.textNode = textTpl
    }
  }
  writeResult()
  watchAllTokens(expressions, kue, writeResult)
}

function watchAllTokens(expressions, kue, fn) {
  var vm = kue.vm
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      watchToken(token)
    })
  })

  function watchToken(token) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) return
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

exports.bindDir = function(attr, node, kue) {
  var dirName = getDirName(attr)
  if(!dirName) return
  if(!directives[dirName]) {
    throw new Error("Directive" + dirName + " is not found.")
  }
  var directive = parser.parseDirective(attr.value)
  var tokens = getTokensFromDirective(directive)
  var dirObj = directives[dirName]
  dirObj.bind(node, attr, kue)
  _.each(tokens, function(token) {
    var obserableKey = kue.vm[token]
    if (_.isUndefined(obserableKey)) return
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(function(newVal, oldVal, obserable) {
        dirObj.update(node, attr, kue)
      })
    }
  })
}

function getTokensFromDirective(directive) {
  if (_.isString(directive)) {
    return parser.parseTokens(directive)
  } else {
    var allTokens = []
    for (key in directive) {
      var tokens = parser.parseTokens(directive[key])
      allTokens.push.apply(allTokens, tokens)
    }
    return allTokens
  }
}

function getDirName(attr) {
  var DIR_REG = new RegExp(("^" + config.directivePrefix + "-" + "([\\w\\d]+)"))
  var results = attr.name.match(DIR_REG)
  if(results) {
    return results[1]
  }
  return void 666
}

exports.getTokensFromDirective = getTokensFromDirective
},{"./config":3,"./directives":4,"./parser":8,"./util":9}],2:[function(require,module,exports){
var _ = require("./util")
var obserable = require("./obserable")
var binder = require("./binder")

function compileNode(node, kue) {
  if (node.nodeType === 1) {
    compileAttr(node, kue)
    _.each(node.childNodes, function(node) {
      compileNode(node, kue)
    })
  } if (node.nodeType === 3) {
    binder.bindText(node, kue)
  }
}

function compileAttr(node, kue) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    binder.bindDir(attr, node, kue)
  })
}

exports.compile = compileNode

},{"./binder":1,"./obserable":7,"./util":9}],3:[function(require,module,exports){
var config = exports

config.openTag = "{"
config.closeTag = "}"
config.directivePrefix = "k"

},{}],4:[function(require,module,exports){
var $ = require("../dom")

exports["show"] = {
  bind: function(ele, attr, kue) {
    this.update(ele, attr, kue)
  },
  update: function(ele, attr, kue) {
    $(ele).css("display", kue.vm[attr.value]() ? "block": "none")
  }
}

},{"../dom":5}],5:[function(require,module,exports){
var $ = function(dom) {
  return {
    el: dom,
    attr: function(attr, name) {
      if (arguments.length === 1) {
        return this.el.getAttribute(attr)
      } else {
        this.el.setAttribute(attr, name)
      }
    },
    css: function(key, value) {
      if (arguments.length === 1) {
        this.el.style[key]
      } else {
        this.el.style[key] = value
      }
    }
  }
}

module.exports = $
},{}],6:[function(require,module,exports){
var _ = require("./util")
var compiler = require("./compiler")
var obserable = require("./obserable")
var parser = require("./parser")

function Kue(options) {
  this.el = document.getElementById(options.el)
  this.vm = options.vm
  this.methods = options.methods
  compiler.compile(this.el, this)
}

var vm = {
  name: obserable("Jerry"),
  app: obserable("Kue App"),
  isShow: obserable(true)
}

var app = new Kue({
  el: "jerry",
  vm: vm,
  methods: {
    onClick: function(event) {
      console.log("click!")
    }
  }
})

window.vm = vm
},{"./compiler":2,"./obserable":7,"./parser":8,"./util":9}],7:[function(require,module,exports){
var _ = require("./util.js")

function ObserableKey(attr) {
  var that = this
  this.value = attr
  this.watchers = []
  function getOrSet(attr) {
    if (arguments.length === 0) {
      return that.value
    }
    that.oldValue = this.value
    that.value = attr
    that.notify()
  }
  getOrSet.$$ = that
  return getOrSet
}

ObserableKey.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that.oldValue, that)
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

},{"./util.js":9}],8:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")

var SPECIAL_CHARS = /(\*\.\?\+\$\^\[\]\(\)\{\}\|\\\/)/g
var openTag, closeTag, EXP_REG, REMOVE_REG

function makeREG() {
  openTag = config.openTag.replace(SPECIAL_CHARS, "\\$1")
  closeTag = config.closeTag.replace(SPECIAL_CHARS, "\\$1")

  EXP_REG = new RegExp(openTag + "[\\S\\s]+?" + closeTag, 'g')
  REMOVE_REG = new RegExp(openTag + "|" + closeTag, 'g')
}

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
  'encodeURIComponent,parseInt,parseFloat,in'
var IGNORE_KEYWORDS_REG = 
  new RegExp('^(' + ignoreKeywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Parse text and return expressions.
 * @param {String} text
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
  makeREG()
  var rawExps = exports.getRawExps(text)
  var expressions = []
  _.each(rawExps, function(rawExp) {
    var exp = exports.getExpFromRawExp(rawExp)
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens: exports.parseTokens(exp) 
    }
    expressions.push(expression)
  })
  return expressions 
}

exports.parseTokens = function(exp) {
  // TODO: To optimze this regular expression to avoid this case:
  // "'I\'m ' + name()"
  var STRING_REG = /('[\s\S]*?')|("[\s\S]*?")/g
  exp = exp.replace(STRING_REG, '')
  var candidates = exp.match(KEYWORD_REG) || []
  var tokensMap = {}
  var tokens = []
  _.each(candidates, function(candidate) {
    if (IGNORE_KEYWORDS_REG.test(candidate)) return
    tokensMap[candidate] = 1
  })
  for(var key in tokensMap) {
    tokens.push(key)
  }
  return tokens
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

exports.parseDirective = function(value) {
  var STRING_DIR_REG = /^[_$\w][_$\w\d\s]*$/
  var value = _.trim(value)
  if (value.length === 0 || STRING_DIR_REG.test(value)) {
    return value
  } else {
    var ret = {}
    _.each(value.split(","), function(map) {
      var kv = map.split(":")
      var key = cleanQuotes(_.trim(kv[0]))
      var value = _.trim(kv[1])
      ret[key] = value
    })
    return ret
  }
}

function cleanQuotes(str) {
  var QUOTE_REG = /["']/g
  return str.replace(QUOTE_REG, "")
}
makeREG()
},{"./config":3,"./util":9}],9:[function(require,module,exports){
var obserable = require("./obserable")

exports.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

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
}

exports.trim = function(str) {
  return str.replace(/(^\s+)|\s+$/g, "")
}

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
exports.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  exports['is' + name] = function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

},{"./obserable":7}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29tcGlsZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZGlyZWN0aXZlcy9pbmRleC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZG9tLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9mYWtlXzcwZDU0MjcxLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9vYnNlcmFibGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi9wYXJzZXJcIilcbnZhciBkaXJlY3RpdmVzID0gcmVxdWlyZShcIi4vZGlyZWN0aXZlc1wiKVxuXG5leHBvcnRzLmJpbmRUZXh0ID0gZnVuY3Rpb24odGV4dE5vZGUsIGt1ZSkge1xuICB2YXIgdm0gPSBrdWUudm1cbiAgdmFyIHRleHQgPSB0ZXh0Tm9kZS50ZXh0Q29udGVudCB8fCB0ZXh0Tm9kZS5ub2RlVmFsdWUgLy8gZnVjayBJRTcsIDhcbiAgdmFyIGV4cHJlc3Npb25zID0gcGFyc2VyLnBhcnNlKHRleHQpXG4gIGZ1bmN0aW9uIHdyaXRlUmVzdWx0KCkge1xuICAgIHZhciB0ZXh0VHBsID0gdGV4dFxuICAgIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlci5leGVjKGV4cHJlc3Npb24sIHZtKVxuICAgICAgdGV4dFRwbCA9IHRleHRUcGwucmVwbGFjZShleHByZXNzaW9uLnJhd0V4cCwgcmVzdWx0KVxuICAgIH0pXG4gICAgaWYgKHRleHROb2RlLm5vZGVWYWx1ZSkge1xuICAgICAgdGV4dE5vZGUubm9kZVZhbHVlID0gdGV4dFRwbFxuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0Tm9kZS50ZXh0Tm9kZSA9IHRleHRUcGxcbiAgICB9XG4gIH1cbiAgd3JpdGVSZXN1bHQoKVxuICB3YXRjaEFsbFRva2VucyhleHByZXNzaW9ucywga3VlLCB3cml0ZVJlc3VsdClcbn1cblxuZnVuY3Rpb24gd2F0Y2hBbGxUb2tlbnMoZXhwcmVzc2lvbnMsIGt1ZSwgZm4pIHtcbiAgdmFyIHZtID0ga3VlLnZtXG4gIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgIF8uZWFjaChleHByZXNzaW9uLnRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgIHdhdGNoVG9rZW4odG9rZW4pXG4gICAgfSlcbiAgfSlcblxuICBmdW5jdGlvbiB3YXRjaFRva2VuKHRva2VuKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IHZtW3Rva2VuXVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKG9ic2VyYWJsZUtleSkpIHJldHVyblxuICAgIGlmIChfLmlzT2JzZXJhYmxlKG9ic2VyYWJsZUtleSkpIHtcbiAgICAgIG9ic2VyYWJsZUtleS4kJC53YXRjaChmbilcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5iaW5kRGlyID0gZnVuY3Rpb24oYXR0ciwgbm9kZSwga3VlKSB7XG4gIHZhciBkaXJOYW1lID0gZ2V0RGlyTmFtZShhdHRyKVxuICBpZighZGlyTmFtZSkgcmV0dXJuXG4gIGlmKCFkaXJlY3RpdmVzW2Rpck5hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlyZWN0aXZlXCIgKyBkaXJOYW1lICsgXCIgaXMgbm90IGZvdW5kLlwiKVxuICB9XG4gIHZhciBkaXJlY3RpdmUgPSBwYXJzZXIucGFyc2VEaXJlY3RpdmUoYXR0ci52YWx1ZSlcbiAgdmFyIHRva2VucyA9IGdldFRva2Vuc0Zyb21EaXJlY3RpdmUoZGlyZWN0aXZlKVxuICB2YXIgZGlyT2JqID0gZGlyZWN0aXZlc1tkaXJOYW1lXVxuICBkaXJPYmouYmluZChub2RlLCBhdHRyLCBrdWUpXG4gIF8uZWFjaCh0b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IGt1ZS52bVt0b2tlbl1cbiAgICBpZiAoXy5pc1VuZGVmaW5lZChvYnNlcmFibGVLZXkpKSByZXR1cm5cbiAgICBpZiAoXy5pc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwsIG9ic2VyYWJsZSkge1xuICAgICAgICBkaXJPYmoudXBkYXRlKG5vZGUsIGF0dHIsIGt1ZSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlKGRpcmVjdGl2ZSkge1xuICBpZiAoXy5pc1N0cmluZyhkaXJlY3RpdmUpKSB7XG4gICAgcmV0dXJuIHBhcnNlci5wYXJzZVRva2VucyhkaXJlY3RpdmUpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGFsbFRva2VucyA9IFtdXG4gICAgZm9yIChrZXkgaW4gZGlyZWN0aXZlKSB7XG4gICAgICB2YXIgdG9rZW5zID0gcGFyc2VyLnBhcnNlVG9rZW5zKGRpcmVjdGl2ZVtrZXldKVxuICAgICAgYWxsVG9rZW5zLnB1c2guYXBwbHkoYWxsVG9rZW5zLCB0b2tlbnMpXG4gICAgfVxuICAgIHJldHVybiBhbGxUb2tlbnNcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREaXJOYW1lKGF0dHIpIHtcbiAgdmFyIERJUl9SRUcgPSBuZXcgUmVnRXhwKChcIl5cIiArIGNvbmZpZy5kaXJlY3RpdmVQcmVmaXggKyBcIi1cIiArIFwiKFtcXFxcd1xcXFxkXSspXCIpKVxuICB2YXIgcmVzdWx0cyA9IGF0dHIubmFtZS5tYXRjaChESVJfUkVHKVxuICBpZihyZXN1bHRzKSB7XG4gICAgcmV0dXJuIHJlc3VsdHNbMV1cbiAgfVxuICByZXR1cm4gdm9pZCA2NjZcbn1cblxuZXhwb3J0cy5nZXRUb2tlbnNGcm9tRGlyZWN0aXZlID0gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxudmFyIGJpbmRlciA9IHJlcXVpcmUoXCIuL2JpbmRlclwiKVxuXG5mdW5jdGlvbiBjb21waWxlTm9kZShub2RlLCBrdWUpIHtcbiAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICBjb21waWxlQXR0cihub2RlLCBrdWUpXG4gICAgXy5lYWNoKG5vZGUuY2hpbGROb2RlcywgZnVuY3Rpb24obm9kZSkge1xuICAgICAgY29tcGlsZU5vZGUobm9kZSwga3VlKVxuICAgIH0pXG4gIH0gaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICBiaW5kZXIuYmluZFRleHQobm9kZSwga3VlKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVBdHRyKG5vZGUsIGt1ZSkge1xuICB2YXIgYXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XG4gIF8uZWFjaChhdHRycywgZnVuY3Rpb24oYXR0cikge1xuICAgIGJpbmRlci5iaW5kRGlyKGF0dHIsIG5vZGUsIGt1ZSlcbiAgfSlcbn1cblxuZXhwb3J0cy5jb21waWxlID0gY29tcGlsZU5vZGVcbiIsInZhciBjb25maWcgPSBleHBvcnRzXG5cbmNvbmZpZy5vcGVuVGFnID0gXCJ7XCJcbmNvbmZpZy5jbG9zZVRhZyA9IFwifVwiXG5jb25maWcuZGlyZWN0aXZlUHJlZml4ID0gXCJrXCJcbiIsInZhciAkID0gcmVxdWlyZShcIi4uL2RvbVwiKVxuXG5leHBvcnRzW1wic2hvd1wiXSA9IHtcbiAgYmluZDogZnVuY3Rpb24oZWxlLCBhdHRyLCBrdWUpIHtcbiAgICB0aGlzLnVwZGF0ZShlbGUsIGF0dHIsIGt1ZSlcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihlbGUsIGF0dHIsIGt1ZSkge1xuICAgICQoZWxlKS5jc3MoXCJkaXNwbGF5XCIsIGt1ZS52bVthdHRyLnZhbHVlXSgpID8gXCJibG9ja1wiOiBcIm5vbmVcIilcbiAgfVxufVxuIiwidmFyICQgPSBmdW5jdGlvbihkb20pIHtcbiAgcmV0dXJuIHtcbiAgICBlbDogZG9tLFxuICAgIGF0dHI6IGZ1bmN0aW9uKGF0dHIsIG5hbWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZShhdHRyKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoYXR0ciwgbmFtZSlcbiAgICAgIH1cbiAgICB9LFxuICAgIGNzczogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdGhpcy5lbC5zdHlsZVtrZXldXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsLnN0eWxlW2tleV0gPSB2YWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9ICQiLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBjb21waWxlciA9IHJlcXVpcmUoXCIuL2NvbXBpbGVyXCIpXG52YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJhYmxlXCIpXG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpXG5cbmZ1bmN0aW9uIEt1ZShvcHRpb25zKSB7XG4gIHRoaXMuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChvcHRpb25zLmVsKVxuICB0aGlzLnZtID0gb3B0aW9ucy52bVxuICB0aGlzLm1ldGhvZHMgPSBvcHRpb25zLm1ldGhvZHNcbiAgY29tcGlsZXIuY29tcGlsZSh0aGlzLmVsLCB0aGlzKVxufVxuXG52YXIgdm0gPSB7XG4gIG5hbWU6IG9ic2VyYWJsZShcIkplcnJ5XCIpLFxuICBhcHA6IG9ic2VyYWJsZShcIkt1ZSBBcHBcIiksXG4gIGlzU2hvdzogb2JzZXJhYmxlKHRydWUpXG59XG5cbnZhciBhcHAgPSBuZXcgS3VlKHtcbiAgZWw6IFwiamVycnlcIixcbiAgdm06IHZtLFxuICBtZXRob2RzOiB7XG4gICAgb25DbGljazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2xpY2shXCIpXG4gICAgfVxuICB9XG59KVxuXG53aW5kb3cudm0gPSB2bSIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbC5qc1wiKVxuXG5mdW5jdGlvbiBPYnNlcmFibGVLZXkoYXR0cikge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgdGhpcy52YWx1ZSA9IGF0dHJcbiAgdGhpcy53YXRjaGVycyA9IFtdXG4gIGZ1bmN0aW9uIGdldE9yU2V0KGF0dHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoYXQudmFsdWVcbiAgICB9XG4gICAgdGhhdC5vbGRWYWx1ZSA9IHRoaXMudmFsdWVcbiAgICB0aGF0LnZhbHVlID0gYXR0clxuICAgIHRoYXQubm90aWZ5KClcbiAgfVxuICBnZXRPclNldC4kJCA9IHRoYXRcbiAgcmV0dXJuIGdldE9yU2V0XG59XG5cbk9ic2VyYWJsZUtleS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICBfLmVhY2godGhpcy53YXRjaGVycywgZnVuY3Rpb24od2F0Y2hlcikge1xuICAgIHdhdGNoZXIodGhhdC52YWx1ZSwgdGhhdC5vbGRWYWx1ZSwgdGhhdClcbiAgfSlcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHRoaXMud2F0Y2hlcnMucHVzaChmbilcbn1cblxuZnVuY3Rpb24gT2JzZXJhYmxlQXJyYXkoYXJyKSB7XG4gIFxufVxuXG5mdW5jdGlvbiBvYnNlcmFibGUob2JqKSB7XG4gIGlmICghXy5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUtleShvYmopXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVBcnJheShvYmopXG4gIH1cbn1cblxub2JzZXJhYmxlLk9ic2VyYWJsZUtleSA9IE9ic2VyYWJsZUtleVxub2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5ID0gT2JzZXJhYmxlQXJyYXlcblxubW9kdWxlLmV4cG9ydHMgPSBvYnNlcmFibGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxuXG52YXIgU1BFQ0lBTF9DSEFSUyA9IC8oXFwqXFwuXFw/XFwrXFwkXFxeXFxbXFxdXFwoXFwpXFx7XFx9XFx8XFxcXFxcLykvZ1xudmFyIG9wZW5UYWcsIGNsb3NlVGFnLCBFWFBfUkVHLCBSRU1PVkVfUkVHXG5cbmZ1bmN0aW9uIG1ha2VSRUcoKSB7XG4gIG9wZW5UYWcgPSBjb25maWcub3BlblRhZy5yZXBsYWNlKFNQRUNJQUxfQ0hBUlMsIFwiXFxcXCQxXCIpXG4gIGNsb3NlVGFnID0gY29uZmlnLmNsb3NlVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcblxuICBFWFBfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJbXFxcXFNcXFxcc10rP1wiICsgY2xvc2VUYWcsICdnJylcbiAgUkVNT1ZFX1JFRyA9IG5ldyBSZWdFeHAob3BlblRhZyArIFwifFwiICsgY2xvc2VUYWcsICdnJylcbn1cblxuZXhwb3J0cy5nZXRSYXdFeHBzID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgcmVzdWx0cyA9IHRleHQubWF0Y2goRVhQX1JFRykgfHwgW11cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwID0gZnVuY3Rpb24ocmF3RXhwKSB7XG4gIHJldHVybiByYXdFeHAucmVwbGFjZShSRU1PVkVfUkVHLCBcIlwiKVxufVxuXG4vKiogXG4gKiBTdGVhbCBmcm9tIFZ1ZS5qczogXG4gKiBodHRwczovL2dpdGh1Yi5jb20veXl4OTkwODAzL3Z1ZS9ibG9iL2Rldi9zcmMvcGFyc2Vycy9leHByZXNzaW9uLmpzXG4gKi9cbnZhciBLRVlXT1JEX1JFRyA9IC9bX1xcd11bXyRcXHdcXGRdKy9nXG52YXIgaWdub3JlS2V5d29yZHMgPVxuICAnTWF0aCxEYXRlLHRoaXMsdHJ1ZSxmYWxzZSxudWxsLHVuZGVmaW5lZCxJbmZpbml0eSxOYU4sJyArXG4gICdpc05hTixpc0Zpbml0ZSxkZWNvZGVVUkksZGVjb2RlVVJJQ29tcG9uZW50LGVuY29kZVVSSSwnICtcbiAgJ2VuY29kZVVSSUNvbXBvbmVudCxwYXJzZUludCxwYXJzZUZsb2F0LGluJ1xudmFyIElHTk9SRV9LRVlXT1JEU19SRUcgPSBcbiAgbmV3IFJlZ0V4cCgnXignICsgaWdub3JlS2V5d29yZHMucmVwbGFjZSgvLC9nLCAnXFxcXGJ8JykgKyAnXFxcXGIpJylcblxuLyoqXG4gKiBQYXJzZSB0ZXh0IGFuZCByZXR1cm4gZXhwcmVzc2lvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICogQHJldHVybiB7QXJyYXk8T2JqZWN0Pn1cbiAqICAgICAgICAgICAgICAgLSByYXdFeHAge1N0cmluZ30gICAgICAgICBlLmcgXCJ7Zmlyc3ROYW1lKCkgKyBsYXN0TmFtZSgpfVwiXG4gKiAgICAgICAgICAgICAgIC0gZXhwIHtTdHJpbmd9ICAgICAgICAgICAgZS5nIFwiZmlyc3ROYW1lKCkgKyBsYXN0TmFtZSgpXCJcbiAqICAgICAgICAgICAgICAgLSB0b2tlbnMge0FycmF5PFN0cmluZz59ICBlLmcgW1wiZmlyc3ROYW1lXCIsIFwibGFzdE5hbWVcIl1cbiAqL1xuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgbWFrZVJFRygpXG4gIHZhciByYXdFeHBzID0gZXhwb3J0cy5nZXRSYXdFeHBzKHRleHQpXG4gIHZhciBleHByZXNzaW9ucyA9IFtdXG4gIF8uZWFjaChyYXdFeHBzLCBmdW5jdGlvbihyYXdFeHApIHtcbiAgICB2YXIgZXhwID0gZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwKHJhd0V4cClcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHtcbiAgICAgIHJhd0V4cDogcmF3RXhwLFxuICAgICAgZXhwOiBleHAsXG4gICAgICB0b2tlbnM6IGV4cG9ydHMucGFyc2VUb2tlbnMoZXhwKSBcbiAgICB9XG4gICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uKVxuICB9KVxuICByZXR1cm4gZXhwcmVzc2lvbnMgXG59XG5cbmV4cG9ydHMucGFyc2VUb2tlbnMgPSBmdW5jdGlvbihleHApIHtcbiAgLy8gVE9ETzogVG8gb3B0aW16ZSB0aGlzIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBhdm9pZCB0aGlzIGNhc2U6XG4gIC8vIFwiJ0lcXCdtICcgKyBuYW1lKClcIlxuICB2YXIgU1RSSU5HX1JFRyA9IC8oJ1tcXHNcXFNdKj8nKXwoXCJbXFxzXFxTXSo/XCIpL2dcbiAgZXhwID0gZXhwLnJlcGxhY2UoU1RSSU5HX1JFRywgJycpXG4gIHZhciBjYW5kaWRhdGVzID0gZXhwLm1hdGNoKEtFWVdPUkRfUkVHKSB8fCBbXVxuICB2YXIgdG9rZW5zTWFwID0ge31cbiAgdmFyIHRva2VucyA9IFtdXG4gIF8uZWFjaChjYW5kaWRhdGVzLCBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICBpZiAoSUdOT1JFX0tFWVdPUkRTX1JFRy50ZXN0KGNhbmRpZGF0ZSkpIHJldHVyblxuICAgIHRva2Vuc01hcFtjYW5kaWRhdGVdID0gMVxuICB9KVxuICBmb3IodmFyIGtleSBpbiB0b2tlbnNNYXApIHtcbiAgICB0b2tlbnMucHVzaChrZXkpXG4gIH1cbiAgcmV0dXJuIHRva2Vuc1xufVxuICAgIFxuXG5leHBvcnRzLmV4ZWMgPSBmdW5jdGlvbihleHByZXNzaW9uLCB2bSkge1xuICB2YXIgYXJncyA9IFtdXG4gIHZhciB0b2tlbnMgPSBleHByZXNzaW9uLnRva2Vuc1xuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIGFyZ3MucHVzaCh2bVt0b2tlbl0pXG4gIH0pXG4gIHZhciBleHAgPSBcInJldHVybiBcIiArIGV4cHJlc3Npb24uZXhwICsgXCI7XCJcbiAgcmV0dXJuIChuZXcgRnVuY3Rpb24odG9rZW5zLCBleHApKS5hcHBseSh2bSwgYXJncylcbn1cblxuZXhwb3J0cy5wYXJzZURpcmVjdGl2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBTVFJJTkdfRElSX1JFRyA9IC9eW18kXFx3XVtfJFxcd1xcZFxcc10qJC9cbiAgdmFyIHZhbHVlID0gXy50cmltKHZhbHVlKVxuICBpZiAodmFsdWUubGVuZ3RoID09PSAwIHx8IFNUUklOR19ESVJfUkVHLnRlc3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHJldCA9IHt9XG4gICAgXy5lYWNoKHZhbHVlLnNwbGl0KFwiLFwiKSwgZnVuY3Rpb24obWFwKSB7XG4gICAgICB2YXIga3YgPSBtYXAuc3BsaXQoXCI6XCIpXG4gICAgICB2YXIga2V5ID0gY2xlYW5RdW90ZXMoXy50cmltKGt2WzBdKSlcbiAgICAgIHZhciB2YWx1ZSA9IF8udHJpbShrdlsxXSlcbiAgICAgIHJldFtrZXldID0gdmFsdWVcbiAgICB9KVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhblF1b3RlcyhzdHIpIHtcbiAgdmFyIFFVT1RFX1JFRyA9IC9bXCInXS9nXG4gIHJldHVybiBzdHIucmVwbGFjZShRVU9URV9SRUcsIFwiXCIpXG59XG5tYWtlUkVHKCkiLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJhYmxlXCIpXG5cbmV4cG9ydHMuaXNPYnNlcmFibGUgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIG9iaiA9IG9iai4kJFxuICByZXR1cm4gKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVLZXkpIHx8XG4gICAgICAgICAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5KVxufVxuXG5leHBvcnRzLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufVxuXG5leHBvcnRzLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHZvaWQgNjY2O1xufVxuXG5leHBvcnRzLnRyaW0gPSBmdW5jdGlvbihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oXlxccyspfFxccyskL2csIFwiXCIpXG59XG5cbi8qKlxuICogQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gKiBzdGVhbCBmcm9tIHVuZGVyc2NvcmU6IGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL2RvY3MvdW5kZXJzY29yZS5odG1sXG4gKi9cbmV4cG9ydHMuZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgZXhwb3J0c1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICB9O1xufSk7XG4iXX0=
