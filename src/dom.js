var _ = require("./util")

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
    removeAttr: function(attr) {
      this.el.removeAttribute(attr)
    },
    css: function(key, value) {
      if (arguments.length === 1) {
        this.el.style[key]
      } else {
        this.el.style[key] = value
      }
    },
    on: function(event, fn)  {
      var el  = this.el
      if (el.addEventListener) {
        el.addEventListener(event, fn, false);
      } else if (el.attachEvent) {
        el.attachEvent("on" + event, fn)
      } else {
        el[event] = fn
      }
      return this
    },
    addClass: function(className) {
      var CLASS_REG = new RegExp("(^|\\s)" + className + "(\\s|$)")
      var oldClass = _.trim(this.el.className)
      if (!CLASS_REG.test(oldClass)) {
        var prefix = (this.el.className.length === 0)
          ? ""
          : " "
        this.el.className += (prefix + className)
      }
      return this
    },
    removeClass: function(className) {
      var oldClass = this.el.className
      var CLASS_REG = new RegExp("(^|\\s)" + className + "(\\s|$)")
      this.el.className = _.trim(oldClass.replace(CLASS_REG, "$1"))
    },
    html: function(content) {
      if(arguments.length === 0) {
        return this.el.innerHTML
      } else {
        this.el.innerHTML = content
      }
    },
    remove: function() {
      this.el.parentNode.removeChild(this.el)
      return this
    },
    before: function(node) {
      this.el.parentNode.insertBefore(node, this.el)
      return this
    }
  }
}

$.getDOMNodeFromTemplate = function(template) {
  var div = document.createElement("div")
  div.innerHTML = template
  return div.children[0]
}

$.frag = function() {
  return document.createDocumentFragment()
}

$.ele = function(eleName) {
  return document.createElement(eleName)
}

module.exports = $
