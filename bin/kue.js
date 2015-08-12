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
var _ = exports

_.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

_.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

_.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

_.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i])
  }
}

_.isUndefined = function(obj) {
  return obj === void 666;
}

_.trim = function(str) {
  return str.replace(/(^\s+)|\s+$/g, "")
}

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
_.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  _['is' + name] = function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

},{"./obserable":7}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29tcGlsZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZGlyZWN0aXZlcy9pbmRleC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZG9tLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9mYWtlXzYzN2Y4ODgwLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9vYnNlcmFibGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKVxudmFyIGRpcmVjdGl2ZXMgPSByZXF1aXJlKFwiLi9kaXJlY3RpdmVzXCIpXG5cbmV4cG9ydHMuYmluZFRleHQgPSBmdW5jdGlvbih0ZXh0Tm9kZSwga3VlKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICB2YXIgdGV4dCA9IHRleHROb2RlLnRleHRDb250ZW50IHx8IHRleHROb2RlLm5vZGVWYWx1ZSAvLyBmdWNrIElFNywgOFxuICB2YXIgZXhwcmVzc2lvbnMgPSBwYXJzZXIucGFyc2UodGV4dClcbiAgZnVuY3Rpb24gd3JpdGVSZXN1bHQoKSB7XG4gICAgdmFyIHRleHRUcGwgPSB0ZXh0XG4gICAgXy5lYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByZXNzaW9uKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gcGFyc2VyLmV4ZWMoZXhwcmVzc2lvbiwgdm0pXG4gICAgICB0ZXh0VHBsID0gdGV4dFRwbC5yZXBsYWNlKGV4cHJlc3Npb24ucmF3RXhwLCByZXN1bHQpXG4gICAgfSlcbiAgICBpZiAodGV4dE5vZGUubm9kZVZhbHVlKSB7XG4gICAgICB0ZXh0Tm9kZS5ub2RlVmFsdWUgPSB0ZXh0VHBsXG4gICAgfSBlbHNlIHtcbiAgICAgIHRleHROb2RlLnRleHROb2RlID0gdGV4dFRwbFxuICAgIH1cbiAgfVxuICB3cml0ZVJlc3VsdCgpXG4gIHdhdGNoQWxsVG9rZW5zKGV4cHJlc3Npb25zLCBrdWUsIHdyaXRlUmVzdWx0KVxufVxuXG5mdW5jdGlvbiB3YXRjaEFsbFRva2VucyhleHByZXNzaW9ucywga3VlLCBmbikge1xuICB2YXIgdm0gPSBrdWUudm1cbiAgXy5lYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByZXNzaW9uKSB7XG4gICAgXy5lYWNoKGV4cHJlc3Npb24udG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgICAgd2F0Y2hUb2tlbih0b2tlbilcbiAgICB9KVxuICB9KVxuXG4gIGZ1bmN0aW9uIHdhdGNoVG9rZW4odG9rZW4pIHtcbiAgICB2YXIgb2JzZXJhYmxlS2V5ID0gdm1bdG9rZW5dXG4gICAgaWYgKF8uaXNVbmRlZmluZWQob2JzZXJhYmxlS2V5KSkgcmV0dXJuXG4gICAgaWYgKF8uaXNPYnNlcmFibGUob2JzZXJhYmxlS2V5KSkge1xuICAgICAgb2JzZXJhYmxlS2V5LiQkLndhdGNoKGZuKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmJpbmREaXIgPSBmdW5jdGlvbihhdHRyLCBub2RlLCBrdWUpIHtcbiAgdmFyIGRpck5hbWUgPSBnZXREaXJOYW1lKGF0dHIpXG4gIGlmKCFkaXJOYW1lKSByZXR1cm5cbiAgaWYoIWRpcmVjdGl2ZXNbZGlyTmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXJlY3RpdmVcIiArIGRpck5hbWUgKyBcIiBpcyBub3QgZm91bmQuXCIpXG4gIH1cbiAgdmFyIGRpcmVjdGl2ZSA9IHBhcnNlci5wYXJzZURpcmVjdGl2ZShhdHRyLnZhbHVlKVxuICB2YXIgdG9rZW5zID0gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShkaXJlY3RpdmUpXG4gIHZhciBkaXJPYmogPSBkaXJlY3RpdmVzW2Rpck5hbWVdXG4gIGRpck9iai5iaW5kKG5vZGUsIGF0dHIsIGt1ZSlcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICB2YXIgb2JzZXJhYmxlS2V5ID0ga3VlLnZtW3Rva2VuXVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKG9ic2VyYWJsZUtleSkpIHJldHVyblxuICAgIGlmIChfLmlzT2JzZXJhYmxlKG9ic2VyYWJsZUtleSkpIHtcbiAgICAgIG9ic2VyYWJsZUtleS4kJC53YXRjaChmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCwgb2JzZXJhYmxlKSB7XG4gICAgICAgIGRpck9iai51cGRhdGUobm9kZSwgYXR0ciwga3VlKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldFRva2Vuc0Zyb21EaXJlY3RpdmUoZGlyZWN0aXZlKSB7XG4gIGlmIChfLmlzU3RyaW5nKGRpcmVjdGl2ZSkpIHtcbiAgICByZXR1cm4gcGFyc2VyLnBhcnNlVG9rZW5zKGRpcmVjdGl2ZSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgYWxsVG9rZW5zID0gW11cbiAgICBmb3IgKGtleSBpbiBkaXJlY3RpdmUpIHtcbiAgICAgIHZhciB0b2tlbnMgPSBwYXJzZXIucGFyc2VUb2tlbnMoZGlyZWN0aXZlW2tleV0pXG4gICAgICBhbGxUb2tlbnMucHVzaC5hcHBseShhbGxUb2tlbnMsIHRva2VucylcbiAgICB9XG4gICAgcmV0dXJuIGFsbFRva2Vuc1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERpck5hbWUoYXR0cikge1xuICB2YXIgRElSX1JFRyA9IG5ldyBSZWdFeHAoKFwiXlwiICsgY29uZmlnLmRpcmVjdGl2ZVByZWZpeCArIFwiLVwiICsgXCIoW1xcXFx3XFxcXGRdKylcIikpXG4gIHZhciByZXN1bHRzID0gYXR0ci5uYW1lLm1hdGNoKERJUl9SRUcpXG4gIGlmKHJlc3VsdHMpIHtcbiAgICByZXR1cm4gcmVzdWx0c1sxXVxuICB9XG4gIHJldHVybiB2b2lkIDY2NlxufVxuXG5leHBvcnRzLmdldFRva2Vuc0Zyb21EaXJlY3RpdmUgPSBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJhYmxlXCIpXG52YXIgYmluZGVyID0gcmVxdWlyZShcIi4vYmluZGVyXCIpXG5cbmZ1bmN0aW9uIGNvbXBpbGVOb2RlKG5vZGUsIGt1ZSkge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgIGNvbXBpbGVBdHRyKG5vZGUsIGt1ZSlcbiAgICBfLmVhY2gobm9kZS5jaGlsZE5vZGVzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICBjb21waWxlTm9kZShub2RlLCBrdWUpXG4gICAgfSlcbiAgfSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgIGJpbmRlci5iaW5kVGV4dChub2RlLCBrdWUpXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZUF0dHIobm9kZSwga3VlKSB7XG4gIHZhciBhdHRycyA9IG5vZGUuYXR0cmlidXRlcztcbiAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgYmluZGVyLmJpbmREaXIoYXR0ciwgbm9kZSwga3VlKVxuICB9KVxufVxuXG5leHBvcnRzLmNvbXBpbGUgPSBjb21waWxlTm9kZVxuIiwidmFyIGNvbmZpZyA9IGV4cG9ydHNcblxuY29uZmlnLm9wZW5UYWcgPSBcIntcIlxuY29uZmlnLmNsb3NlVGFnID0gXCJ9XCJcbmNvbmZpZy5kaXJlY3RpdmVQcmVmaXggPSBcImtcIlxuIiwidmFyICQgPSByZXF1aXJlKFwiLi4vZG9tXCIpXG5cbmV4cG9ydHNbXCJzaG93XCJdID0ge1xuICBiaW5kOiBmdW5jdGlvbihlbGUsIGF0dHIsIGt1ZSkge1xuICAgIHRoaXMudXBkYXRlKGVsZSwgYXR0ciwga3VlKVxuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKGVsZSwgYXR0ciwga3VlKSB7XG4gICAgJChlbGUpLmNzcyhcImRpc3BsYXlcIiwga3VlLnZtW2F0dHIudmFsdWVdKCkgPyBcImJsb2NrXCI6IFwibm9uZVwiKVxuICB9XG59XG4iLCJ2YXIgJCA9IGZ1bmN0aW9uKGRvbSkge1xuICByZXR1cm4ge1xuICAgIGVsOiBkb20sXG4gICAgYXR0cjogZnVuY3Rpb24oYXR0ciwgbmFtZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKGF0dHIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZShhdHRyLCBuYW1lKVxuICAgICAgfVxuICAgIH0sXG4gICAgY3NzOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB0aGlzLmVsLnN0eWxlW2tleV1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGVba2V5XSA9IHZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gJCIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIGNvbXBpbGVyID0gcmVxdWlyZShcIi4vY29tcGlsZXJcIilcbnZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcbnZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi9wYXJzZXJcIilcblxuZnVuY3Rpb24gS3VlKG9wdGlvbnMpIHtcbiAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG9wdGlvbnMuZWwpXG4gIHRoaXMudm0gPSBvcHRpb25zLnZtXG4gIHRoaXMubWV0aG9kcyA9IG9wdGlvbnMubWV0aG9kc1xuICBjb21waWxlci5jb21waWxlKHRoaXMuZWwsIHRoaXMpXG59XG5cbnZhciB2bSA9IHtcbiAgbmFtZTogb2JzZXJhYmxlKFwiSmVycnlcIiksXG4gIGFwcDogb2JzZXJhYmxlKFwiS3VlIEFwcFwiKSxcbiAgaXNTaG93OiBvYnNlcmFibGUodHJ1ZSlcbn1cblxudmFyIGFwcCA9IG5ldyBLdWUoe1xuICBlbDogXCJqZXJyeVwiLFxuICB2bTogdm0sXG4gIG1ldGhvZHM6IHtcbiAgICBvbkNsaWNrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgY29uc29sZS5sb2coXCJjbGljayFcIilcbiAgICB9XG4gIH1cbn0pXG5cbndpbmRvdy52bSA9IHZtIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUtleShhdHRyKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICB0aGlzLnZhbHVlID0gYXR0clxuICB0aGlzLndhdGNoZXJzID0gW11cbiAgZnVuY3Rpb24gZ2V0T3JTZXQoYXR0cikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdC52YWx1ZVxuICAgIH1cbiAgICB0aGF0Lm9sZFZhbHVlID0gdGhpcy52YWx1ZVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0Lm9sZFZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG5cbnZhciBTUEVDSUFMX0NIQVJTID0gLyhcXCpcXC5cXD9cXCtcXCRcXF5cXFtcXF1cXChcXClcXHtcXH1cXHxcXFxcXFwvKS9nXG52YXIgb3BlblRhZywgY2xvc2VUYWcsIEVYUF9SRUcsIFJFTU9WRV9SRUdcblxuZnVuY3Rpb24gbWFrZVJFRygpIHtcbiAgb3BlblRhZyA9IGNvbmZpZy5vcGVuVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcbiAgY2xvc2VUYWcgPSBjb25maWcuY2xvc2VUYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuXG4gIEVYUF9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcIltcXFxcU1xcXFxzXSs/XCIgKyBjbG9zZVRhZywgJ2cnKVxuICBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJ8XCIgKyBjbG9zZVRhZywgJ2cnKVxufVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQsaW4nXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICBtYWtlUkVHKClcbiAgdmFyIHJhd0V4cHMgPSBleHBvcnRzLmdldFJhd0V4cHModGV4dClcbiAgdmFyIGV4cHJlc3Npb25zID0gW11cbiAgXy5lYWNoKHJhd0V4cHMsIGZ1bmN0aW9uKHJhd0V4cCkge1xuICAgIHZhciBleHAgPSBleHBvcnRzLmdldEV4cEZyb21SYXdFeHAocmF3RXhwKVxuICAgIHZhciBleHByZXNzaW9uID0ge1xuICAgICAgcmF3RXhwOiByYXdFeHAsXG4gICAgICBleHA6IGV4cCxcbiAgICAgIHRva2VuczogZXhwb3J0cy5wYXJzZVRva2VucyhleHApIFxuICAgIH1cbiAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pXG4gIH0pXG4gIHJldHVybiBleHByZXNzaW9ucyBcbn1cblxuZXhwb3J0cy5wYXJzZVRva2VucyA9IGZ1bmN0aW9uKGV4cCkge1xuICAvLyBUT0RPOiBUbyBvcHRpbXplIHRoaXMgcmVndWxhciBleHByZXNzaW9uIHRvIGF2b2lkIHRoaXMgY2FzZTpcbiAgLy8gXCInSVxcJ20gJyArIG5hbWUoKVwiXG4gIHZhciBTVFJJTkdfUkVHID0gLygnW1xcc1xcU10qPycpfChcIltcXHNcXFNdKj9cIikvZ1xuICBleHAgPSBleHAucmVwbGFjZShTVFJJTkdfUkVHLCAnJylcbiAgdmFyIGNhbmRpZGF0ZXMgPSBleHAubWF0Y2goS0VZV09SRF9SRUcpIHx8IFtdXG4gIHZhciB0b2tlbnNNYXAgPSB7fVxuICB2YXIgdG9rZW5zID0gW11cbiAgXy5lYWNoKGNhbmRpZGF0ZXMsIGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgIGlmIChJR05PUkVfS0VZV09SRFNfUkVHLnRlc3QoY2FuZGlkYXRlKSkgcmV0dXJuXG4gICAgdG9rZW5zTWFwW2NhbmRpZGF0ZV0gPSAxXG4gIH0pXG4gIGZvcih2YXIga2V5IGluIHRva2Vuc01hcCkge1xuICAgIHRva2Vucy5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gdG9rZW5zXG59XG4gICAgXG5cbmV4cG9ydHMuZXhlYyA9IGZ1bmN0aW9uKGV4cHJlc3Npb24sIHZtKSB7XG4gIHZhciBhcmdzID0gW11cbiAgdmFyIHRva2VucyA9IGV4cHJlc3Npb24udG9rZW5zXG4gIF8uZWFjaCh0b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgYXJncy5wdXNoKHZtW3Rva2VuXSlcbiAgfSlcbiAgdmFyIGV4cCA9IFwicmV0dXJuIFwiICsgZXhwcmVzc2lvbi5leHAgKyBcIjtcIlxuICByZXR1cm4gKG5ldyBGdW5jdGlvbih0b2tlbnMsIGV4cCkpLmFwcGx5KHZtLCBhcmdzKVxufVxuXG5leHBvcnRzLnBhcnNlRGlyZWN0aXZlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIFNUUklOR19ESVJfUkVHID0gL15bXyRcXHddW18kXFx3XFxkXFxzXSokL1xuICB2YXIgdmFsdWUgPSBfLnRyaW0odmFsdWUpXG4gIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgfHwgU1RSSU5HX0RJUl9SRUcudGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICB2YXIgcmV0ID0ge31cbiAgICBfLmVhY2godmFsdWUuc3BsaXQoXCIsXCIpLCBmdW5jdGlvbihtYXApIHtcbiAgICAgIHZhciBrdiA9IG1hcC5zcGxpdChcIjpcIilcbiAgICAgIHZhciBrZXkgPSBjbGVhblF1b3RlcyhfLnRyaW0oa3ZbMF0pKVxuICAgICAgdmFyIHZhbHVlID0gXy50cmltKGt2WzFdKVxuICAgICAgcmV0W2tleV0gPSB2YWx1ZVxuICAgIH0pXG4gICAgcmV0dXJuIHJldFxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuUXVvdGVzKHN0cikge1xuICB2YXIgUVVPVEVfUkVHID0gL1tcIiddL2dcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKFFVT1RFX1JFRywgXCJcIilcbn1cbm1ha2VSRUcoKSIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcbnZhciBfID0gZXhwb3J0c1xuXG5fLmlzT2JzZXJhYmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBvYmogPSBvYmouJCRcbiAgcmV0dXJuIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlS2V5KSB8fFxuICAgICAgICAgKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVBcnJheSlcbn1cblxuXy5tYXAgPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIHZhciByZXN1bHRzID0gW11cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjtpICsrKSB7XG4gICAgcmVzdWx0cy5wdXNoKGZuKGFycltpXSkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuXy5pc0FycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5fLmVhY2ggPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmbihhcnJbaV0pXG4gIH1cbn1cblxuXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gb2JqID09PSB2b2lkIDY2Njtcbn1cblxuXy50cmltID0gZnVuY3Rpb24oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKF5cXHMrKXxcXHMrJC9nLCBcIlwiKVxufVxuXG4vKipcbiAqIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLCBpc0Vycm9yLlxuICogc3RlYWwgZnJvbSB1bmRlcnNjb3JlOiBodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9kb2NzL3VuZGVyc2NvcmUuaHRtbFxuICovXG5fLmVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCcsICdFcnJvciddLCBmdW5jdGlvbihuYW1lKSB7XG4gIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgfTtcbn0pO1xuIl19
