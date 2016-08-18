export function State() {
}

export default function state() {
  return new State()
}

State.prototype = {

    get: function(key,_default) { 
      var loc = document.location.search
        , _default = _default || false;

      if (loc.indexOf(key) == -1) return _default

      var f = loc.split(key + "=")[1];
      f = f.split("&")[0]
      return JSON.parse(decodeURIComponent(f))
    }
  , set: function(key,val) {
      var loc = document.location.search

      var s = "";
      if (loc.indexOf(key) > -1 ) {
        try {s += loc.split(key + "=")[0] } catch(e) {}
        try {s += loc.split(key + "=")[1].split("&")[1].join("&") } catch(e) {}
        if (s.length > 1) s += "&"
        s += key + "="
      } 

      var search = loc.indexOf("?") > -1 ? s : "?" + key + "="

      history.pushState({}, "", loc.pathname + search +  JSON.stringify(val) )

    }
}
