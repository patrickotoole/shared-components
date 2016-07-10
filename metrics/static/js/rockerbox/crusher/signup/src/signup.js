import accessor from './helpers'
import email from './step/email'
import domain from './step/domain'
import pixel from './step/pixel'
import password from './step/password'
import example from './step/example'
import splash from './step/splash'
import progress from './progress'



function getPermissions() {}

function getNonce() {
  var s = window.location.search;
  return (s.indexOf("nonce") > -1 ) ?  s.split("nonce=")[1].split("&")[0] : "";
}

function getUID() {
  try {
    return document.cookie.split("an_uuid=")[1].split(";")[0];
  } catch(e) {
    var img = new Image()
    img.src = "http://ib.adnxs.com/getuid?" + document.location.origin + "/crusher/pixel/cookie?uid=$UID"
    return 0

  }
}


export function Signup(target) {
  var _null_fn = function() {}
  this._on = {
      email: _null_fn
    , password: _null_fn
    , domain: _null_fn
    , pixel: _null_fn
  }
  this._target = target;
  this._wrapper = this._target;
  this._uid = getUID()
  this._nonce = getNonce()
  this._slide = 0
}

export default function signup(target) {
  return new Signup(target)
}

Signup.prototype = {
    draw: function() {
      this._target

      this._data.nonce = this._nonce
      this._data.uid = getUID()


      this._slides = !!this._data.nonce ?
        ["password","example"]                 : !this._data.permissions ?
        ["email", "domain", "pixel","example"] : this._data.advertiser_id == 0 ?
        ["domain", "pixel","example"]          : ["pixel","example"];

      if (document.location.pathname.indexOf("digest") > -1) {
        this._slides = this._slides.map(function(s) { return s == "email" ? "splash" : s })
      }

      var self = this;
      this._slideshow = start.slideshow(this._target)
        .data(this._slides.map(function(s) { 
          return function() {
              return self["render_" + s].bind(self)(this)
            }
        }))
        .show_slide(this._slide)


      this._slideshow
        .draw()

      if (document.location.pathname.indexOf("digest") == -1) 
        this._progress = progress(this._target)
          .data(this._slides)
          .selected(this._slide)
          .on("click",this.show.bind(this))
          .draw()

      return this
    }
  , next: function() {
      this._slide += 1
      this.draw()
    }
  , show: function(i) {
      if (this._slide > i) this._slide = i
      this.draw()
    }
  , render_password: function(t) {
      var self = this;
      password(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("password")(arguments); self.next()})
        .draw()
        
        
    }
  , render_splash: function(t) {
      var self = this;
      splash(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("email")(arguments); document.location.reload()})
        .draw()

    }
  , render_email: function(t) {
      var self = this;
      email(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("email")(arguments); self.next() })
        .draw()

    }
  , render_domain: function(t) {
      var self = this;
      domain(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("domain")(arguments); self.next() })
        .draw()

    }
  , render_pixel: function(t) {
      var self = this;
      pixel(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("pixel")(arguments); self.next() })
        .on("pixel_fail",function(){ self.on("pixel_fail")(arguments); })
        .draw()
    }
  , render_example: function(t) {
      var self = this;
      example(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("example")(arguments); })
        .draw()
    }




  , data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }

}
