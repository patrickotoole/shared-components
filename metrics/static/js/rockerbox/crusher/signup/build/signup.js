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
          .html(this._text)

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
        "error": function(x) { /* should override with success event (next) */ }
      , "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self.on("error")(err) }
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

        self._message.update("<img src='/static/img/general/logo-small.gif' style='width:16px;margin-right:10px'/>Registering...")

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
        "error": function(x) { /* should override with success event (next) */ }
      , "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self.on("error")(err) }
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

        self._message.update("<img src='/static/img/general/logo-small.gif' style='width:16px;margin-right:10px'/>Creating Account.")

        postAdvertiser(obj, function(err,x) {
          if (!err) {
            self._message.update("<img src='/static/img/general/logo-small.gif' style='width:16px;margin-right:10px'/>Creating Account..")
            setTimeout(function(){self._message.update("<img src='/static/img/general/logo-small.gif' style='width:16px'/>Creating Account...") } ,500)

            queue()
              .defer(postPixel, {"segment_name": "All Pages", "segment_type":"segment"})
              .defer(postPixel, {"segment_name": "Signup", "segment_type":"conversion"})
              .defer(postPixel, {"segment_name": "Purchase", "segment_type":"conversion"})
              .defer(postPixel, {"segment_name": "Logged In", "segment_type":"segment"})
              .await(function(error,_1,_2,_3,_4) {
                if (!error) self.on("success")(obj)
                else self._on["fail"]("Issue creating account #923011. Please contact support@rockerbox.com with this number.")
              })
              
          } else {
            self._on["fail"]("Issue creating advertiser #923012. Please contact support@rockerbox.com  with this number")
          }
        })
        
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Let's get Hindsight Setup")
          .subtitle("To begin, tell us the domain will you be implementing Hindsight on?")
          .left("")
          .right("")
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

  function Takeover(target) {
    this._target = target;
  }

  function takeover(target) {
    return new Takeover(target)
  }

  Takeover.prototype = {
      draw: function() {
        this._target = d3.select("body")
        var self = this;

        this._wrapper = d3_updateable(this._target,".takeover-grey","div")
          .classed("takeover-grey",true)
          .style("top","0px")
          .style("z-index","1000")
          .style("width","100%")
          .style("height","100%")
          .style("background-color","rgba(0,0,0,.5)")
          .style("position","fixed")
          .style("display", "block")
          .on("click",function() {
            d3.event.preventDefault()
            self._wrapper.remove()
          })

        this._takeover = d3_updateable(this._wrapper,".takeover","div")
          .classed("takeover",true)
          .style("width","40%")
          .style("min-width","300px")
          .style("min-height","300px")
          .style("margin-right","auto")
          .style("margin-left","auto")
          .style("display","block")
          .style("background-color","white")
          .style("margin-top","12.5%")
          .on("click",function() {
            d3.event.stopPropagation()
            d3.event.preventDefault()
          })

        return this
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , update: function(val) {
        this.text(val)
        this.draw()
      }
    , remove: function() {
        this._wrapper.remove()
      }
  }

  function getUID$1(force) {
    try {
      if (force) throw "yo"
      return document.cookie.split("an_uuid=")[1].split(";")[0];
    } catch(e) {
      var img = new Image()
      img.src = "http://ib.adnxs.com/getuid?" + document.location.origin + "/crusher/pixel/cookie?uid=$UID"
      return 0

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

  function sendInvite(advertiser,to,callback) {

    var obj = {
        "advertiser_id": advertiser
      , "username": to
      , "email": to
      , "invite": true
    }

    d3.xhr("/signup")
      .post(JSON.stringify(obj),callback)
    
  }


  function Pixel(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self._on.pixel_fail() }
      , "pixel_fail": function(x) { /* should override with success event (next) */ }
    }
  }

  function pixel(target) {
    return new Pixel(target)
  }

  Pixel.prototype = {
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
        },15000)
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
          .title("Install Hindsight on your Site")
          .subtitle("Paste the code below before the </head> tag on every page of your site. ")
          .left("")
          .right("")
          .draw()

        var self = this;

        var friend = d3_updateable(this._stage._subtitle_wrapper,".send-to-friend","div")
          .classed("send-to-friend",true)
          .style("font-size","12px")
          .style("margin-top","12px")
          .html("Need a teammate to help install Hindsight? &nbsp; ")

        d3_updateable(friend,"#invite","a")
          .attr("id","invite")
          .text("Send them an invite")
          .on("click",function(){
            var taken = takeover("").draw()

            var _take = taken
              ._takeover
              .classed("envelope",true)

            var wrapped = d3_updateable(_take, ".w-form envelope_form","div")
              .classed("w-form envelope_form",true)
            
            d3_updateable(wrapped,".envelope_title","div")
              .classed("envelope_title",true)
              .text("Who do you want to invite?")

            var desc = d3_updateable(wrapped,".envelope_description","div")
              .classed("envelope_description",true)

            var input = d3_updateable(desc,"input","input")
              .attr("placeholder","email")
              .style("width","300px")

            d3_updateable(wrapped,"button","button")
              .style("margin-top","30px")
              .classed("w-button button button-blue", true)
              .text("Send invite")
              .on("click",function() {
                var email = input.node().value
                var advertiser = self._advertiser_id
                sendInvite(self._advertiser_id,email,function() {
                  taken.remove()
                  self.on("pixel_skip")()
                })
              })
            

            
          })
      }
    , render_codepeek: function() {

        var self = this;
        getUID$1(true);

        
        getData(function(err,a,j) {

          var advertiser = {
              "segments": j.segment_pixels.map(function(s){ s.segment_implemented = s.compiled; return s})
            , "client_sld": a[0].client_sld
          }

          self._advertiser_id = a[0].external_advertiser_id

          advertiser.all_pages = advertiser.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
          advertiser.uuid = getUID$1();

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
          .text("Your website will open in a new window to verify the installation.")
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
        "error": function(x) { /* should override with success event (next) */ }
      , "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self.on("error")(err) }
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
          if (!err) return self._on["success"](JSON.parse(x.response).username)
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

  function Example(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function example(target) {
    return new Example(target)
  }

  Example.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()
        //this.render_message()

        return this
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Congrats!")
          .subtitle("You'll start to receive the Hindsight Daily Digest in the next few days.")
          .left("<div class='codepeek_text'>The Hindsight Daily Digest will show you the most popular content your audience is reading.<br><br></div>")
          .right("<div class='codepeek_text'>Understanding what content your audience is reading and where you should be engaging.</div>")
          .draw()
      }
    , render_envelope: function() {
        var iwrap = d3_updateable(this._stage._stage,".img","div")
          .classed("img pull-left",true)
          .style("width"," 50%")
          .style("border"," 10px solid white")

        d3_updateable(iwrap,"img","img")
          .attr("src","/static/img/demos/hindsight-email.png")
          .style("width","100%")

        
           

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

  function Splash(target) {
    this._target = target;

    var self = this;
    this._on = {
        "error": function(x) { /* should override with success event (next) */ }
      , "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err); self.on("error")(err) }
    }
  }

  function splash(target) {
    return new Splash(target)
  }

  Splash.prototype = {
      draw: function() {

        d3.select("body").style("background","linear-gradient(to bottom right,#12ac8e,#10957b)")
        d3.select(".container").style("background","none")

        d3_updateable(d3.select("header"),".nav","ul")
          .classed("nav")



        this.render_stage()

        return this
      }
    , run: function() {
        var email = this._input.node().value,
          is_valid = validate$1(email);

        var obj = { "email": email, "username": email}
        var self = this;

        if (!is_valid) return self._on["fail"]("Invalid email")
        postEmail(obj, function(err,x) {
          if (!err) return self._on["success"](x)
          return self._on["fail"](JSON.parse(err.response).error)
        })
        
      }
    , render_stage: function() {
        var splash = d3_updateable(this._target,".splash","div")
          .classed("splash",true)
          .style("text-align","center")
          .style("width","700px")
          .style("margin-left","auto")
          .style("margin-right","auto")
          .style("margin-top","100px")
          .style("font-family","proxima-nova,Helvetica,sans-serif")
          .style("color","white")

        d3_updateable(splash,"h3","h3")
          .text("Find and engage your audience.")
          .style("font-size","45px")
          .style("margin-bottom","27px")

        d3_updateable(splash,"h5","h5")
          .html("Hindsight analyzes the content your audience is reading and tells you where you should engage to find more users. Get started today for <b><u>FREE</u></b>!")
          .style("line-height","27px")
          .style("font-size","17px")
          .style("margin","auto")
          .style("margin-bottom","60px")
          .style("width","90%")


        var row = d3_updateable(splash,".row","div")
          .classed("row",true)

        this._input = d3_updateable(row,"input","input")
          .attr("placeholder","What's your email?")
          .style("width","500px")
          .style("text-align","left")
          .style("background","white")
          .style("line-height","30px")
          .style("color","black")


        d3_updateable(row,"button","buttion")
          .text("Get Hindsight")
          .style("width","180px")
          .style("display","inline-block")
          .style("background","#38abdd")//#7bd473")//#f37621")
          .style("font-family","proxima-nova,Helvetica,sans-serif")
          .style("font-weight",700)
          .style("line-height","50px")
          .style("margin-top","10px")
          .style("vertical-align","top")
          .style("text-transform","uppercase")
          .style("letter-spacing","2px")
          .style("margin-left","-10px")
          .style("border-radius","3px")
          .style("border","1px solid #d0d0d0")
          .style("border-left","0px")
          .style("cursor","pointer")
          .on("click",this.run.bind(this))

        this._message = message(row)
          .text("")
          .draw()


        d3_updateable(splash,"img","img")
          .style("width","100px")
          .style("height","100px")
          .style("border-radius","50px")
          .style("border","5px solid #ddd")
          .style("margin-top","90px")
          .style("float","left")
          .attr("src","http://rockerbox.com/assets/img/team/noah.jpg")

        d3_updateable(splash,"h5.testamonial","h5")
          .classed("testamonial",true)
          .text("\"The Hindsight Daily Digest reduces the amount of time we spend thinking about what our audience cares about as it provides the answers for us. Our audience is telling us exactly how we can help them!\"")
          .style("text-align","left")
          .style("line-height","27px")
          .style("font-size","17px")
          .style("margin","auto")
          .style("padding-left","150px")
          .style("font-weight","bold")
          .style("font-style","italic")
          .style("margin-top","100px")

        d3_updateable(splash,"h5.test-name","h5")
          .classed("test-name",true)
          .html("<b>Noah Klausman</b> &#8212; Co-Founder/Head of Business Development at DeepLink")
          .style("text-align","left")
          .style("line-height","27px")
          .style("font-size","14px")
          .style("margin","auto")
          .style("margin-left","5px")
          .style("margin-top","15px")

          .style("padding-left","150px")




      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function UglyAssCssTemplate() {
  /*
  .arrow-steps .step {
  	font-size: 12px;
          line-height: 12px;
  	text-align: center;
  	color: white;
  	cursor: default;
  	margin: 0 3px;
  	padding: 3px 15px 3px 23px;
  	min-width: 30px;
  	float: left;
  	position: relative;
  	background-color: #d9e3f7;
  	-webkit-user-select: none;
  	-moz-user-select: none;
  	-ms-user-select: none;
  	user-select: none; 
    transition: background-color 0.2s ease;
    margin-right:-6px;
    border-top: 1px solid white;
    border-bottom: 1px solid white;

  }

  .arrow-steps .step.selected {
    font-weight:bold;
    color: #fff;
  }

  .arrow-steps .step:after,
  .arrow-steps .step:before {
  	content: " ";
  	position: absolute;
  	top: 0;
  	right: -8px;
  	width: 0;
  	height: 0;
  	border-top: 10px solid transparent;
  	border-bottom: 7px solid transparent;
  	border-left: 7px solid #d9e3f7;	
  	z-index: 2;
    transition: border-color 0.2s ease;
  }

  .arrow-steps .step:before {
  	right: auto;
  	left: 5px;
  	border-left: 7px solid white ;	
          border-left-opacity: .1;
  	z-index: 0;
  }

  .arrow-steps .step:first-child:before {
  	border: none;
  }
  .arrow-steps .step:last-child:after {
  	border: none;
  } 
  .arrow-steps .step:last-child {
          padding-left:23px;
          padding-right:20px;
          border-right: 1px solid white;
  	border-top-right-radius: 4px;
  	border-bottom-right-radius: 4px;
  }

  .arrow-steps .step:first-child {
          padding-left:16px;
          padding-left:16px;
          border-left: 1px solid white;
  	border-top-left-radius: 4px;
  	border-bottom-left-radius: 4px;
  }

  .arrow-steps .step span {
  	position: relative;
  }

  .arrow-steps .step span:before {
  	opacity: 0;
  	content: "i";
  	position: absolute;
  	top: -2px;
  	left: -20px;
  }

  .arrow-steps .step.done span:before {
  	opacity: 1;
  	-webkit-transition: opacity 0.3s ease 0.5s;
  	-moz-transition: opacity 0.3s ease 0.5s;
  	-ms-transition: opacity 0.3s ease 0.5s;
  	transition: opacity 0.3s ease 0.5s;
  }

  .arrow-steps .step.current {
  	color: #fff;
  	background-color: #23468c;
  }

  .arrow-steps .step.current:after {
  	border-left: 7px solid #23468c;	
  }
  /**/
  }

  function Progress(target) {
    this._target = target;
    this._on = {}
  }

  function progress(target) {
    return new Progress(target)
  }

  Progress.prototype = {
      draw: function() {
        d3_updateable(d3.select("head"),"style#arrows","style")
          .attr("id","arrows")
          .text(
            String(UglyAssCssTemplate)
              .split("/*")[1]
              .replace(/#d9e3f7/g,"#38abdd")
              .replace(/white/g,"rgba(208,208,208,.7)")
              .replace("#666","white")
          )

        this._progress = d3_updateable(this._target,".arrow-steps","div")
          .classed("arrow-steps",true)
          .style("padding-top","29px")
          .style("padding-right","30px")

        var self = this;

        this._arrows = d3_splat(this._progress,".step","div",this._data,function(x,i){return i})
          .classed("step",true)
          .classed("selected",function(x,i) { return i == self._selected})
          .style("width","30px")
          .text(function(x,i){ return i + 1 })
          .on("click", function(x,i) {
            return self._on["click"](i)
          })


        return this
      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , selected: function(val) { return accessor.bind(this)("selected",val) }
    , update: function(val) {
        this.text(val)
        this.draw()
      }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function Integrations(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function integrations(target) {
    return new Integrations(target)
  }

  Integrations.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()

        return this
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Integrations!")
          .subtitle("People love integrations. And it sounds like you're one of them. Right now we've made it easy for you to receive the digest in Slack everyday. ")
          .left("")
          .right("")
          .draw()
      }
    , render_envelope: function() {
        var iwrap = d3_updateable(this._stage._stage,".img","div")
          .classed("img pull-left",true)
          .style("width"," 50%")
          .style("border","10px solid white")
          .style("background","white")


        var div = d3_updateable(iwrap,"div","div")
          .style("text-align","center")

        var head = d3_updateable(div,"h3","h3")
          .text("Integrate Hindsight with Slack")
          .style("margin-bottom","30px")
          .style("font-weight","bold")


        d3_updateable(iwrap,".slack-btn-wrap","div")
          .classed("slack-btn-wrap",true)
          .style("text-align","center")
          .html('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot&amp;client_id=2171079607.55132364375"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"></a>')
          .style("margin-bottom","30px")



      }
    , text: function(val) { return accessor.bind(this)("text",val) }
    , data: function(val) { return accessor.bind(this)("data",val) }
    , on: function(action, fn) {
        if (fn === undefined) return this._on[action];
        this._on[action] = fn;
        return this
      }
  }

  function IntegrationsExample(target) {
    this._target = target;

    var self = this;
    this._on = {
        "success": function(x) { /* should override with success event (next) */ }
      , "fail" : function(err) { self._message.update("Error: " + err)}
    }
  }

  function integrations_example(target) {
    return new IntegrationsExample(target)
  }

  IntegrationsExample.prototype = {
      draw: function() {

        this.render_stage()
        this.render_envelope()
        //this.render_message()

        return this
      }
    , render_stage: function() {
        this._stage = start.stage(this._target)
          .title("Congrats!")
          .subtitle("You'll start to receive the Hindsight Daily Digest in the slack channel you setup.")
          .left("")
          .right("")
          .draw()
      }
    , render_envelope: function() {
        var iwrap = d3_updateable(this._stage._stage,".img","div")
          .classed("img pull-left",true)
          .style("width"," 50%")
          .style("border"," 10px solid white")

        d3_updateable(iwrap,"img","img")
          .attr("src","/static/img/demos/slack-screenshot.png")
          .style("width","100%")

        d3_updateable(d3.select(this._target.selectAll(".row")[0][1]),".section_subtitle.number2","div")
          .classed("section_subtitle number2 pull-left",true)
          .style("padding-top","50px")
          .style("width","50%")
          .html("Now your whole team can see the most important articles that your audience is reading.")
           

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

  function checkNonce(nonce) {
    if (nonce == undefined || nonce.length == 0) return 
    d3.xhr("/nonce?nonce=" + nonce)
      .get(function(x) {
        if (arguments[1].response == "0") document.location = "/"
      })
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
    checkNonce(this._nonce)
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

  function signup(target) {
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

  var version = "0.0.1";

  exports.version = version;
  exports.signup = signup;
  exports.domain = domain;
  exports.email = email;
  exports.pixel = pixel;
  exports.password = password;

}));