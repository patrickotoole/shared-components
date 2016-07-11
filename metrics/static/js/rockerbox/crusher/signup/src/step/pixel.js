import 'd3'
import 'start'
import 'queue'
import accessor from '../helpers'
import message from '../message'
import takeover from '../takeover'


function validate(pixel) {

}

function getUID(force) {
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


export function Pixel(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err); self._on.pixel_fail() }
    , "pixel_fail": function(x) { /* should override with success event (next) */ }
  }
}

export default function pixel(target) {
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
        .left("<div class='codepeek_text'>This pixel allows us to collect a pool of data about the users in your audience. <br><br> Need a teammate to help install Hindsight? <a id='invite'>Send them an invite</a></div>")
        .right("<div class='codepeek_text'>After the pixel is implemented, you will receive the Hindsight Daily Digest. <br><br> It will show content you should engage with and recommend stories that matches your audience.</div>")
        .draw()

      var self = this;
      this._stage._stage.selectAll("#invite")
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
      getUID(true);

      
      getData(function(err,a,j) {

        var advertiser = {
            "segments": j.segment_pixels.map(function(s){ s.segment_implemented = s.compiled; return s})
          , "client_sld": a[0].client_sld
        }

        self._advertiser_id = a[0].external_advertiser_id

        advertiser.all_pages = advertiser.segments.filter(function(x){return x.segment_name.indexOf("All Pages") > -1})[0]
        advertiser.uuid = getUID();

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

