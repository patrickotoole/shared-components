import tornado.web
import json
import pandas
import StringIO
import pickle

import work_queue
from kazoo.exceptions import NoNodeError
from RPCQueue import RPCQueue
from twisted.internet import defer
from lib.helpers import *

def parse(x, zk):
    try:
        time = zk.get("/python_queue/" + x)[1][2]
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        rvals = values[1]
        rvals['job_id']=job_id
        rvals['time'] = time
        return rvals
    except:
        logging.info("Error parsing pickle job")

def parse_for_id(x, zk, dq):
    try:
        time = zk.get("/python_queue/" + x)[1][2]
        values = pickle.loads(zk.get("/python_queue/" + x)[0])
        job_id = hashlib.md5(zk.get("/python_queue/" + x)[0]).hexdigest()
        logging.info(values)
        rvals = values[1]
        rvals['job_id']=job_id
        return {"parameters":rvals, "time":time}, dq
    except NoNodeError:
        return False, dq+1
    except:
        logging.info("Error parsing pickle job")
        return False


class CacheHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, *args, **kwargs):
        self.crushercache = kwargs.get("crushercache",None)
        self.zk_wrapper = kwargs.get("zk_wrapper",None)

    def get_content(self,data):
        def default(data):
            if type(data)==tuple:
                advertiser = data[1]
                data = data[0]
            o = json.dumps([{"class":"script","type":"select","key":"script","values":data,"adv":advertiser}])

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

var select_target_adv = content.append("div").classed("selector_adv",true)

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
   var adv_div = select_target_adv[0][0].children[1]
    console.log(adv_div.options[adv_div.selectedIndex].value)
    
    var obj = {
      "udf": d.key,
      "advertiser":adv_div.options[adv_div.selectedIndex].value
    }

    params_target.selectAll(".param").each(function(y){
      obj[y.key] = d3.select(this).selectAll("input").node().value;

      if (y.type == "object") obj[y.key] = JSON.parse(obj[y.key])
    })

    d3.xhr("/cache")
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

    d3.xhr("/cache")
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

  var labeladv = select_target_adv.selectAll("div.label."+"adv")
    .data([item])
    .enter()
    .append("div")
    .classed("label adv",true)
    .style("color","black")
    .text("advertiser")

  var input_adv = select_target_adv.selectAll(type + ".adv")
    .data([item])
    .enter()
    .append(type)
    .classed(cls,true)
    .style("width","160px")

  var option = input_adv.selectAll("option").data(function(x){return x.adv}).enter()
    .append("option")
    .text(function(x){
      return x
    })

  var desc = select_target.selectAll("div.desc.adv" )
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
            self.render("datatable.html", data=o, paths=js)

        default(data)


    def get_data(self):
        df = self.crushercache.select_dataframe("select name `key`, parameters, description from rpc_function_details where active = 1 and deleted = 0")
        df_adv = self.crushercache.select_dataframe("select advertiser from topic_runner_segments")
        df['parameters'] = df['parameters'].map(ujson.loads)
        advertisers = df_adv.to_dict("record")
        advertisers = [x['advertiser'] for x in advertisers]
        self.get_content((df.to_dict("records"),advertisers))


    def get_id(self, _job_id, entry_id=False):
        try:
            date = datetime.datetime.now().strftime("%m%y")
            volume = "v{}".format(date)
            zk_path = "python_queue"
            if entry_id and entry_id.find("debug")>=0:
                zk_path = "python_queue_debug"
            needed_path = secondary_path = '{path}-{secondary_path}/{volume}/{job_id}'.format(
            path=zk_path, secondary_path="log", volume=volume, job_id=_job_id)

            entry_ids = self.zk_wrapper.zk.get_children(needed_path)
            running_entries = [entry for entry in entry_ids if self.zk_wrapper.zk.get(needed_path + "/" + entry)[0]]
            df_entry={}
            df_entry['job_id']= _job_id
            if entry_id:
                df_entry['entry_id'] = str(entry_id).split("/")[2]
            df_entry['entries'] = []
            df_entry['finished'] = 0
            dq = 0
            for entry in entry_ids:
                d1, dq = parse_for_id(entry, self.zk_wrapper.zk, dq)
                if d1:
                    sub_obj = {}
                    values = d1['parameters']
                    sub_obj = values
                    sub_obj['entry']= entry
                    timestamp = d1['time']
                    sub_obj['time'] = timestamp
                    df_entry['entries'].append(sub_obj)
                    d1['dequeued'] = dq
            df_entry['finished'] = dq - len(running_entries)
            df_entry['running'] = running_entries
            self.write(ujson.dumps(df_entry))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    def get_num(self):
        path_queue = [c for c in self.zk_wrapper.zk.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1

        in_queue= [parse(path) for path in path_queue]

        self.write(ujson.dumps({"number":self.counter}))
        self.finish()


    def set_priority(self, job_id, priority_value, _version):
        try:

            needed_path = str(self.zk_wrapper.CustomQueue.get_secondary_path()) + "/{}".format(job_id)
            entry_ids = self.zk_wrapper.zk.get_children(needed_path)
            values = self.zk_wrapper.zk.get("/python_queue/" + entry_ids[0])[0]

            priority_value = int(priority_value)
            entry_id = self.zk_wrapper.write(values,priority_value,False)
            self.zk_wrapper.CustomQueue.delete(entry_ids)
            self.write(ujson.dumps({"result":"Success", "entry_id":entry_id}))
            self.finish()
        except Exception as e:
            self.set_status(400)
            self.write(ujson.dumps({"Error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def get(self):
        self.get_data()


    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        priority_value = data.get("priority", 2)
        _version = data.get("version", "v{}".format(datetime.datetime.now().strftime("%m%y")))
        try:
            if "runall" in data.keys():
                entry, job_id = self.add_advertiser_to_wq(self.request.body)
                self.get_id(job_id, entry)
            else:
                entry, job_id = self.add_to_work_queue(self.request.body)
                self.get_id(job_id, entry)
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()
