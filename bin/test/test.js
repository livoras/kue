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
  watchAllTokens(expressions, kue, writeResult)
}

function watchAllTokens(expressions, kue, fn) {
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
},{"./config":2,"./directives":3,"./parser":6,"./util":7}],2:[function(require,module,exports){
var config = exports

config.openTag = "{"
config.closeTag = "}"
config.directivePrefix = "k"

},{}],3:[function(require,module,exports){
var $ = require("../dom")

exports["show"] = {
  bind: function(ele, attr, kue) {
    this.update(ele, attr, kue)
  },
  update: function(ele, attr, kue) {
    $(ele).css("display", kue.vm[attr.value]() ? "block": "none")
  }
}

},{"../dom":4}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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

},{"./util.js":7}],6:[function(require,module,exports){
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
  var tokens = []
  _.each(candidates, function(candidate) {
    if (IGNORE_KEYWORDS_REG.test(candidate)) return
    tokens.push(candidate)
  })
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
  var value = value.trim()
  if (value.length === 0 || STRING_DIR_REG.test(value)) {
    return value
  } else {
    var ret = {}
    _.each(value.split(","), function(map) {
      var kv = map.split(":")
      var key = cleanQuotes(kv[0].trim())
      var value = kv[1].trim()
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
},{"./config":2,"./util":7}],7:[function(require,module,exports){
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
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

},{"./obserable":5}],8:[function(require,module,exports){
//require("./specs/sample.js")
require("./specs/util.js")
require("./specs/obserable.js")
require("./specs/parser.js")
require("./specs/binder.js")

},{"./specs/binder.js":9,"./specs/obserable.js":10,"./specs/parser.js":11,"./specs/util.js":12}],9:[function(require,module,exports){
var binder = require("../../src/binder")

describe("Test binder", function() {
  it("Get tokens from different directive", function() {
    binder.getTokensFromDirective("token in tokens")
        .should.be.deep.equal(["token", "tokens"])
    binder.getTokensFromDirective({
          "color": "'red'",
          "'font-size'": "size() + 'px'",
          "name": "jerry()",
          "width": "width() + 'px'"
        }).should.be.deep.equal(["size", "jerry", "width"])
  })
})
},{"../../src/binder":1}],10:[function(require,module,exports){
var obserable = require("../../src/obserable.js")

describe("Test obserable", function() {
  describe("Test obserable string attribute", function() {
    var attr = null;

    before(function() {
      attr = obserable("i love you")
    })

    it("Initializing default value and get it.", function() {
      attr().should.be.equal("i love you")
    })

    it("Watcher function should be invoked when value is changed.", function() {
      var watcher = sinon.spy()
      attr.$$.watch(watcher)
      var val = "i love you, too"
      attr(val)
      watcher.should.have.been.calledWith(val, void 666, attr.$$)
      watcher.should.have.been.calledOnce
      attr().should.be.equal("i love you, too")
    })

  })
})
},{"../../src/obserable.js":5}],11:[function(require,module,exports){
var parser = require("../../src/parser")
var config = require("../../src/config")

describe("Test parser", function() {

  it("Get raw expressions from text.", function() {
    parser.getRawExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["{firstName + lastName}", "{name}"])
  })

  it("Get expression objects from text.", function() {
    parser.parse("{name() === true ? good() + 'ye': bad()}")
          .should.be.deep.equal([{
            rawExp: "{name() === true ? good() + 'ye': bad()}",
            exp: "name() === true ? good() + 'ye': bad()",
            tokens: ["name", "good", "bad"]
          }])
    parser.parse('{name() + "Good\' name is my love"}')
          .should.be.deep.equal([{
            rawExp: '{name() + "Good\' name is my love"}',
            exp: 'name() + "Good\' name is my love"',
            tokens: ["name"]
          }])
    parser.parse("Today totalCount is {parseFloat(totalCount()) + 'Hello'}, {name} should make it.")
          .should.be.deep.equal([{
            rawExp: "{parseFloat(totalCount()) + 'Hello'}",
            exp: "parseFloat(totalCount()) + 'Hello'",
            tokens: ["totalCount"]
          }, {
            rawExp: "{name}",
            exp: "name",
            tokens: ["name"]
          }])
  })

  it("Execute an expression.", function() {
    parser.exec({
      exp: "this.lucy + name() + 1",
      tokens: ["name"]
    }, {
      name: function() {
        return "Jerry!"
      },
      lucy: "good"
    }).should.be.equal("goodJerry!1")
  })

  it("Parse with custom open and close tag.", function() {
    config.openTag = "{{"
    config.closeTag = "}}"
    parser.parse("{{name() === true ? good(): bad()}}")
          .should.be.deep.equal([{
            rawExp: "{{name() === true ? good(): bad()}}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
  })

  it("Parse string directive.", function() {
    parser.parseDirective("users").should.be.equal("users")
    parser.parseDirective("user in users").should.be.equal("user in users")
  })

  it("Parse key-value directive.", function() {
    parser.parseDirective("color: red, 'font-size': '12px'")
          .should.be.deep.equal({
            "color": "red",
            "font-size": "'12px'"
          })
  })
})
},{"../../src/config":2,"../../src/parser":6}],12:[function(require,module,exports){
_ = require("../../src/util.js")

describe("Test utils functions", function() {
  it("map", function() {
    var arr = [1, 2, 3, 4]
    var newArr = _.map(arr, function(val) {
      return val * 2
    })
    for(var i = 0, len = arr.length; i < len; i++) {
      arr[i] = arr[i] * 2
    }
    arr.should.be.deep.equal(newArr)
  })
})
},{"../../src/util.js":7}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kaXJlY3RpdmVzL2luZGV4LmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kb20uanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvcGFyc2VyLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy91dGlsLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3QvZmFrZV8yMzE3Yzg1Yy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKVxudmFyIGRpcmVjdGl2ZXMgPSByZXF1aXJlKFwiLi9kaXJlY3RpdmVzXCIpXG5cbmV4cG9ydHMuYmluZFRleHQgPSBmdW5jdGlvbih0ZXh0Tm9kZSwga3VlKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICB2YXIgdGV4dCA9IHRleHROb2RlLnRleHRDb250ZW50XG4gIHZhciBleHByZXNzaW9ucyA9IHBhcnNlci5wYXJzZSh0ZXh0KVxuICBmdW5jdGlvbiB3cml0ZVJlc3VsdCgpIHtcbiAgICB2YXIgdGV4dFRwbCA9IHRleHRcbiAgICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICAgIHZhciByZXN1bHQgPSBwYXJzZXIuZXhlYyhleHByZXNzaW9uLCB2bSlcbiAgICAgIHRleHRUcGwgPSB0ZXh0VHBsLnJlcGxhY2UoZXhwcmVzc2lvbi5yYXdFeHAsIHJlc3VsdClcbiAgICB9KVxuICAgIHRleHROb2RlLnRleHRDb250ZW50ID0gdGV4dFRwbFxuICB9XG4gIHdyaXRlUmVzdWx0KClcbiAgd2F0Y2hBbGxUb2tlbnMoZXhwcmVzc2lvbnMsIGt1ZSwgd3JpdGVSZXN1bHQpXG59XG5cbmZ1bmN0aW9uIHdhdGNoQWxsVG9rZW5zKGV4cHJlc3Npb25zLCBrdWUsIGZuKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICB2YXIgdG9rZW5zID0ge31cbiAgXy5lYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByZXNzaW9uKSB7XG4gICAgXy5lYWNoKGV4cHJlc3Npb24udG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgICAgaWYgKHRva2Vuc1t0b2tlbl0pIHJldHVyblxuICAgICAgdG9rZW5zW3Rva2VuXSA9IDFcbiAgICB9KVxuICB9KVxuXG4gIGZvcih0b2tlbiBpbiB0b2tlbnMpIHtcbiAgICB2YXIgb2JzZXJhYmxlS2V5ID0gdm1bdG9rZW5dXG4gICAgaWYgKF8uaXNVbmRlZmluZWQob2JzZXJhYmxlS2V5KSkgY29udGludWVcbiAgICBpZiAoXy5pc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZm4pXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuYmluZERpciA9IGZ1bmN0aW9uKGF0dHIsIG5vZGUsIGt1ZSkge1xuICB2YXIgZGlyTmFtZSA9IGdldERpck5hbWUoYXR0cilcbiAgaWYoIWRpck5hbWUpIHJldHVyblxuICBpZighZGlyZWN0aXZlc1tkaXJOYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpcmVjdGl2ZVwiICsgZGlyTmFtZSArIFwiIGlzIG5vdCBmb3VuZC5cIilcbiAgfVxuICB2YXIgZGlyZWN0aXZlID0gcGFyc2VyLnBhcnNlRGlyZWN0aXZlKGF0dHIudmFsdWUpXG4gIHZhciB0b2tlbnMgPSBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlKGRpcmVjdGl2ZSlcbiAgdmFyIGRpck9iaiA9IGRpcmVjdGl2ZXNbZGlyTmFtZV1cbiAgZGlyT2JqLmJpbmQobm9kZSwgYXR0ciwga3VlKVxuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIGt1ZS52bVt0b2tlbl0uJCQud2F0Y2goZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwsIG9ic2VyYWJsZSkge1xuICAgICAgZGlyT2JqLnVwZGF0ZShub2RlLCBhdHRyLCBrdWUpXG4gICAgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShkaXJlY3RpdmUpIHtcbiAgaWYgKF8uaXNTdHJpbmcoZGlyZWN0aXZlKSkge1xuICAgIHJldHVybiBwYXJzZXIucGFyc2VUb2tlbnMoZGlyZWN0aXZlKVxuICB9IGVsc2Uge1xuICAgIHZhciBhbGxUb2tlbnMgPSBbXVxuICAgIGZvciAoa2V5IGluIGRpcmVjdGl2ZSkge1xuICAgICAgdmFyIHRva2VucyA9IHBhcnNlci5wYXJzZVRva2VucyhkaXJlY3RpdmVba2V5XSlcbiAgICAgIGFsbFRva2Vucy5wdXNoLmFwcGx5KGFsbFRva2VucywgdG9rZW5zKVxuICAgIH1cbiAgICByZXR1cm4gYWxsVG9rZW5zXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGlyTmFtZShhdHRyKSB7XG4gIHZhciBESVJfUkVHID0gbmV3IFJlZ0V4cCgoXCJeXCIgKyBjb25maWcuZGlyZWN0aXZlUHJlZml4ICsgXCItXCIgKyBcIihbXFxcXHdcXFxcZF0rKVwiKSlcbiAgdmFyIHJlc3VsdHMgPSBhdHRyLm5hbWUubWF0Y2goRElSX1JFRylcbiAgaWYocmVzdWx0cykge1xuICAgIHJldHVybiByZXN1bHRzWzFdXG4gIH1cbiAgcmV0dXJuIHZvaWQgNjY2XG59XG5cbmV4cG9ydHMuZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSA9IGdldFRva2Vuc0Zyb21EaXJlY3RpdmUiLCJ2YXIgY29uZmlnID0gZXhwb3J0c1xuXG5jb25maWcub3BlblRhZyA9IFwie1wiXG5jb25maWcuY2xvc2VUYWcgPSBcIn1cIlxuY29uZmlnLmRpcmVjdGl2ZVByZWZpeCA9IFwia1wiXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCIuLi9kb21cIilcblxuZXhwb3J0c1tcInNob3dcIl0gPSB7XG4gIGJpbmQ6IGZ1bmN0aW9uKGVsZSwgYXR0ciwga3VlKSB7XG4gICAgdGhpcy51cGRhdGUoZWxlLCBhdHRyLCBrdWUpXG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24oZWxlLCBhdHRyLCBrdWUpIHtcbiAgICAkKGVsZSkuY3NzKFwiZGlzcGxheVwiLCBrdWUudm1bYXR0ci52YWx1ZV0oKSA/IFwiYmxvY2tcIjogXCJub25lXCIpXG4gIH1cbn1cbiIsInZhciAkID0gZnVuY3Rpb24oZG9tKSB7XG4gIHJldHVybiB7XG4gICAgZWw6IGRvbSxcbiAgICBhdHRyOiBmdW5jdGlvbihhdHRyLCBuYW1lKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUoYXR0cilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKGF0dHIsIG5hbWUpXG4gICAgICB9XG4gICAgfSxcbiAgICBjc3M6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGVba2V5XVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5zdHlsZVtrZXldID0gdmFsdWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSAkIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUtleShhdHRyKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICB0aGlzLnZhbHVlID0gYXR0clxuICB0aGlzLndhdGNoZXJzID0gW11cbiAgZnVuY3Rpb24gZ2V0T3JTZXQoYXR0cikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdC52YWx1ZVxuICAgIH1cbiAgICB0aGF0Lm9sZFZhbHVlID0gdGhpcy52YWx1ZVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0Lm9sZFZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG5cbnZhciBTUEVDSUFMX0NIQVJTID0gLyhcXCpcXC5cXD9cXCtcXCRcXF5cXFtcXF1cXChcXClcXHtcXH1cXHxcXFxcXFwvKS9nXG52YXIgb3BlblRhZywgY2xvc2VUYWcsIEVYUF9SRUcsIFJFTU9WRV9SRUdcblxuZnVuY3Rpb24gbWFrZVJFRygpIHtcbiAgb3BlblRhZyA9IGNvbmZpZy5vcGVuVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcbiAgY2xvc2VUYWcgPSBjb25maWcuY2xvc2VUYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuXG4gIEVYUF9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcIltcXFxcU1xcXFxzXSs/XCIgKyBjbG9zZVRhZywgJ2cnKVxuICBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJ8XCIgKyBjbG9zZVRhZywgJ2cnKVxufVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQsaW4nXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICBtYWtlUkVHKClcbiAgdmFyIHJhd0V4cHMgPSBleHBvcnRzLmdldFJhd0V4cHModGV4dClcbiAgdmFyIGV4cHJlc3Npb25zID0gW11cbiAgXy5lYWNoKHJhd0V4cHMsIGZ1bmN0aW9uKHJhd0V4cCkge1xuICAgIHZhciBleHAgPSBleHBvcnRzLmdldEV4cEZyb21SYXdFeHAocmF3RXhwKVxuICAgIHZhciBleHByZXNzaW9uID0ge1xuICAgICAgcmF3RXhwOiByYXdFeHAsXG4gICAgICBleHA6IGV4cCxcbiAgICAgIHRva2VuczogZXhwb3J0cy5wYXJzZVRva2VucyhleHApIFxuICAgIH1cbiAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pXG4gIH0pXG4gIHJldHVybiBleHByZXNzaW9ucyBcbn1cblxuZXhwb3J0cy5wYXJzZVRva2VucyA9IGZ1bmN0aW9uKGV4cCkge1xuICAvLyBUT0RPOiBUbyBvcHRpbXplIHRoaXMgcmVndWxhciBleHByZXNzaW9uIHRvIGF2b2lkIHRoaXMgY2FzZTpcbiAgLy8gXCInSVxcJ20gJyArIG5hbWUoKVwiXG4gIHZhciBTVFJJTkdfUkVHID0gLygnW1xcc1xcU10qPycpfChcIltcXHNcXFNdKj9cIikvZ1xuICBleHAgPSBleHAucmVwbGFjZShTVFJJTkdfUkVHLCAnJylcbiAgdmFyIGNhbmRpZGF0ZXMgPSBleHAubWF0Y2goS0VZV09SRF9SRUcpIHx8IFtdXG4gIHZhciB0b2tlbnMgPSBbXVxuICBfLmVhY2goY2FuZGlkYXRlcywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgaWYgKElHTk9SRV9LRVlXT1JEU19SRUcudGVzdChjYW5kaWRhdGUpKSByZXR1cm5cbiAgICB0b2tlbnMucHVzaChjYW5kaWRhdGUpXG4gIH0pXG4gIHJldHVybiB0b2tlbnNcbn1cbiAgICBcblxuZXhwb3J0cy5leGVjID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgdm0pIHtcbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgdG9rZW5zID0gZXhwcmVzc2lvbi50b2tlbnNcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBhcmdzLnB1c2godm1bdG9rZW5dKVxuICB9KVxuICB2YXIgZXhwID0gXCJyZXR1cm4gXCIgKyBleHByZXNzaW9uLmV4cCArIFwiO1wiXG4gIHJldHVybiAobmV3IEZ1bmN0aW9uKHRva2VucywgZXhwKSkuYXBwbHkodm0sIGFyZ3MpXG59XG5cbmV4cG9ydHMucGFyc2VEaXJlY3RpdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgU1RSSU5HX0RJUl9SRUcgPSAvXltfJFxcd11bXyRcXHdcXGRcXHNdKiQvXG4gIHZhciB2YWx1ZSA9IHZhbHVlLnRyaW0oKVxuICBpZiAodmFsdWUubGVuZ3RoID09PSAwIHx8IFNUUklOR19ESVJfUkVHLnRlc3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHJldCA9IHt9XG4gICAgXy5lYWNoKHZhbHVlLnNwbGl0KFwiLFwiKSwgZnVuY3Rpb24obWFwKSB7XG4gICAgICB2YXIga3YgPSBtYXAuc3BsaXQoXCI6XCIpXG4gICAgICB2YXIga2V5ID0gY2xlYW5RdW90ZXMoa3ZbMF0udHJpbSgpKVxuICAgICAgdmFyIHZhbHVlID0ga3ZbMV0udHJpbSgpXG4gICAgICByZXRba2V5XSA9IHZhbHVlXG4gICAgfSlcbiAgICByZXR1cm4gcmV0XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW5RdW90ZXMoc3RyKSB7XG4gIHZhciBRVU9URV9SRUcgPSAvW1wiJ10vZ1xuICByZXR1cm4gc3RyLnJlcGxhY2UoUVVPVEVfUkVHLCBcIlwiKVxufVxubWFrZVJFRygpIiwidmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxuXG5leHBvcnRzLmlzT2JzZXJhYmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBvYmogPSBvYmouJCRcbiAgcmV0dXJuIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlS2V5KSB8fFxuICAgICAgICAgKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVBcnJheSlcbn1cblxuZXhwb3J0cy5tYXAgPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIHZhciByZXN1bHRzID0gW11cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjtpICsrKSB7XG4gICAgcmVzdWx0cy5wdXNoKGZuKGFycltpXSkpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuXG5leHBvcnRzLmVhY2ggPSBmdW5jdGlvbihhcnIsIGZuKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBmbihhcnJbaV0pXG4gIH1cbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIG9iaiA9PT0gdm9pZCA2NjY7XG59O1xuXG4vKipcbiAqIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLCBpc0Vycm9yLlxuICogc3RlYWwgZnJvbSB1bmRlcnNjb3JlOiBodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9kb2NzL3VuZGVyc2NvcmUuaHRtbFxuICovXG5leHBvcnRzLmVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCcsICdFcnJvciddLCBmdW5jdGlvbihuYW1lKSB7XG4gIGV4cG9ydHNbJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgfTtcbn0pO1xuIiwiLy9yZXF1aXJlKFwiLi9zcGVjcy9zYW1wbGUuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL3V0aWwuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL29ic2VyYWJsZS5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvcGFyc2VyLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9iaW5kZXIuanNcIilcbiIsInZhciBiaW5kZXIgPSByZXF1aXJlKFwiLi4vLi4vc3JjL2JpbmRlclwiKVxuXG5kZXNjcmliZShcIlRlc3QgYmluZGVyXCIsIGZ1bmN0aW9uKCkge1xuICBpdChcIkdldCB0b2tlbnMgZnJvbSBkaWZmZXJlbnQgZGlyZWN0aXZlXCIsIGZ1bmN0aW9uKCkge1xuICAgIGJpbmRlci5nZXRUb2tlbnNGcm9tRGlyZWN0aXZlKFwidG9rZW4gaW4gdG9rZW5zXCIpXG4gICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJ0b2tlblwiLCBcInRva2Vuc1wiXSlcbiAgICBiaW5kZXIuZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSh7XG4gICAgICAgICAgXCJjb2xvclwiOiBcIidyZWQnXCIsXG4gICAgICAgICAgXCInZm9udC1zaXplJ1wiOiBcInNpemUoKSArICdweCdcIixcbiAgICAgICAgICBcIm5hbWVcIjogXCJqZXJyeSgpXCIsXG4gICAgICAgICAgXCJ3aWR0aFwiOiBcIndpZHRoKCkgKyAncHgnXCJcbiAgICAgICAgfSkuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wic2l6ZVwiLCBcImplcnJ5XCIsIFwid2lkdGhcIl0pXG4gIH0pXG59KSIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi4vLi4vc3JjL29ic2VyYWJsZS5qc1wiKVxuXG5kZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlXCIsIGZ1bmN0aW9uKCkge1xuICBkZXNjcmliZShcIlRlc3Qgb2JzZXJhYmxlIHN0cmluZyBhdHRyaWJ1dGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGF0dHIgPSBudWxsO1xuXG4gICAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgICAgYXR0ciA9IG9ic2VyYWJsZShcImkgbG92ZSB5b3VcIilcbiAgICB9KVxuXG4gICAgaXQoXCJJbml0aWFsaXppbmcgZGVmYXVsdCB2YWx1ZSBhbmQgZ2V0IGl0LlwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwiV2F0Y2hlciBmdW5jdGlvbiBzaG91bGQgYmUgaW52b2tlZCB3aGVuIHZhbHVlIGlzIGNoYW5nZWQuXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHdhdGNoZXIgPSBzaW5vbi5zcHkoKVxuICAgICAgYXR0ci4kJC53YXRjaCh3YXRjaGVyKVxuICAgICAgdmFyIHZhbCA9IFwiaSBsb3ZlIHlvdSwgdG9vXCJcbiAgICAgIGF0dHIodmFsKVxuICAgICAgd2F0Y2hlci5zaG91bGQuaGF2ZS5iZWVuLmNhbGxlZFdpdGgodmFsLCB2b2lkIDY2NiwgYXR0ci4kJClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRPbmNlXG4gICAgICBhdHRyKCkuc2hvdWxkLmJlLmVxdWFsKFwiaSBsb3ZlIHlvdSwgdG9vXCIpXG4gICAgfSlcblxuICB9KVxufSkiLCJ2YXIgcGFyc2VyID0gcmVxdWlyZShcIi4uLy4uL3NyYy9wYXJzZXJcIilcbnZhciBjb25maWcgPSByZXF1aXJlKFwiLi4vLi4vc3JjL2NvbmZpZ1wiKVxuXG5kZXNjcmliZShcIlRlc3QgcGFyc2VyXCIsIGZ1bmN0aW9uKCkge1xuXG4gIGl0KFwiR2V0IHJhdyBleHByZXNzaW9ucyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5nZXRSYXdFeHBzKFwie2ZpcnN0TmFtZSArIGxhc3ROYW1lfSBpcyBteSB7bmFtZX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wie2ZpcnN0TmFtZSArIGxhc3ROYW1lfVwiLCBcIntuYW1lfVwiXSlcbiAgfSlcblxuICBpdChcIkdldCBleHByZXNzaW9uIG9iamVjdHMgZnJvbSB0ZXh0LlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIucGFyc2UoXCJ7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpICsgJ3llJzogYmFkKCl9XCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6IFwie25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKSArICd5ZSc6IGJhZCgpfVwiLFxuICAgICAgICAgICAgZXhwOiBcIm5hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKSArICd5ZSc6IGJhZCgpXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIiwgXCJnb29kXCIsIFwiYmFkXCJdXG4gICAgICAgICAgfV0pXG4gICAgcGFyc2VyLnBhcnNlKCd7bmFtZSgpICsgXCJHb29kXFwnIG5hbWUgaXMgbXkgbG92ZVwifScpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6ICd7bmFtZSgpICsgXCJHb29kXFwnIG5hbWUgaXMgbXkgbG92ZVwifScsXG4gICAgICAgICAgICBleHA6ICduYW1lKCkgKyBcIkdvb2RcXCcgbmFtZSBpcyBteSBsb3ZlXCInLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCJdXG4gICAgICAgICAgfV0pXG4gICAgcGFyc2VyLnBhcnNlKFwiVG9kYXkgdG90YWxDb3VudCBpcyB7cGFyc2VGbG9hdCh0b3RhbENvdW50KCkpICsgJ0hlbGxvJ30sIHtuYW1lfSBzaG91bGQgbWFrZSBpdC5cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7cGFyc2VGbG9hdCh0b3RhbENvdW50KCkpICsgJ0hlbGxvJ31cIixcbiAgICAgICAgICAgIGV4cDogXCJwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSkgKyAnSGVsbG8nXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcInRvdGFsQ291bnRcIl1cbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICByYXdFeHA6IFwie25hbWV9XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZVwiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCJdXG4gICAgICAgICAgfV0pXG4gIH0pXG5cbiAgaXQoXCJFeGVjdXRlIGFuIGV4cHJlc3Npb24uXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5leGVjKHtcbiAgICAgIGV4cDogXCJ0aGlzLmx1Y3kgKyBuYW1lKCkgKyAxXCIsXG4gICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICB9LCB7XG4gICAgICBuYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFwiSmVycnkhXCJcbiAgICAgIH0sXG4gICAgICBsdWN5OiBcImdvb2RcIlxuICAgIH0pLnNob3VsZC5iZS5lcXVhbChcImdvb2RKZXJyeSExXCIpXG4gIH0pXG5cbiAgaXQoXCJQYXJzZSB3aXRoIGN1c3RvbSBvcGVuIGFuZCBjbG9zZSB0YWcuXCIsIGZ1bmN0aW9uKCkge1xuICAgIGNvbmZpZy5vcGVuVGFnID0gXCJ7e1wiXG4gICAgY29uZmlnLmNsb3NlVGFnID0gXCJ9fVwiXG4gICAgcGFyc2VyLnBhcnNlKFwie3tuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7e25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKCl9fVwiLFxuICAgICAgICAgICAgZXhwOiBcIm5hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKClcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiLCBcImdvb2RcIiwgXCJiYWRcIl1cbiAgICAgICAgICB9XSlcbiAgfSlcblxuICBpdChcIlBhcnNlIHN0cmluZyBkaXJlY3RpdmUuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZURpcmVjdGl2ZShcInVzZXJzXCIpLnNob3VsZC5iZS5lcXVhbChcInVzZXJzXCIpXG4gICAgcGFyc2VyLnBhcnNlRGlyZWN0aXZlKFwidXNlciBpbiB1c2Vyc1wiKS5zaG91bGQuYmUuZXF1YWwoXCJ1c2VyIGluIHVzZXJzXCIpXG4gIH0pXG5cbiAgaXQoXCJQYXJzZSBrZXktdmFsdWUgZGlyZWN0aXZlLlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIucGFyc2VEaXJlY3RpdmUoXCJjb2xvcjogcmVkLCAnZm9udC1zaXplJzogJzEycHgnXCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKHtcbiAgICAgICAgICAgIFwiY29sb3JcIjogXCJyZWRcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiJzEycHgnXCJcbiAgICAgICAgICB9KVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcbn0pIl19
