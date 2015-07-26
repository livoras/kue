(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var parser = require("./parser")
var directives = require("./directives")

exports.bindText = function(textNode, kue) {
  var vm = kue.vm
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
  watchAllTokenrs(expressions, kue, writeResult)
}

function watchAllTokenrs(expressions, kue, fn) {
  var vm = kue.vm
  var tokens = {}
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      if (tokens[token]) return
      tokens[token] = 1
    })
  })

  for(token in tokens) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) continue
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

exports.bindDir = function(attr, node, vm) {
  var dirName = getDirName(attr)
  if(!dirName) return
  if(!directives[dirName]) {
    throw new Error("Directive" + dirName + " is not found.")
  }
  console.log(attr.name, dirName, directives)
}

function getDirName(attr) {
  var DIR_REG = new RegExp(("^" + config.directivePrefix + "-" + "([\\w\\d]+)"))
  var results = attr.name.match(DIR_REG)
  if(results) {
    return results[1]
  }
  return void 666
}
},{"./config":3,"./directives":4,"./parser":7,"./util":8}],2:[function(require,module,exports){
var _ = require("./util")
var obserable = require("./obserable")
var binder = require("./binder")

function compileNode(node, kue) {
  if (node.nodeType === 1) {
    //console.log('ele', node)
    compileAttr(node, kue)
    _.each(node.childNodes, function(node) {
      compileNode(node, kue)
    })
  } if (node.nodeType === 3) {
    //console.log('text', node);
    binder.bindText(node, kue)
    //node.textContent = "jerry is good"
  }
}

function compileAttr(node, kue) {
  var attrs = node.attributes;
  _.each(attrs, function(attr) {
    binder.bindDir(attr, node, kue)
  })
}

exports.compile = compileNode

},{"./binder":1,"./obserable":6,"./util":8}],3:[function(require,module,exports){
var config = exports

config.openTag = "{"
config.closeTag = "}"
config.directivePrefix = "k"

},{}],4:[function(require,module,exports){

exports["show"] = {
  bind: function() {
    // body...
  },
  update: function() {
    // body...
  }
}

},{}],5:[function(require,module,exports){
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
  app: obserable("Kue App")
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


},{"./compiler":2,"./obserable":6,"./parser":7,"./util":8}],6:[function(require,module,exports){
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

},{"./util.js":8}],7:[function(require,module,exports){
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
  'encodeURIComponent,parseInt,parseFloat'
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

makeREG()
},{"./config":3,"./util":8}],8:[function(require,module,exports){
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

},{"./obserable":6}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29tcGlsZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZGlyZWN0aXZlcy9pbmRleC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvZmFrZV81ZmI4MDQ5YS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvb2JzZXJhYmxlLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9wYXJzZXIuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpXG52YXIgZGlyZWN0aXZlcyA9IHJlcXVpcmUoXCIuL2RpcmVjdGl2ZXNcIilcblxuZXhwb3J0cy5iaW5kVGV4dCA9IGZ1bmN0aW9uKHRleHROb2RlLCBrdWUpIHtcbiAgdmFyIHZtID0ga3VlLnZtXG4gIHZhciB0ZXh0ID0gdGV4dE5vZGUudGV4dENvbnRlbnRcbiAgdmFyIGV4cHJlc3Npb25zID0gcGFyc2VyLnBhcnNlKHRleHQpXG4gIGZ1bmN0aW9uIHdyaXRlUmVzdWx0KCkge1xuICAgIHZhciB0ZXh0VHBsID0gdGV4dFxuICAgIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlci5leGVjKGV4cHJlc3Npb24sIHZtKVxuICAgICAgdGV4dFRwbCA9IHRleHRUcGwucmVwbGFjZShleHByZXNzaW9uLnJhd0V4cCwgcmVzdWx0KVxuICAgIH0pXG4gICAgdGV4dE5vZGUudGV4dENvbnRlbnQgPSB0ZXh0VHBsXG4gIH1cbiAgd3JpdGVSZXN1bHQoKVxuICB3YXRjaEFsbFRva2VucnMoZXhwcmVzc2lvbnMsIGt1ZSwgd3JpdGVSZXN1bHQpXG59XG5cbmZ1bmN0aW9uIHdhdGNoQWxsVG9rZW5ycyhleHByZXNzaW9ucywga3VlLCBmbikge1xuICB2YXIgdm0gPSBrdWUudm1cbiAgdmFyIHRva2VucyA9IHt9XG4gIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgIF8uZWFjaChleHByZXNzaW9uLnRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgIGlmICh0b2tlbnNbdG9rZW5dKSByZXR1cm5cbiAgICAgIHRva2Vuc1t0b2tlbl0gPSAxXG4gICAgfSlcbiAgfSlcblxuICBmb3IodG9rZW4gaW4gdG9rZW5zKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IHZtW3Rva2VuXVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKG9ic2VyYWJsZUtleSkpIGNvbnRpbnVlXG4gICAgaWYgKF8uaXNPYnNlcmFibGUob2JzZXJhYmxlS2V5KSkge1xuICAgICAgb2JzZXJhYmxlS2V5LiQkLndhdGNoKGZuKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmJpbmREaXIgPSBmdW5jdGlvbihhdHRyLCBub2RlLCB2bSkge1xuICB2YXIgZGlyTmFtZSA9IGdldERpck5hbWUoYXR0cilcbiAgaWYoIWRpck5hbWUpIHJldHVyblxuICBpZighZGlyZWN0aXZlc1tkaXJOYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpcmVjdGl2ZVwiICsgZGlyTmFtZSArIFwiIGlzIG5vdCBmb3VuZC5cIilcbiAgfVxuICBjb25zb2xlLmxvZyhhdHRyLm5hbWUsIGRpck5hbWUsIGRpcmVjdGl2ZXMpXG59XG5cbmZ1bmN0aW9uIGdldERpck5hbWUoYXR0cikge1xuICB2YXIgRElSX1JFRyA9IG5ldyBSZWdFeHAoKFwiXlwiICsgY29uZmlnLmRpcmVjdGl2ZVByZWZpeCArIFwiLVwiICsgXCIoW1xcXFx3XFxcXGRdKylcIikpXG4gIHZhciByZXN1bHRzID0gYXR0ci5uYW1lLm1hdGNoKERJUl9SRUcpXG4gIGlmKHJlc3VsdHMpIHtcbiAgICByZXR1cm4gcmVzdWx0c1sxXVxuICB9XG4gIHJldHVybiB2b2lkIDY2NlxufSIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxudmFyIGJpbmRlciA9IHJlcXVpcmUoXCIuL2JpbmRlclwiKVxuXG5mdW5jdGlvbiBjb21waWxlTm9kZShub2RlLCBrdWUpIHtcbiAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdlbGUnLCBub2RlKVxuICAgIGNvbXBpbGVBdHRyKG5vZGUsIGt1ZSlcbiAgICBfLmVhY2gobm9kZS5jaGlsZE5vZGVzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICBjb21waWxlTm9kZShub2RlLCBrdWUpXG4gICAgfSlcbiAgfSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgIC8vY29uc29sZS5sb2coJ3RleHQnLCBub2RlKTtcbiAgICBiaW5kZXIuYmluZFRleHQobm9kZSwga3VlKVxuICAgIC8vbm9kZS50ZXh0Q29udGVudCA9IFwiamVycnkgaXMgZ29vZFwiXG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZUF0dHIobm9kZSwga3VlKSB7XG4gIHZhciBhdHRycyA9IG5vZGUuYXR0cmlidXRlcztcbiAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgYmluZGVyLmJpbmREaXIoYXR0ciwgbm9kZSwga3VlKVxuICB9KVxufVxuXG5leHBvcnRzLmNvbXBpbGUgPSBjb21waWxlTm9kZVxuIiwidmFyIGNvbmZpZyA9IGV4cG9ydHNcblxuY29uZmlnLm9wZW5UYWcgPSBcIntcIlxuY29uZmlnLmNsb3NlVGFnID0gXCJ9XCJcbmNvbmZpZy5kaXJlY3RpdmVQcmVmaXggPSBcImtcIlxuIiwiXG5leHBvcnRzW1wic2hvd1wiXSA9IHtcbiAgYmluZDogZnVuY3Rpb24oKSB7XG4gICAgLy8gYm9keS4uLlxuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIC8vIGJvZHkuLi5cbiAgfVxufVxuIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgY29tcGlsZXIgPSByZXF1aXJlKFwiLi9jb21waWxlclwiKVxudmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxudmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKVxuXG5mdW5jdGlvbiBLdWUob3B0aW9ucykge1xuICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQob3B0aW9ucy5lbClcbiAgdGhpcy52bSA9IG9wdGlvbnMudm1cbiAgdGhpcy5tZXRob2RzID0gb3B0aW9ucy5tZXRob2RzXG4gIGNvbXBpbGVyLmNvbXBpbGUodGhpcy5lbCwgdGhpcylcbn1cblxudmFyIHZtID0ge1xuICBuYW1lOiBvYnNlcmFibGUoXCJKZXJyeVwiKSxcbiAgYXBwOiBvYnNlcmFibGUoXCJLdWUgQXBwXCIpXG59XG5cbnZhciBhcHAgPSBuZXcgS3VlKHtcbiAgZWw6IFwiamVycnlcIixcbiAgdm06IHZtLFxuICBtZXRob2RzOiB7XG4gICAgb25DbGljazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiY2xpY2shXCIpXG4gICAgfVxuICB9XG59KVxuXG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIilcblxuZnVuY3Rpb24gT2JzZXJhYmxlS2V5KGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG5cbnZhciBTUEVDSUFMX0NIQVJTID0gLyhcXCpcXC5cXD9cXCtcXCRcXF5cXFtcXF1cXChcXClcXHtcXH1cXHxcXFxcXFwvKS9nXG52YXIgb3BlblRhZywgY2xvc2VUYWcsIEVYUF9SRUcsIFJFTU9WRV9SRUdcblxuZnVuY3Rpb24gbWFrZVJFRygpIHtcbiAgb3BlblRhZyA9IGNvbmZpZy5vcGVuVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcbiAgY2xvc2VUYWcgPSBjb25maWcuY2xvc2VUYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuXG4gIEVYUF9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcIltcXFxcU1xcXFxzXSs/XCIgKyBjbG9zZVRhZywgJ2cnKVxuICBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJ8XCIgKyBjbG9zZVRhZywgJ2cnKVxufVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQnXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICBtYWtlUkVHKClcbiAgdmFyIHJhd0V4cHMgPSBleHBvcnRzLmdldFJhd0V4cHModGV4dClcbiAgdmFyIGV4cHJlc3Npb25zID0gW11cbiAgXy5lYWNoKHJhd0V4cHMsIGZ1bmN0aW9uKHJhd0V4cCkge1xuICAgIHZhciBleHAgPSBleHBvcnRzLmdldEV4cEZyb21SYXdFeHAocmF3RXhwKVxuICAgIHZhciBjYW5kaWRhdGVzID0gZXhwLm1hdGNoKEtFWVdPUkRfUkVHKSB8fCBbXVxuICAgIHZhciB0b2tlbnMgPSBbXVxuICAgIF8uZWFjaChjYW5kaWRhdGVzLCBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICAgIGlmIChJR05PUkVfS0VZV09SRFNfUkVHLnRlc3QoY2FuZGlkYXRlKSkgcmV0dXJuXG4gICAgICB0b2tlbnMucHVzaChjYW5kaWRhdGUpXG4gICAgfSlcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHtcbiAgICAgIHJhd0V4cDogcmF3RXhwLFxuICAgICAgZXhwOiBleHAsXG4gICAgICB0b2tlbnM6dG9rZW5zIFxuICAgIH1cbiAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pXG4gIH0pXG4gIHJldHVybiBleHByZXNzaW9ucyBcbn1cblxuZXhwb3J0cy5leGVjID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgdm0pIHtcbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgdG9rZW5zID0gZXhwcmVzc2lvbi50b2tlbnNcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBhcmdzLnB1c2godm1bdG9rZW5dKVxuICB9KVxuICB2YXIgZXhwID0gXCJyZXR1cm4gXCIgKyBleHByZXNzaW9uLmV4cCArIFwiO1wiXG4gIHJldHVybiAobmV3IEZ1bmN0aW9uKHRva2VucywgZXhwKSkuYXBwbHkodm0sIGFyZ3MpXG59XG5cbm1ha2VSRUcoKSIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcblxuZXhwb3J0cy5pc09ic2VyYWJsZSA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgb2JqID0gb2JqLiQkXG4gIHJldHVybiAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUtleSkgfHxcbiAgICAgICAgIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkpXG59XG5cbmV4cG9ydHMubWFwID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICB2YXIgcmVzdWx0cyA9IFtdXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47aSArKykge1xuICAgIHJlc3VsdHMucHVzaChmbihhcnJbaV0pKVxuICB9XG4gIHJldHVybiByZXN1bHRzXG59XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdbb2JqZWN0IEFycmF5XSdcbn1cblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZm4oYXJyW2ldKVxuICB9XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHZvaWQgNjY2O1xufTtcblxuLyoqXG4gKiBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAqIHN0ZWFsIGZyb20gdW5kZXJzY29yZTogaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvZG9jcy91bmRlcnNjb3JlLmh0bWxcbiAqL1xuZXhwb3J0cy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICBleHBvcnRzWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBiamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgfTtcbn0pO1xuIl19
