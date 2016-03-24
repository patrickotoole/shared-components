(function(d,w,RB) {
  w.RB = RB;
  var sources = atob(RB.source).split("|")
    , RB = RB
    , baseUrl = "https://getrockerbox.com/pixel.gif?"
    , anURL = "https://secure.adnxs.com/px?"
    , source = sources[0]
    , encReferrer = encodeURIComponent(w.location.href)
    , processSource = function(x) { 
        s = x.split(":")
        if (s.length == 1) return { an_seg: s[0] , type: "imp" }
        if (s.length == 2) return { seg: s[0] , id: s[1] , type: "conv" }
      }
    , mappings = {}
    , _ = "view|purchase|signup|login".split("|").map(function(type,i) {
        mappings[type] = processSource(sources[i+1])
      })
    , extend = function(base,ext) {
        Object.keys(ext).map(function(k){ base[k] = ext[k] })
      }
    , HTTPBuildQuery = function(values, arg_separator) {
        var key, use_val, use_key
          , tmp_arr = []
          , arg_separator = arg_separator || "&";

        Object.keys(values).map(function(key) {
          var val = values[key];
          if (val) {
            use_val = encodeURIComponent(val.toString());
            use_key = encodeURIComponent(key);
            tmp_arr[tmp_arr.length] = use_key + '=' + use_val;
          }
        });

        return tmp_arr.join(arg_separator);
      }
    , fire = function(href) {
        var ping = new Image();
        ping.src = href;
      }
    , trackConv = function(v) {
        var obj = { t: 2 };
        ["id","seg","order_id","value"].map(function(k){
          if (v[k]) obj[k] = v[k]
        });
        
        var valuesString = HTTPBuildQuery(obj)
          , url = anURL + valuesString;

        fire(url); 
      }


    RB.track = function(action, values) {
      var values = values || {}
        , v = {
            pageReferrer: document.referrer
          , action: action
          , source: source
        }
        , obj = mappings[action] || {};

      extend(v,obj);
      extend(v,values);

      var valuesString = HTTPBuildQuery(v)
        , url = baseUrl + valuesString;

      fire(url);
      if (v.type == "conv") trackConv(v);

    }
    RB.track("view")
    RB.queue.map(function(args){ RB.track(args[0],args[1]) })
    RB.queue = []

})(document,window,window.RB || {})
