import accessor from './helpers'
import email from './step/email'
import domain from './step/domain'
import pixel from './step/pixel'
import password from './step/password'
import example from './step/example'
import splash from './step/splash'
import progress from './progress'
import integrations from './step/integrations'
import integrations_example from './step/integrations_example'






function getPermissions() {}

function getNonce() {
  var s = window.location.search;
  return (s.indexOf("nonce") > -1 ) ?  s.split("nonce=")[1].split("&")[0] : "";
}

function getNeedsSetup() {
  var s = window.location.search;
  return (s.indexOf("setup") > -1 ) 
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
  this._pixel_setup = getNeedsSetup()

  this._slide = 0
  this._forced_slides = []
}

function chooseSlides(data) {
  var slides = ["example","pixel"]

  if (!!data.nonce) {
    if (!data.pixel_setup) slides.pop()
    slides.push("password")
    return slides.reverse()
  }

  if (!data.advertiser_id || data.advertiser_id == 0) slides.push("domain")
  if (!data.permissions) slides.push("email")

  return slides.reverse()

  
}

export default function signup(target) {
  return new Signup(target)
}

Signup.prototype = {
    draw: function() {


      this._target

      this._data.nonce = this._nonce
      this._data.uid = getUID()
      this._data.pixel_setup = this._pixel_setup

      this._slides = this._forced_slides.length ? this._forced_slides : chooseSlides(this._data)


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

      var current = this._slides[this._slide]

      var path_joiner = document.location.search.indexOf("?") > -1 ? "&" : "?"

      var path = document.location.pathname + document.location.search 
      if (document.location.search.indexOf("step=" + current) == -1) path += path_joiner + "step=" + current
      history.replaceState({}, "", path);

      if ((["email","splash"].indexOf(current) == -1) || (document.location.pathname.indexOf("digest") == -1))
        this._progress = progress(this._progress_target)
          .data(this._slides)
          .selected(this._slide)
          //.on("click",this.show.bind(this))
          .draw()

      return this
    }
  , progress_target: function(val) { return accessor.bind(this)("progress_target",val) }
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
        .on("success",function(){ self.on("password")(arguments); document.location = document.location.pathname })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

      d3.select(t).selectAll("input").node().focus()
        
        
    }
  , render_splash: function(t) {
      var self = this;
      splash(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("email")(arguments); document.location.reload()})
        .on("error",function(err){ self.on("error")(err); })
        .draw()

      d3.select(t).selectAll("input").node().focus()


    }
  , render_email: function(t) {
      var self = this;
      email(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("email")(arguments); self.next() })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

      d3.select(t).selectAll("input").node().focus()


    }
  , render_domain: function(t) {
      var self = this;
      domain(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("domain")(arguments); self.next() })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

      d3.select(t).selectAll("input").node().focus()


    }
  , render_pixel: function(t) {
      var self = this;
      pixel(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("pixel")(arguments); self.next() })
        .on("pixel_skip",function(){ self.on("pixel_skip")(arguments); self.next() })
        .on("pixel_fail",function(){ self.on("pixel_fail")(arguments); })
        .on("error",function(err){ self.on("error")(err); })
        .draw()


    }
  , render_example: function(t) {
      var self = this;
      example(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("example")(arguments); })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

    }
  , render_integrations_example: function(t) {
      var self = this;
      integrations_example(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("example")(arguments); })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

    }
  , render_integrations: function(t) {
      var self = this;
      integrations(d3.select(t))
        .data(this._data)
        .on("success",function(){ self.on("example")(arguments); })
        .on("error",function(err){ self.on("error")(err); })
        .draw()

    }


  , data: function(val) { return accessor.bind(this)("data",val) }
  , forced_slides: function(val) { return accessor.bind(this)("forced_slides",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }

}
