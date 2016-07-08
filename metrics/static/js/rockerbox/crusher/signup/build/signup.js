(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('start'), require('queue')) :
  typeof define === 'function' && define.amd ? define('signup', ['exports', 'd3', 'start', 'queue'], factory) :
  factory((global.signup = {}),global.d3$1,global.start$1,global.queue$1);
}(this, function (exports,d3$1,start$1,queue$1) { 'use strict';

  function accessor(attr, val) {
    if (val === undefined) return this["_" + attr]
    this["_" + attr] = val
    return this
  }

  function Message(target) {
    this._target = target;
  }

  function message(target) {
    return new Message(target)
  }

  Message.prototype = {
      draw: function() {
        this._target

        this._message = d3_updateable(this._target,".message","div")
          .classed("message",true)
          .text(this._text)

        return this
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , update: function(val) {
        this.text(val)
        this.draw()
      }
  }

  function validate$1(email) {
    var split = email.split("@"),
      has_at = split.length > 1,
      has_to = split[0].length > 0,
      has_domain = split.length > 1 && split[1].length > 3;

    return has_at && has_to && has_domain
  }

  function postEmail(obj,callback) {

    d3.xhr("/signup")
      .post(JSON.stringify(obj), callback)
    
  }

  function Email(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function email(target) {
    return new Email(target)
  }

  Email.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()
        this.render_message()

        return this
      }
    , run: function() {
        
        var email = this._input.node().value,
          is_valid = validate$1(email);

        var obj = { "email": email, "username": email }
        var self = this;

        if (!is_valid) return self._on["fail"]("Invalid email")

        postEmail(obj, function(err,x) {
          if (!err) return self._on["success"](x)
          return self._on["fail"](JSON.parse(err.response).error)
        })
        
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Getting Started")
          .subtitle("Setup is easy and takes less than two minutes. Enter your email to get started. ")
          .left("")
          .right("")
          .draw()
      }
    , render_envelope: function() {
        this._env = start.envelope(this._stage._stage)
          .data([])
          .title("What's your email?")
          .description("")
          .button("next")
          .click(this.run.bind(this))
          .draw()

        this._stage._stage.selectAll(".envelope")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll("h3")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll(".envelope_description")
          .style("margin-bottom","-20px")

        this._row = d3_updateable(this._env._desc_wrapper,".row","div")
          .classed("row",true)
      
        this._input = d3_updateable(this._row,"input","input")
          .attr("placeholder","email")
          .style("width","300px")
      

      }
    , render_message: function() {
        this._message = message(this._row)
          .text("")
          .draw()
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function parse(domain) {
    var domain = domain.replace("http://","").replace("https://","").replace("www.","")
      , split = domain.split(".")
      , pixel_source_name = split.slice(0,-1).join("");

    return {
        split: split
      , domain: domain
      , pixel_source_name: pixel_source_name
    }
  }

  function validate(parsed) {
    var split = parsed.split
    return (split.length > 1) && (split[0].length > 2) && (split[1].length > 1)
  }

  function postAdvertiser(obj,callback) {
    d3.xhr("/advertiser")
      .post(JSON.stringify(obj), callback)
  }

  function postPixel(obj,callback) {
    d3.xhr("/pixel")
      .post(JSON.stringify(obj), callback)
  }



  function Domain(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function domain(target) {
    return new Domain(target)
  }

  Domain.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()
        this.render_message()

        return this
      }
    , run: function() {
        
        var _domain = this._input.node().value,
          parsed = parse(_domain),
          is_valid = validate(parsed);

        var obj = { 
            "client_sld": parsed.domain
          , "pixel_source_name": parsed.pixel_source_name
          , "advertiser_name": parsed.pixel_source_name
        }
        var self = this;

        if (!is_valid) return self._on["fail"]("Invalid domain")

        self._message.update("Creating Advertiser.")

        postAdvertiser(obj, function(err,x) {
          if (!err) {
            self._message.update("Creating Pixels.")
            queue()
              .defer(postPixel, {"segment_name": "All Pages", "segment_type":"segment"})
              .defer(postPixel, {"segment_name": "Signup", "segment_type":"conversion"})
              .defer(postPixel, {"segment_name": "Purchase", "segment_type":"conversion"})
              .defer(postPixel, {"segment_name": "Logged In", "segment_type":"segment"})
              .await(function(error,_1,_2,_3,_4) {
                if (!error) self.on("success")(obj)
                else self._on["fail"]("Issue creating account #923011. Please contact support with this number.")
              })
              
          } else {
            self._message.update("Issue creating advertiser #923012. Please contact support with this number")
          }
        })
        
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Let's get started!")
          .subtitle("To get started, tell us on what domain will we be implementing pixels?")
          .left("<div class='codepeek_text'>Knowing the domain for the website will help us setup your account.</div>")
          .right("<div class='codepeek_text'>We will also use your domain to help check the pixel is implemented correctly.</div>")
          .draw()
      }
    , render_envelope: function() {
        this._env = start.envelope(this._stage._stage)
          .data([])
          .title("What's your domain?")
          .description("")
          .button("next")
          .click(this.run.bind(this))
          .draw()

        this._stage._stage.selectAll(".envelope")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll("h3")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll(".envelope_description")
          .style("margin-bottom","-20px")

        this._row = d3_updateable(this._env._desc_wrapper,".row","div")
          .classed("row",true)
      
        this._input = d3_updateable(this._row,"input","input")
          .attr("placeholder","example.com")
          .style("width","300px")
      

      }
    , render_message: function() {
        this._message = message(this._row)
          .text("")
          .draw()
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function getData(callback) {
    queue()
      .defer(d3.json,"/advertiser")
      .defer(d3.json,"/pixel?implementation=hindsight")
      .await(callback)
  }

  function checkPixel(obj,callback) {

    var path = "/crusher/pixel/status/lookup?format=json&segment="
    path += "&segment=" + obj.all_pages.external_segment_id
    path += "&uid=" + obj.uuid

    d3.json(path,callback)
    
  }

  function Email$1(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self._on.pixel_fail() }
      , "pixel_fail": function(x) { /* should override with success event (next) */ }
    }
  }

  function email$1(target) {
    return new Email$1(target)
  }

  Email$1.prototype = {
      draw: function() {

        this.render_stage()
        this.render_codepeek()
        this.render_message()


        return this
      }
    , detect: function(_obj) {
        var self = this;

        var url = 'http://' + _obj.client_sld
            , dims = "status=1,width=50,height=50,right=50,bottom=50," + 
                "titlebar=no,toolbar=no,menubar=no,location=no,directories=no,status=no"
            , validation_popup = window.open(url, "validation_popup", dims);

        setTimeout(function(){
          validation_popup.close()
          self.run(_obj,true)
        },8000)
      }
    , run: function(_obj,stop) {
        var self = this;
        self._message.update("Validating pixel placement..")

        checkPixel(_obj,function(err,data) {

          if (!stop && !err && data.length == 0) return self.detect(_obj)
          if (stop || !!err) return self.on("fail")("Issue with pixel being detected. Navigate to your site, make sure the rockerbox pixel is firing and try again.")

          return self.render_congrats(data)

        })

        
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Almost there!")
          .subtitle("Paste the code below before the </head> tag on every page of your site.")
          .left("<div class='codepeek_text'>This pixel allows us to collect a pool of data about the users in your audience. <br><br> </div>")
          .right("<div class='codepeek_text'>After the pixel is implemented, you will receive the Hindsight Daily Digest. <br><br> It will show content you should engage with and recommend stories that matches your audience.</div>")
          .draw()
      }
    , render_codepeek: function() {

        var self = this;

        getData(function(err,a,j) {

          var advertiser = {
              "segments": j.segment_pixels.map(function(s){ s.segment_implemented = s.compiled; return s})
            , "client_sld": a[0].client_sld
          }

          advertiser.all_pages = advertiser.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
          advertiser.uuid = document.cookie.split("an_uuid=")[1].split(";")[0];

          start.codepeek(self._stage._stage)
            .data(advertiser)
            .button("verify this setup")
            .click(self.run.bind(self,advertiser,false)) // overbinding but need it to trigger validation
            .draw()

          self.render_message()

          self._message._message
            .style("text-align","center")

        })
      }
    , render_message: function() {
        this._message = message(this._stage._stage.selectAll(".codepeek_content"))
          .text("")
          .draw()
      }
    , render_congrats: function(data) {

        var desc = "Your implementation appears to be successful. <br><br>We detected " + 
          data.length + 
          " recent page views to the following pages on your site by your web browser:";

        var row = this._stage._stage

        start.envelope(row)
          .data(data)
          .description(desc)
          .title("congrats!")
          .button("next")
          .click(this.on("success"))
          .draw()

        var to_hide = row.selectAll(".codepeek_content")
          , h = -to_hide.node().clientHeight;

        to_hide.transition()
          .style("margin-top",(h+20) + "px")
          .duration(500)

        
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function validate$3(password) {

    return password.length > 4 
  }

  function postPassword(obj,callback) {

    d3.xhr("/signup")
      .send("PUT",JSON.stringify(obj), callback)
    
  }

  function Password(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function password(target) {
    return new Password(target)
  }

  Password.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()
        this.render_message()

        return this
      }
    , run: function() {
        
        var password = this._input.node().value,
          is_valid = validate$3(password);


        var obj = { "password": password, "nonce": this._data.nonce}
        var self = this;

        if (!is_valid) return self._on["fail"]("Invalid password")

        postPassword(obj, function(err,x) {
          if (!err) return self._on["success"](x)
          return self._on["fail"](JSON.parse(err.response).error)
        })
        
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Activate Account")
          .subtitle("Choose a password to complete account activation.")
          .left("")
          .right("")
          .draw()
      }
    , render_envelope: function() {
        this._env = start.envelope(this._stage._stage)
          .data([])
          .title("Choose a password")
          .description("")
          .button("activate")
          .click(this.run.bind(this))
          .draw()

        this._stage._stage.selectAll(".envelope")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll("h3")
          .style("margin-bottom","0px")
      
        this._stage._stage.selectAll(".envelope_description")
          .style("margin-bottom","-20px")

        this._row = d3_updateable(this._env._desc_wrapper,".row","div")
          .classed("row",true)
      
        this._input = d3_updateable(this._row,"input","input")
          .attr("type","password")
          .attr("placeholder","password")
          .style("width","300px")
      

      }
    , render_message: function() {
        this._message = message(this._row)
          .text("")
          .draw()
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function getNonce() {
    var s = window.location.search;
    return (s.indexOf("nonce") > -1 ) ?  s.split("nonce=")[1].split("&")[0] : "";
  }

  function getUID() {
    document.cookie.split("an_uuid=")[1].split(";")[0];
  }


  function Signup(target) {
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
  }

  function signup(target) {
    return new Signup(target)
  }

  Signup.prototype = {
      draw: function() {
        this._target

        this._data.nonce = this._nonce
        this._data.uid = this._uid


        this._slides = !!this._data.nonce ?
          ["password"]                 : !this._data.permissions ?
          ["email", "domain", "pixel"] : this._data.advertiser_id == 0 ?
          ["domain", "pixel"]          : ["pixel"];

        var self = this;
        this._slideshow = start.slideshow(this._target)
          .data(this._slides.map(function(s) { 
            return function() {
                return self["render_" + s].bind(self)(this)
              }
           }))
          .draw()

        return this
      }
    , render_password: function(t) {
        var self = this;
        password(d3.select(t))
          .data(this._data)
          .on("success",function(){ self.on("password")(arguments); document.location = "/crusher" })
          .draw()
          
          
      }
    , render_email: function(t) {
        var self = this;
        email(d3.select(t))
          .data(this._data)
          .on("success",function(){ self.on("email")(arguments); self._slideshow.next() })
          .draw()

      }
    , render_domain: function(t) {
        var self = this;
        domain(d3.select(t))
          .data(this._data)
          .on("success",function(){ self.on("domain")(arguments); self._slideshow.next() })
          .draw()

      }
    , render_pixel: function(t) {
        var self = this;
        email$1(d3.select(t))
          .data(this._data)
          .on("success",function(){ self.on("pixel")(arguments); setTimeout(function(){document.location = "/crusher"},500) })
          .on("pixel_fail",function(){ self.on("pixel_fail")(arguments); })
          .draw()
      }



    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }

  }

  var version = "0.0.1";

  exports.version = version;
  exports.signup = signup;
  exports.domain = domain;
  exports.email = email;
  exports.pixel = email$1;
  exports.password = password;

}));