// TODO: unit tests

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
        try {
          s += loc.split(key + "=")[0] 
          if (s.slice(-1)[0] == "&") s = s.slice(0,-1)
        } catch(e) {}

        try {
          s += loc.split(key + "=")[1].split("&").slice(1).filter(function(x) { return x.length}).join("&") } catch(e) {}
      } else {
        s = loc
      }

      s += "&" + key + "="


      var search = (s.indexOf("?") == 0) ? 
        s : "?" + s.slice(1)
        
      
      history.pushState({}, "", document.location.pathname + search +  JSON.stringify(val) )

    }
}
