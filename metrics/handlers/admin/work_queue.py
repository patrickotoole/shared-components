import tornado.web
import json
import pandas
import StringIO

import metrics.work_queue

from twisted.internet import defer
from lib.helpers import * 

class WorkQueueHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.db = kwargs.get("crushercache",None)
        self.zookeeper = zookeeper

    @decorators.formattable
    def get_content(self,data):
        
        def default(self,data):
            o = json.dumps([{"class":"script","type":"select","key":"script","values":data}])

            paths = """
            <div class="col-md-3">
              <h5>Work queue pages:</h5>
              <a href="/work_queue">View queue</a><br>
            </div>
            <div class="col-md-3">
              <a class="btn btn-danger btn-sm" href="/work_queue/clear">Clear queue</a><br><br>
            </div>

            <div class="col-md-3">

              <h5>Backfill pages:</h5>
              <a href="/work_queue/backfill">Backfill jobs</a><br>
              <a href="/work_queue/backfill/active">Backfill jobs active</a><br>
              <a href="/work_queue/backfill/stalled">Backfill jobs (stalled)</a><br>
              <a href="/work_queue/backfill/complete">Backfill jobs (complete)</a><br>

            </div>
            <div class="col-md-3">
              <a class="btn btn-danger btn-sm" href="/work_queue/backfill/clear">Clear Backfill</a><br>
            </div>
            <br><br>
            """

            js = """
<style>
.content .label {
  min-width:100px;color:black;display:inline-block
}
</style>
<script>
var content = d3.select(".content");

var data = """ + o + """

var draw_parameters = function(target,params) {
  target.text("")
  var param_row = target.selectAll(".param").data(params)

  param_row.enter()
    .append("div")
    .classed("param",true)

  param_row.exit().remove()

  param_row.append("div").classed("label",true)
    .text(function(x){ return x.key })

  param_row.append("input")
    .style("width","160px")


  param_row.append("div")
    .style("display","inline-block")
    .style("font-size","11px")
    .style("margin-left","10px")

    .text(function(x){return x.description })


}

var select_target = content.append("div").classed("selector",true)

var params_target = content.append("div").classed("params",true)

var submit_target = content.append("div").classed("submit",true)

var params_target2 = content.append("div").classed("params2",true)

params_target2.append("div").classed("label script",true).text("Debug")
params_target2.append("input")
    .classed("paraminput2",true)
    .style("width","200px")
    .style("margin-top", "50px")
    .style("margin-left", "1px")
params_target2.append("div").classed("break",true).html("<br/>")
params_target2.append("div").classed("label script2",true).text("Advertiser")
params_target2.append("input")
    .classed("paraminput3",true)
    .text("advertiser")
    .style("width","200px")
    .style("margin-top", "-10px")
    .style("margin-left", "1px")

var submit_target2 = content.append("div").classed("run_all",true)

var resp_target = content.append("div").classed("response",true)

var resp_target2 = content.append("div").classed("response2",true)

submit_target.append("button")
  .text("submit")
  .style("width","160px")
  .style("margin-left","100px")
  .on("click",function(x){

   var d = params_target.datum()

    var obj = {
      "udf": d.key
    }

    params_target.selectAll(".param").each(function(y){
      obj[y.key] = d3.select(this).selectAll("input").node().value;

      if (y.type == "object") obj[y.key] = JSON.parse(obj[y.key])
    })

    d3.xhr("/jobs")
      .post(
        JSON.stringify(obj),
        function(err,x) {
          var j = JSON.parse(x.response)

          resp_target.html("Job Submitted: <br><pre>" + x.response + "</pre><br>")
         
          resp_target.append("a")
            .attr("href","/jobs/" + j.job_id)
            .attr("target","_blank")
            .text("View job status") 
        }
      )
  })


submit_target2.append("button")
    .text("Run All for Advertiser")
    .style("width", "200px")
    .style("margin-left","100px")
    .on("click",function(x){

    var data_sample = {"runall":"true"}
    var input_index = d3.selectAll("input")[0].length-1
    data_sample["advertiser"] = d3.selectAll("input")[0][input_index].value

    var debug_index = d3.selectAll("input")[0].length-2
    debug_value = d3.selectAll("input")[0][debug_index].value
    data_sample['debug'] = debug_value

    d3.xhr("/jobs")
      .post(
        JSON.stringify(data_sample),
        function(err,x) {
          var j = JSON.parse(x.response)

          resp_target2.html("Job Submitted: <br><pre>" + x.response + "</pre><br>")
         
          resp_target.append("a")
            .attr("href","/jobs/" + j.job_id)
            .attr("target","_blank")
            .text("View job status") 
        }
      )
})



data.map(function(item){
  var name = item.key,
    cls= item.class,
    type = item.type;
  
  var label = select_target.selectAll("div.label." + cls)
    .data([item])
    .enter()
    .append("div")
    .classed("label " + cls,true)
    .style("color","black")
    .text(function(x){return x.key })

  var input = select_target.selectAll(type + "." + cls)
    .data([item])
    .enter()
    .append(type)
    .classed(cls,true)
    .style("width","160px")
    .on("change",function(x){
      var value = this.value
      var filtered = x.values.filter(function(y){ return y.key == value });
      if (filtered.length > 0) draw_parameters(params_target.datum(filtered[0]),filtered[0].parameters);
      select_target.selectAll("div.desc").text(filtered[0].description)
      return 
    0})

  var option = input.selectAll("option").data(function(x){return x.values}).enter()
    .append("option")
    .text(function(x){
      return x.key
    })

  var desc = select_target.selectAll("div.desc." + cls)
    .data([item])
    .enter()
    .append("div")
    .classed("desc " + cls,true)
    .style("color","black")
    .style("margin-left","10px")
    .style("display","inline-block")



})


</script>
<a href="/logging" target="_blank">LOG</a>
            """

            self.render("admin/datatable.html", data="", paths=js)
            

        yield default, (data,)

    def clear_queue(self):
        self.zookeeper.delete("/python_queue",recursive=True)
        self.zookeeper.ensure_path("/python_queue")
        self.redirect("/work_queue")

    def clear_active(self):
        self.zookeeper.delete("/active_pattern_cache",recursive=True)
        self.zookeeper.ensure_path("/active_pattern_cache")
        self.redirect("/work_queue/backfill")

    def clear_complete(self):
        self.zookeeper.delete("/complete_pattern_cache",recursive=True)
        self.zookeeper.ensure_path("/complete_pattern_cache")
        self.redirect("/work_queue/backfill")


    def get_data(self):
        import pickle
        import hashlib

        df = self.db.select_dataframe("select name `key`, parameters, description from rpc_function_details where active = 1 and deleted = 0")
        df['parameters'] = df['parameters'].map(ujson.loads)
        
        self.get_content(df.to_dict("records"))
         
    def get_complete(self,q):
        try:
            return len(self.zookeeper.get_children("/complete_pattern_cache/" + q))
        except:
            return 0

    def get_active(self,q):
        try:
            return len(self.zookeeper.get_children("/active_pattern_cache/" + q))
        except:
            return 0

    def get_all_complete(self):

        in_queue = [c for c in self.zookeeper.get_children("/complete_pattern_cache") ]
        complete_queue = [len(self.zookeeper.get_children("/complete_pattern_cache/" + q)) for q in in_queue]
        active_queue = [self.get_active(q) for q in in_queue]

        df = pandas.DataFrame({"queue":in_queue,"active":active_queue,"complete":complete_queue})

        self.get_content(df)
 

    def get_current(self,active=False):

        in_queue = [c for c in self.zookeeper.get_children("/active_pattern_cache") ]
        len_queue = [len(self.zookeeper.get_children("/active_pattern_cache/" + q)) for q in in_queue]
        complete_queue = [self.get_complete(q) for q in in_queue]

        df = pandas.DataFrame({"queue":in_queue,"active":len_queue,"complete":complete_queue})

        if active is True:
            df = df[df['active'] > 0]
        elif active == "stalled":
            df = df[(df['active'] == 0) & (df['complete'] == 0)]
        self.get_content(df)

    def clear_current(self):
        import pickle

        in_queue = [c for c in self.zookeeper.get_children("/active_pattern_cache") ]
        len_queue = [len(self.zookeeper.get_children("/active_pattern_cache/" + q)) for q in in_queue]
        complete_queue = [self.get_complete(q) for q in in_queue]

        df = pandas.DataFrame({"queue":in_queue,"active":len_queue,"complete":complete_queue})

        if active is True:
            df = df[df['active'] > 0]
        elif active == "stalled":
            df = df[(df['active'] == 0) & (df['complete'] == 0)]
        self.get_content(df)
     
     

    @tornado.web.asynchronous
    def get(self,action=""):
        print action
        if action == "":
            self.get_data()
        elif action == "clear":
            self.clear_queue()
        elif "backfill/active" in action:
            self.get_current(True)
        elif "backfill/stalled" in action:
            self.get_current("stalled")
        elif "backfill/clear" in action:
            self.clear_active()
        elif "backfill/complete/clear" in action:
            self.clear_complete()
        elif "backfill/complete" in action:
            self.get_all_complete()
        elif "backfill" in action:
            self.get_current()
