(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('component', ['exports'], factory) :
	(factory((global.media_plan = global.media_plan || {})));
}(this, (function (exports) { 'use strict';

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
  return returnValue;
}

__$styleInject(".expansion-urls-title {\n  width:50%;\n  height:36px;\n  line-height:36px;\n  display:inline-block;\n  vertical-align:top;\n}\n.expansion-urls-title .title {\n  width:265px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n\n.expansion-urls-titl .view {\n  width:40px;\n  margin-left:20px;\n  margin-right:20px;\n  font-weight:bold;\n  display:inline-block;\n  vertical-align:top;\n}\n.legend {\n  width:144px;\n  height:36px;\n  vertical-align:top;\n}\n\n",undefined);

var version = "0.0.1";

exports.version = version;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkaWFfcGxhbi5qcyIsInNvdXJjZXMiOlsiYnVuZGxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciB2ZXJzaW9uID0gXCIwLjAuMVwiOyBleHBvcnQgKiBmcm9tIFwiLi4vaW5kZXhcIjsgZXhwb3J0IHt2ZXJzaW9ufTsiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxBQUFDLEFBQTBCOzs7Ozs7In0=
