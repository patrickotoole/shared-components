window.analytics = window.analytics || {}
!(function(w) {

w.google = function() {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', 'UA-50457693-1', 'rockerbox.com');
  ga('require', 'displayfeatures');
  ga('send', 'pageview');
}

w.mixpanel = function() {
  (function(f,b){if(!b.__SV){var a,e,i,g;window.mixpanel=b;b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config people.set people.set_once people.increment people.append people.track_charge people.clear_charges people.delete_user".split(" "); for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,e,d])};b.__SV=1.2;a=f.createElement("script");a.type="text/javascript";a.async=!0;a.src="//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";e=f.getElementsByTagName("script")[0];e.parentNode.insertBefore(a,e)}})(document,window.mixpanel||[]); mixpanel.init("a48368904183cf405deb90881e154bd8");
}

w.drift = function() {
  !function() {
    var t;
    return t = window.driftt = window.drift = window.driftt || [], t.init ? void 0 : t.invoked ? void (window.console && console.error && console.error("Drift snippet included twice.")) : (t.invoked = !0, 
    t.methods = [ "identify", "track", "reset", "debug", "show", "ping", "page", "hide", "off", "on" ], 
    t.factory = function(e) {
      return function() {
        var n;
        return n = Array.prototype.slice.call(arguments), n.unshift(e), t.push(n), t;
      };
    }, t.methods.forEach(function(e) {
      t[e] = t.factory(e);
    }), t.load = function(t) {
      var e, n, o, r;
      e = 3e5, r = Math.ceil(new Date() / e) * e, o = document.createElement("script"), 
      o.type = "text/javascript", o.async = !0, o.crossorigin = "anonymous", o.src = "https://js.driftt.com/include/" + r + "/" + t + ".js", 
      n = document.getElementsByTagName("script")[0], n.parentNode.insertBefore(o, n);
    });
  }();
  drift.SNIPPET_VERSION = '0.2.0'
  //drift.load('fcx9bk8wvznu')
}

w.facebook = function() {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  
  fbq('init', '448279782031290');
}

w.hindsight = function() {
(function(d,RB) {window.RB=RB;RB.queue=[];RB.track=RB.track||function(){RB.queue.push(Array.prototype.slice.call(arguments))};RB.initialize=function(s){RB.source=s};var a = d.createElement("script");  a.type="text/javascript"; a.async=!0; a.src="https://getrockerbox.com/assets/xyz.js"; f=d.getElementsByTagName("script")[0]; f.parentNode.insertBefore(a,f);})(document,window.RB || {});
RB.initialize("aGluZHNpZ2h0fDU4OTM4NDJ8NTg5Mzg0Mzo3NDE0MDF8NTg5Mzg0NDo3NDE0MDJ8NTg5Mzg0NQ==");
}

AN = {
    signup: function() {
      var ping = new Image();
      ping.src = "https://secure.adnxs.com/px?id=741402&t=2";
    }
  , conversion: function() {
      var ping = new Image();
      ping.src = "https://secure.adnxs.com/px?id=741401&t=2";
    }
}

w.events = {
    "page_load": function(email) {
      mixpanel.track("signup - page_load");
      fbq('track', "PageView");
    }

  , "email_submitted": function(email) {
      mixpanel.identify(email);
      mixpanel.people.set({
          "$email": email
        , "uuid": document.cookie.split("an_uuid=")[1].split(";")[0]
      })

      mixpanel.track("signup - email_submitted");
      fbq('track', 'InitiateCheckout');
      RB.track("email_submitted", {"an_seg": 5893842, "type": "imp" })
      AN.signup()
    }

  , "domain_submitted": function(domain,advertiser) {
      mixpanel.people.set({
          "domain": domain
        , "advertiser": advertiser
      })
      mixpanel.track("signup - domain_submitted");
      RB.track("domain_submitted", {"an_seg": 5893842, "type": "imp"})
    }

  , "implementation_error": function() {
      mixpanel.track("signup - implementation_error");
      RB.track("implementation_error", {"an_seg": 5893842, "type": "imp" })
    }

  , "pixel_implemented": function() {
      mixpanel.track("signup - pixel_implemented");
      fbq('track', 'CompleteRegistration');
      RB.track("pixel_implemented", {"an_seg": 5893842, "type": "imp" })
      AN.conversion()
    }
  , "skip_implementation": function() {
      mixpanel.track("signup - skip_implemented");
      RB.track("skip_implemented", {"an_seg": 5893842, "type": "imp" })
    }


  , "account_activated": function() {
      mixpanel.track("signup - account_activated");
      RB.track("account_activated", {"an_seg": 5893842, "type": "imp" })
    }

  , "error": function(err) {
      mixpanel.track("signup - error", {"error": err});
      RB.track("error", {"an_seg": 5893842, "type": "imp" })
    }



}

})(window.analytics)
