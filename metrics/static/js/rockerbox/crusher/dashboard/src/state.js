// TODO: unit tests

export function State(loc) {
  this._loc = loc
  this._parse = function parseQuery(qstr) {
        var query = {};
        var a = qstr.substr(1).split('&');
        for (var i = 0; i < a.length; i++) {
            var b = a[i].split('=');
            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
        }
        return query;
    }
}

export default function state(loc) {
  return new State(loc)
}

State.prototype = {

    get: function(key,_default) { 
      var loc = this._loc || document.location.search
        , _default = _default || false;

      if (loc.indexOf(key) == -1) return _default


      var f = this._parse(loc)[key]

      try {
        return JSON.parse(f)
      } catch(e) {
        return f
      }
    }
  , set: function(key,val) {
      var loc = this._loc || document.location.search

      var parsed = this._parse(loc)

      parsed[key] = val

      var s = "?"
      Object.keys(parsed).map(function(k) {
        if (typeof(parsed[k]) == "object") s += k + "=" + JSON.stringify(parsed[k]) + "&"
        else s += k + "=" + parsed[k] + "&"
      })
      
      history.pushState({}, "", document.location.pathname + s.slice(0,-1))

    }
}
