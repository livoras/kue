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
    kue.vm[token].$$.watch(function(newVal, oldVal, obserable) {
      dirObj.update(node, attr, kue)
    })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29tcGlsZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZGlyZWN0aXZlcy9pbmRleC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZG9tLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9mYWtlX2U2MDlkYjVkLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9vYnNlcmFibGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpXG52YXIgZGlyZWN0aXZlcyA9IHJlcXVpcmUoXCIuL2RpcmVjdGl2ZXNcIilcblxuZXhwb3J0cy5iaW5kVGV4dCA9IGZ1bmN0aW9uKHRleHROb2RlLCBrdWUpIHtcbiAgdmFyIHZtID0ga3VlLnZtXG4gIHZhciB0ZXh0ID0gdGV4dE5vZGUudGV4dENvbnRlbnQgfHwgdGV4dE5vZGUubm9kZVZhbHVlIC8vIGZ1Y2sgSUU3LCA4XG4gIHZhciBleHByZXNzaW9ucyA9IHBhcnNlci5wYXJzZSh0ZXh0KVxuICBmdW5jdGlvbiB3cml0ZVJlc3VsdCgpIHtcbiAgICB2YXIgdGV4dFRwbCA9IHRleHRcbiAgICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICAgIHZhciByZXN1bHQgPSBwYXJzZXIuZXhlYyhleHByZXNzaW9uLCB2bSlcbiAgICAgIHRleHRUcGwgPSB0ZXh0VHBsLnJlcGxhY2UoZXhwcmVzc2lvbi5yYXdFeHAsIHJlc3VsdClcbiAgICB9KVxuICAgIGlmICh0ZXh0Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgIHRleHROb2RlLm5vZGVWYWx1ZSA9IHRleHRUcGxcbiAgICB9IGVsc2Uge1xuICAgICAgdGV4dE5vZGUudGV4dE5vZGUgPSB0ZXh0VHBsXG4gICAgfVxuICB9XG4gIHdyaXRlUmVzdWx0KClcbiAgd2F0Y2hBbGxUb2tlbnMoZXhwcmVzc2lvbnMsIGt1ZSwgd3JpdGVSZXN1bHQpXG59XG5cbmZ1bmN0aW9uIHdhdGNoQWxsVG9rZW5zKGV4cHJlc3Npb25zLCBrdWUsIGZuKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICBfLmVhY2goZXhwcmVzc2lvbi50b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgICB3YXRjaFRva2VuKHRva2VuKVxuICAgIH0pXG4gIH0pXG5cbiAgZnVuY3Rpb24gd2F0Y2hUb2tlbih0b2tlbikge1xuICAgIHZhciBvYnNlcmFibGVLZXkgPSB2bVt0b2tlbl1cbiAgICBpZiAoXy5pc1VuZGVmaW5lZChvYnNlcmFibGVLZXkpKSByZXR1cm5cbiAgICBpZiAoXy5pc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZm4pXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuYmluZERpciA9IGZ1bmN0aW9uKGF0dHIsIG5vZGUsIGt1ZSkge1xuICB2YXIgZGlyTmFtZSA9IGdldERpck5hbWUoYXR0cilcbiAgaWYoIWRpck5hbWUpIHJldHVyblxuICBpZighZGlyZWN0aXZlc1tkaXJOYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpcmVjdGl2ZVwiICsgZGlyTmFtZSArIFwiIGlzIG5vdCBmb3VuZC5cIilcbiAgfVxuICB2YXIgZGlyZWN0aXZlID0gcGFyc2VyLnBhcnNlRGlyZWN0aXZlKGF0dHIudmFsdWUpXG4gIHZhciB0b2tlbnMgPSBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlKGRpcmVjdGl2ZSlcbiAgdmFyIGRpck9iaiA9IGRpcmVjdGl2ZXNbZGlyTmFtZV1cbiAgZGlyT2JqLmJpbmQobm9kZSwgYXR0ciwga3VlKVxuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIGt1ZS52bVt0b2tlbl0uJCQud2F0Y2goZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwsIG9ic2VyYWJsZSkge1xuICAgICAgZGlyT2JqLnVwZGF0ZShub2RlLCBhdHRyLCBrdWUpXG4gICAgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShkaXJlY3RpdmUpIHtcbiAgaWYgKF8uaXNTdHJpbmcoZGlyZWN0aXZlKSkge1xuICAgIHJldHVybiBwYXJzZXIucGFyc2VUb2tlbnMoZGlyZWN0aXZlKVxuICB9IGVsc2Uge1xuICAgIHZhciBhbGxUb2tlbnMgPSBbXVxuICAgIGZvciAoa2V5IGluIGRpcmVjdGl2ZSkge1xuICAgICAgdmFyIHRva2VucyA9IHBhcnNlci5wYXJzZVRva2VucyhkaXJlY3RpdmVba2V5XSlcbiAgICAgIGFsbFRva2Vucy5wdXNoLmFwcGx5KGFsbFRva2VucywgdG9rZW5zKVxuICAgIH1cbiAgICByZXR1cm4gYWxsVG9rZW5zXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGlyTmFtZShhdHRyKSB7XG4gIHZhciBESVJfUkVHID0gbmV3IFJlZ0V4cCgoXCJeXCIgKyBjb25maWcuZGlyZWN0aXZlUHJlZml4ICsgXCItXCIgKyBcIihbXFxcXHdcXFxcZF0rKVwiKSlcbiAgdmFyIHJlc3VsdHMgPSBhdHRyLm5hbWUubWF0Y2goRElSX1JFRylcbiAgaWYocmVzdWx0cykge1xuICAgIHJldHVybiByZXN1bHRzWzFdXG4gIH1cbiAgcmV0dXJuIHZvaWQgNjY2XG59XG5cbmV4cG9ydHMuZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSA9IGdldFRva2Vuc0Zyb21EaXJlY3RpdmUiLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcbnZhciBiaW5kZXIgPSByZXF1aXJlKFwiLi9iaW5kZXJcIilcblxuZnVuY3Rpb24gY29tcGlsZU5vZGUobm9kZSwga3VlKSB7XG4gIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgY29tcGlsZUF0dHIobm9kZSwga3VlKVxuICAgIF8uZWFjaChub2RlLmNoaWxkTm9kZXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIGNvbXBpbGVOb2RlKG5vZGUsIGt1ZSlcbiAgICB9KVxuICB9IGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgYmluZGVyLmJpbmRUZXh0KG5vZGUsIGt1ZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21waWxlQXR0cihub2RlLCBrdWUpIHtcbiAgdmFyIGF0dHJzID0gbm9kZS5hdHRyaWJ1dGVzO1xuICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBiaW5kZXIuYmluZERpcihhdHRyLCBub2RlLCBrdWUpXG4gIH0pXG59XG5cbmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGVOb2RlXG4iLCJ2YXIgY29uZmlnID0gZXhwb3J0c1xuXG5jb25maWcub3BlblRhZyA9IFwie1wiXG5jb25maWcuY2xvc2VUYWcgPSBcIn1cIlxuY29uZmlnLmRpcmVjdGl2ZVByZWZpeCA9IFwia1wiXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCIuLi9kb21cIilcblxuZXhwb3J0c1tcInNob3dcIl0gPSB7XG4gIGJpbmQ6IGZ1bmN0aW9uKGVsZSwgYXR0ciwga3VlKSB7XG4gICAgdGhpcy51cGRhdGUoZWxlLCBhdHRyLCBrdWUpXG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24oZWxlLCBhdHRyLCBrdWUpIHtcbiAgICAkKGVsZSkuY3NzKFwiZGlzcGxheVwiLCBrdWUudm1bYXR0ci52YWx1ZV0oKSA/IFwiYmxvY2tcIjogXCJub25lXCIpXG4gIH1cbn1cbiIsInZhciAkID0gZnVuY3Rpb24oZG9tKSB7XG4gIHJldHVybiB7XG4gICAgZWw6IGRvbSxcbiAgICBhdHRyOiBmdW5jdGlvbihhdHRyLCBuYW1lKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUoYXR0cilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKGF0dHIsIG5hbWUpXG4gICAgICB9XG4gICAgfSxcbiAgICBjc3M6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGVba2V5XVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5zdHlsZVtrZXldID0gdmFsdWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSAkIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgY29tcGlsZXIgPSByZXF1aXJlKFwiLi9jb21waWxlclwiKVxudmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxudmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKVxuXG5mdW5jdGlvbiBLdWUob3B0aW9ucykge1xuICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQob3B0aW9ucy5lbClcbiAgdGhpcy52bSA9IG9wdGlvbnMudm1cbiAgdGhpcy5tZXRob2RzID0gb3B0aW9ucy5tZXRob2RzXG4gIGNvbXBpbGVyLmNvbXBpbGUodGhpcy5lbCwgdGhpcylcbn1cblxudmFyIHZtID0ge1xuICBuYW1lOiBvYnNlcmFibGUoXCJKZXJyeVwiKSxcbiAgYXBwOiBvYnNlcmFibGUoXCJLdWUgQXBwXCIpLFxuICBpc1Nob3c6IG9ic2VyYWJsZSh0cnVlKVxufVxuXG52YXIgYXBwID0gbmV3IEt1ZSh7XG4gIGVsOiBcImplcnJ5XCIsXG4gIHZtOiB2bSxcbiAgbWV0aG9kczoge1xuICAgIG9uQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBjb25zb2xlLmxvZyhcImNsaWNrIVwiKVxuICAgIH1cbiAgfVxufSlcblxud2luZG93LnZtID0gdm0iLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIilcblxuZnVuY3Rpb24gT2JzZXJhYmxlS2V5KGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQub2xkVmFsdWUgPSB0aGlzLnZhbHVlXG4gICAgdGhhdC52YWx1ZSA9IGF0dHJcbiAgICB0aGF0Lm5vdGlmeSgpXG4gIH1cbiAgZ2V0T3JTZXQuJCQgPSB0aGF0XG4gIHJldHVybiBnZXRPclNldFxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgXy5lYWNoKHRoaXMud2F0Y2hlcnMsIGZ1bmN0aW9uKHdhdGNoZXIpIHtcbiAgICB3YXRjaGVyKHRoYXQudmFsdWUsIHRoYXQub2xkVmFsdWUsIHRoYXQpXG4gIH0pXG59XG5cbk9ic2VyYWJsZUtleS5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihmbikge1xuICB0aGlzLndhdGNoZXJzLnB1c2goZm4pXG59XG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUFycmF5KGFycikge1xuICBcbn1cblxuZnVuY3Rpb24gb2JzZXJhYmxlKG9iaikge1xuICBpZiAoIV8uaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVLZXkob2JqKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlQXJyYXkob2JqKVxuICB9XG59XG5cbm9ic2VyYWJsZS5PYnNlcmFibGVLZXkgPSBPYnNlcmFibGVLZXlcbm9ic2VyYWJsZS5PYnNlcmFibGVBcnJheSA9IE9ic2VyYWJsZUFycmF5XG5cbm1vZHVsZS5leHBvcnRzID0gb2JzZXJhYmxlXG4iLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcblxudmFyIFNQRUNJQUxfQ0hBUlMgPSAvKFxcKlxcLlxcP1xcK1xcJFxcXlxcW1xcXVxcKFxcKVxce1xcfVxcfFxcXFxcXC8pL2dcbnZhciBvcGVuVGFnLCBjbG9zZVRhZywgRVhQX1JFRywgUkVNT1ZFX1JFR1xuXG5mdW5jdGlvbiBtYWtlUkVHKCkge1xuICBvcGVuVGFnID0gY29uZmlnLm9wZW5UYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuICBjbG9zZVRhZyA9IGNvbmZpZy5jbG9zZVRhZy5yZXBsYWNlKFNQRUNJQUxfQ0hBUlMsIFwiXFxcXCQxXCIpXG5cbiAgRVhQX1JFRyA9IG5ldyBSZWdFeHAob3BlblRhZyArIFwiW1xcXFxTXFxcXHNdKz9cIiArIGNsb3NlVGFnLCAnZycpXG4gIFJFTU9WRV9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcInxcIiArIGNsb3NlVGFnLCAnZycpXG59XG5cbmV4cG9ydHMuZ2V0UmF3RXhwcyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgdmFyIHJlc3VsdHMgPSB0ZXh0Lm1hdGNoKEVYUF9SRUcpIHx8IFtdXG4gIHJldHVybiByZXN1bHRzXG59XG5cbmV4cG9ydHMuZ2V0RXhwRnJvbVJhd0V4cCA9IGZ1bmN0aW9uKHJhd0V4cCkge1xuICByZXR1cm4gcmF3RXhwLnJlcGxhY2UoUkVNT1ZFX1JFRywgXCJcIilcbn1cblxuLyoqIFxuICogU3RlYWwgZnJvbSBWdWUuanM6IFxuICogaHR0cHM6Ly9naXRodWIuY29tL3l5eDk5MDgwMy92dWUvYmxvYi9kZXYvc3JjL3BhcnNlcnMvZXhwcmVzc2lvbi5qc1xuICovXG52YXIgS0VZV09SRF9SRUcgPSAvW19cXHddW18kXFx3XFxkXSsvZ1xudmFyIGlnbm9yZUtleXdvcmRzID1cbiAgJ01hdGgsRGF0ZSx0aGlzLHRydWUsZmFsc2UsbnVsbCx1bmRlZmluZWQsSW5maW5pdHksTmFOLCcgK1xuICAnaXNOYU4saXNGaW5pdGUsZGVjb2RlVVJJLGRlY29kZVVSSUNvbXBvbmVudCxlbmNvZGVVUkksJyArXG4gICdlbmNvZGVVUklDb21wb25lbnQscGFyc2VJbnQscGFyc2VGbG9hdCxpbidcbnZhciBJR05PUkVfS0VZV09SRFNfUkVHID0gXG4gIG5ldyBSZWdFeHAoJ14oJyArIGlnbm9yZUtleXdvcmRzLnJlcGxhY2UoLywvZywgJ1xcXFxifCcpICsgJ1xcXFxiKScpXG5cbi8qKlxuICogUGFyc2UgdGV4dCBhbmQgcmV0dXJuIGV4cHJlc3Npb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD59XG4gKiAgICAgICAgICAgICAgIC0gcmF3RXhwIHtTdHJpbmd9ICAgICAgICAgZS5nIFwie2ZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKX1cIlxuICogICAgICAgICAgICAgICAtIGV4cCB7U3RyaW5nfSAgICAgICAgICAgIGUuZyBcImZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKVwiXG4gKiAgICAgICAgICAgICAgIC0gdG9rZW5zIHtBcnJheTxTdHJpbmc+fSAgZS5nIFtcImZpcnN0TmFtZVwiLCBcImxhc3ROYW1lXCJdXG4gKi9cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIG1ha2VSRUcoKVxuICB2YXIgcmF3RXhwcyA9IGV4cG9ydHMuZ2V0UmF3RXhwcyh0ZXh0KVxuICB2YXIgZXhwcmVzc2lvbnMgPSBbXVxuICBfLmVhY2gocmF3RXhwcywgZnVuY3Rpb24ocmF3RXhwKSB7XG4gICAgdmFyIGV4cCA9IGV4cG9ydHMuZ2V0RXhwRnJvbVJhd0V4cChyYXdFeHApXG4gICAgdmFyIGV4cHJlc3Npb24gPSB7XG4gICAgICByYXdFeHA6IHJhd0V4cCxcbiAgICAgIGV4cDogZXhwLFxuICAgICAgdG9rZW5zOiBleHBvcnRzLnBhcnNlVG9rZW5zKGV4cCkgXG4gICAgfVxuICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbilcbiAgfSlcbiAgcmV0dXJuIGV4cHJlc3Npb25zIFxufVxuXG5leHBvcnRzLnBhcnNlVG9rZW5zID0gZnVuY3Rpb24oZXhwKSB7XG4gIC8vIFRPRE86IFRvIG9wdGltemUgdGhpcyByZWd1bGFyIGV4cHJlc3Npb24gdG8gYXZvaWQgdGhpcyBjYXNlOlxuICAvLyBcIidJXFwnbSAnICsgbmFtZSgpXCJcbiAgdmFyIFNUUklOR19SRUcgPSAvKCdbXFxzXFxTXSo/Jyl8KFwiW1xcc1xcU10qP1wiKS9nXG4gIGV4cCA9IGV4cC5yZXBsYWNlKFNUUklOR19SRUcsICcnKVxuICB2YXIgY2FuZGlkYXRlcyA9IGV4cC5tYXRjaChLRVlXT1JEX1JFRykgfHwgW11cbiAgdmFyIHRva2Vuc01hcCA9IHt9XG4gIHZhciB0b2tlbnMgPSBbXVxuICBfLmVhY2goY2FuZGlkYXRlcywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgaWYgKElHTk9SRV9LRVlXT1JEU19SRUcudGVzdChjYW5kaWRhdGUpKSByZXR1cm5cbiAgICB0b2tlbnNNYXBbY2FuZGlkYXRlXSA9IDFcbiAgfSlcbiAgZm9yKHZhciBrZXkgaW4gdG9rZW5zTWFwKSB7XG4gICAgdG9rZW5zLnB1c2goa2V5KVxuICB9XG4gIHJldHVybiB0b2tlbnNcbn1cbiAgICBcblxuZXhwb3J0cy5leGVjID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgdm0pIHtcbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgdG9rZW5zID0gZXhwcmVzc2lvbi50b2tlbnNcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBhcmdzLnB1c2godm1bdG9rZW5dKVxuICB9KVxuICB2YXIgZXhwID0gXCJyZXR1cm4gXCIgKyBleHByZXNzaW9uLmV4cCArIFwiO1wiXG4gIHJldHVybiAobmV3IEZ1bmN0aW9uKHRva2VucywgZXhwKSkuYXBwbHkodm0sIGFyZ3MpXG59XG5cbmV4cG9ydHMucGFyc2VEaXJlY3RpdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgU1RSSU5HX0RJUl9SRUcgPSAvXltfJFxcd11bXyRcXHdcXGRcXHNdKiQvXG4gIHZhciB2YWx1ZSA9IF8udHJpbSh2YWx1ZSlcbiAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCB8fCBTVFJJTkdfRElSX1JFRy50ZXN0KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIHZhciByZXQgPSB7fVxuICAgIF8uZWFjaCh2YWx1ZS5zcGxpdChcIixcIiksIGZ1bmN0aW9uKG1hcCkge1xuICAgICAgdmFyIGt2ID0gbWFwLnNwbGl0KFwiOlwiKVxuICAgICAgdmFyIGtleSA9IGNsZWFuUXVvdGVzKF8udHJpbShrdlswXSkpXG4gICAgICB2YXIgdmFsdWUgPSBfLnRyaW0oa3ZbMV0pXG4gICAgICByZXRba2V5XSA9IHZhbHVlXG4gICAgfSlcbiAgICByZXR1cm4gcmV0XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW5RdW90ZXMoc3RyKSB7XG4gIHZhciBRVU9URV9SRUcgPSAvW1wiJ10vZ1xuICByZXR1cm4gc3RyLnJlcGxhY2UoUVVPVEVfUkVHLCBcIlwiKVxufVxubWFrZVJFRygpIiwidmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxuXG5leHBvcnRzLmlzT2JzZXJhYmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBvYmogPSBvYmouJCRcbiAgcmV0dXJuIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlS2V5KSB8fFxuICAgICAgICAgKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVBcnJheSlcbn1cblxuZXhwb3J0cy5tYXAgPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIHZhciByZXN1bHRzID0gW11cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjtpICsrKSB7XG4gICAgcmVzdWx0cy5wdXNoKGZuKGFycltpXSkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmbihhcnJbaV0pXG4gIH1cbn1cblxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqID09PSB2b2lkIDY2Njtcbn1cblxuZXhwb3J0cy50cmltID0gZnVuY3Rpb24oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKF5cXHMrKXxcXHMrJC9nLCBcIlwiKVxufVxuXG4vKipcbiAqIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLCBpc0Vycm9yLlxuICogc3RlYWwgZnJvbSB1bmRlcnNjb3JlOiBodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9kb2NzL3VuZGVyc2NvcmUuaHRtbFxuICovXG5leHBvcnRzLmVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCcsICdFcnJvciddLCBmdW5jdGlvbihuYW1lKSB7XG4gIGV4cG9ydHNbJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgfTtcbn0pO1xuIl19
