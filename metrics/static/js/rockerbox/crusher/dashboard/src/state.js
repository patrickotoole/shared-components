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
        if (typeof(parsed[k]) == "object") {

          var o = parsed[k]
          if (o.length == undefined) {
            var o2 = {}
  
            Object.keys(o).map(function(x) { o2[x] = encodeURIComponent(o[x]) })
            s += k + "=" + JSON.stringify(o2) + "&"
          } else {
            var o1 = []
  
            o.map(function(i) {
              if (typeof(i) == "number") return o1.push(i)
              if (typeof(i) == "string") return o1.push(encodeURIComponent(i))

              var o2 = {}
              Object.keys(i).map(function(x) { o2[x] = encodeURIComponent(i[x]) })
              o1.push(o2)
            })
  
            s += k + "=" + JSON.stringify(o1) + "&"
          }
        }
        else s += k + "=" + parsed[k] + "&"
      })
      
      history.pushState({}, "", document.location.pathname + s.slice(0,-1))

    }
}
