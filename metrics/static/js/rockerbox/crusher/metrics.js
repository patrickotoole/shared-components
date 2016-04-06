var RB = RB || {};
RB.crusher = RB.crusher || {};
RB.crusher.metrics = (function(metrics) {

  metrics.init = function(advertiser_data, current_user) {

    setTimeout(function(){
      var user_type = document.cookie.split("user_type=")[1].split(";")[0];
      switch (user_type) {
        case 'rockerbox':
          heap.identify({
            handler: 'Rockerbox',
            name: 'Rockerbox',
            email: 'support@rockerbox.com'
          });

          window.intercomSettings = {
            app_id: "rvo8kuih",
            name: "Rockerbox",
            email: "support@rockerbox.com",
            created_at: 1312182000
          };
          (function() {
            var w = window;
            var ic = w.Intercom;
            if (typeof ic === "function") {
              ic('reattach_activator');
              ic('update', intercomSettings);
            } else {
              var d = document;
              var i = function() {
                i.c(arguments)
              };
              i.q = [];
              i.c = function(args) {
                i.q.push(args)
              };
              w.Intercom = i;

              function l() {
                var s = d.createElement('script');
                s.type = 'text/javascript';
                s.async = true;
                s.src = 'https://widget.intercom.io/widget/kbtc5999';
                var x = d.getElementsByTagName('script')[0];
                x.parentNode.insertBefore(s, x);
              }
              if (w.attachEvent) {
                w.attachEvent('onload', l);
              } else {
                l(false)
              }
            }
          })()
          break;
        case 'client':
          var user = {
            'id': current_user.id,
            'advertiser': advertiser_data.advertiser_name,
            'name': '(' + current_user.first_name + ' ' + current_user.last_name + ')',
            'email': current_user.user_email
          };

          heap.identify({
            handler: user.id,
            name: user.name,
            email: user.email
          });

          window.intercomSettings = {
            app_id: "o6ats3cn",
            user_id: user.id,
            name: user.name,
            email: user.email,
            created_at: 1312182000
          };
          (function() {
            var w = window;
            var ic = w.Intercom;
            if (typeof ic === "function") {
              ic('reattach_activator');
              ic('update', intercomSettings);
            } else {
              var d = document;
              var i = function() {
                i.c(arguments)
              };
              i.q = [];
              i.c = function(args) {
                i.q.push(args)
              };
              w.Intercom = i;

              function l() {
                var s = d.createElement('script');
                s.type = 'text/javascript';
                s.async = true;
                s.src = 'https://widget.intercom.io/widget/xu33kr1z';
                var x = d.getElementsByTagName('script')[0];
                x.parentNode.insertBefore(s, x);
              }
              if (w.attachEvent) {
                w.attachEvent('onload', l);
              } else {
                l(false)
              }
            }
          })()
          break;
      }

      Intercom('trackEvent', 'Page Load', {
        'url': window.location.href
      });
    }, 2000)
  }

  return metrics
})(RB.crusher.metrics || {})



