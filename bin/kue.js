(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function Kue() {
}

function compileNode(node) {
    if (node.nodeType === 1) {
      console.log('ele', node)
      var children = node.childNodes;
      compileAttr(node)
      for(var i = 0, len = children.length; i < len; i++) {
        var el = children[i]
        compileNode(el)
      }
    } if (node.nodeType === 3) {
      console.log('text', node);
      linkText(node, vm)
      //node.textContent = "jerry is good"
    }
}

function compileAttr(node) {
  var attrs = node.attributes;
  for (var i = 0, len = attrs.length; i < len; i++) {
    console.log('attr', attrs[i])
  }
}
compileNode(document.getElementById("jerry"))

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2Zha2VfMmQyZDVkOGEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gS3VlKCkge1xufVxuXG5mdW5jdGlvbiBjb21waWxlTm9kZShub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdlbGUnLCBub2RlKVxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgICAgY29tcGlsZUF0dHIobm9kZSlcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGNvbXBpbGVOb2RlKGVsKVxuICAgICAgfVxuICAgIH0gaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCd0ZXh0Jywgbm9kZSk7XG4gICAgICBsaW5rVGV4dChub2RlLCB2bSlcbiAgICAgIC8vbm9kZS50ZXh0Q29udGVudCA9IFwiamVycnkgaXMgZ29vZFwiXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb21waWxlQXR0cihub2RlKSB7XG4gIHZhciBhdHRycyA9IG5vZGUuYXR0cmlidXRlcztcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY29uc29sZS5sb2coJ2F0dHInLCBhdHRyc1tpXSlcbiAgfVxufVxuY29tcGlsZU5vZGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJqZXJyeVwiKSlcbiJdfQ==
