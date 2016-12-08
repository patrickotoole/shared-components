export function QS(state) {
  //this.state = state
  var self = this;

  this._encodeObject = function(o) {
    return JSON.stringify(o)
  }

  this._encodeArray = function(o) {
    return JSON.stringify(o)
  }
}

QS.prototype = {
    to: function(state) {
      var self = this

      var params = Object.keys(state).map(function(k) {

        var value = state[k]
          , o = value;

        if (value && (typeof(value) == "object") && (value.length > 0)) {
          o = self._encodeArray(value)
        } else if (typeof(value) == "object") {
          o = self._encodeObject(value)
        } 

        return k + "=" + encodeURIComponent(o) 

      })

      return "?" + params.join("&");
      
    }
  , from: function(qs) {
      var query = {};
      var a = qs.substr(1).split('&');
      for (var i = 0; i < a.length; i++) {
          var b = a[i].split('=');
          
          query[decodeURIComponent(b[0])] = (decodeURIComponent(b[1] || ''));
          var _char = query[decodeURIComponent(b[0])][0] 
          if ((_char == "{") || (_char == "[")) query[decodeURIComponent(b[0])] = JSON.parse(query[decodeURIComponent(b[0])])
      }
      return query;
    }
}

function qs(state) {
  return new QS(state)
}

qs.prototype = QS.prototype

export default qs;
