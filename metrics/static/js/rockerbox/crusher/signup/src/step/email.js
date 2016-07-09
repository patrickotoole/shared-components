import 'd3'
import 'start'
import accessor from '../helpers'
import message from '../message'

export function validate(email) {
  var split = email.split("@"),
    has_at = split.length > 1,
    has_to = split[0].length > 0,
    has_domain = split.length > 1 && split[1].length > 3;

  return has_at && has_to && has_domain
}

export function postEmail(obj,callback) {

  d3.xhr("/signup")
    .post(JSON.stringify(obj), callback)
  
}

export function Email(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function email(target) {
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
        is_valid = validate(email);

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

