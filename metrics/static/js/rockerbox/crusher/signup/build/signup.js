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

        d3_updateable(this._target,".message","div")
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

  function Signup(target) {
    this._target = target;
    this._wrapper = this._target;
  }

  function signup(target) {
    return new Signup(target)
  }

  Signup.prototype = {
      draw: function() {
        this._target

        var shared_data = this._data;

        var e = domain(this._target)
          .data(shared_data)
          .draw()

        return this
      }
    , data: function(val) { return accessor.bind(this)("data",val) }
  }

  var version = "0.0.1";

  exports.version = version;
  exports.signup = signup;
  exports.domain = domain;
  exports.email = email;

}));