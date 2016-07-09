import 'd3'
import 'start'
import accessor from '../helpers'
import message from '../message'
import * as E from './email'



export function Splash(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function splash(target) {
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
        is_valid = E.validate(email);

      var obj = { "email": email, "username": email}
      var self = this;

      if (!is_valid) return self._on["fail"]("Invalid email")
      E.postEmail(obj, function(err,x) {
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
        .text("Hindsight tracks the content your audience is reading and tells you where you should engage to find more users.")
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
        .on("click",this.run.bind(this))

      d3_updateable(splash,"img","img")
        .style("width","100px")
        .style("height","100px")
        .style("border-radius","50px")
        .style("border","5px solid #ddd")
        .style("margin-top","90px")
        .style("float","left")
        .attr("src","https://driftt.imgix.net/https%3A%2F%2Fs3.amazonaws.com%2Fcustomer-api-avatars-prod%2F920%2Fe7a670c9a9468784cdc4becdf0d406d8?h=200&fit=max&w=200&fmt=png&s=6478731856dbc7ccea8bdfeaa267bfa8")

      d3_updateable(splash,"h5.testamonial","h5")
        .classed("testamonial",true)
        .text("\"The Hindsight Daily Digest is an indispensible part of our content marketing. Hindsight goes beyond direct referrer to help us uncover and write for personas that truly reflect our audience's interests.\"")
        .style("text-align","left")
        .style("line-height","27px")
        .style("font-size","17px")
        .style("margin","auto")
        .style("margin-bottom","60px")
        .style("padding-left","150px")
        .style("font-weight","bold")
        .style("font-style","italic")
        .style("margin-top","100px")



    }
  , text: function(val) { return accessor.bind(this)("text",val) }
  , data: function(val) { return accessor.bind(this)("data",val) }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
}

