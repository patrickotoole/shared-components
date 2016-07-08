import 'd3'
import 'start'
import accessor from '../helpers'
import message from '../message'

function validate(password) {

  return password.length > 4 
}

function postPassword(obj,callback) {

  d3.xhr("/signup")
    .send("PUT",JSON.stringify(obj), callback)
  
}

export function Password(target) {
  this._target = target;

  var self = this;
  this._on = {
      "success": function(x) { /* should override with success event (next) */ }
    , "fail" : function(err) { self._message.update("Error: " + err)}
  }
}

export default function password(target) {
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
        is_valid = validate(password);


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

