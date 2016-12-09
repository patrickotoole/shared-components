import tornado.web
import ujson
import pandas
import StringIO
import logging
import work_queue
import logging
import pickle
import hashlib
import datetime
from RPCQueue import RPCQueue

from twisted.internet import defer

INSERT = "insert into workqueue_scripts (name, script) values (%(name)s, %(script)s)"
DELETE = "Delete from workqueue_scripts where name = %(name)s"

class JobsHandler(tornado.web.RequestHandler, RPCQueue):

    def initialize(self, zookeeper=None, crushercache=None, CustomQueue=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache
        self.CustomQueue = CustomQueue

    def execute_post(self, request_body):
        data = ujson.loads(request_body)
        if data.get('name',"").isdigit():
            name = self.crushercache.select_dataframe("select name from workqueue_scripts where id = %s" % data['name'])
            data['name'] = name['name'][0]
        if data.get("type",False):
            if data['type'] =="delete":
                self.crushercache.execute(DELETE, data)
                self.write(ujson.dumps({"Status":"Success"}))
                self.finish()
            if data['type'] == "add":
                self.crushercache.execute(INSERT, data)
                self.write(ujson.dumps({"Status":"Success"}))
                self.finish()
        else:
            #priority_value = self.get_argument("priority", 2)
            priority_value = 2
            #_version = self.get_argument("version", "v{}".format(datetime.datetime.now().strftime("%m%y")))
            _version = "v{}".format(datetime.datetime.now().strftime("%m%y"))
            try:
                if data.get('name', False) and 'udf' not in data.keys():
                    data['udf'] = data['name']
                entry, job_id = self.add_to_work_queue(ujson.dumps(data))
                self.write(ujson.dumps({"Status":"Success", "Job ID":job_id}))
                self.finish()
            except Exception, e:
                self.set_status(400)
                self.write(ujson.dumps({"error":str(e)}))
                self.finish()

    @tornado.web.asynchronous
    def get(self):

        try:
            df = self.crushercache.select_dataframe("select * from workqueue_scripts")
            data = {'values':[]}
            for item in df.iterrows():
                data['values'].append({"name":item[1]['name'], "active":item[1]['active'], "deleted":item[1]['deleted'], "last_activty":str(item[1]['last_activity']), "Job ID":item[1]['id'], "Run Button":"", " Delete Button": ""})
            self.render("jobsdatatable.html", data=data, paths="")
        except Exception, e:
            self.set_status(400)
            self.write(ujson.dumps({"error":str(e)}))
            self.finish()

    @tornado.web.asynchronous
    def post(self):
        self.execute_post(self.request.body)


class JobsNewHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, crushercache=None, *args, **kwargs):
        self.zookeeper = zookeeper
        self.crushercache = crushercache

    def get_content_schedule(self,data):
        js = """
<style>
.content .label {
  min-width:100px;color:black;display:inline-block
}
</style>
<script>
var content = d3.select(".content");


var select_target = content.append("div").classed("selector",true)

var select_target_name = content.append("div").classed("selector_name",true).text("Script name")


var select_target_code = content.append("div").classed("selector_code",true).text("Code")

var submit_target = content.append("div").classed("submit",true)


var resp_target = content.append("div").classed("response",true)

select_target_name.append("input")
    .classed("paraminput3",true)
    .style("width","200px")
    .style("margin-top", "10px")
    .style("margin-left", "8%")

select_target_code.append("textarea")
    .classed("paraminput3",true)
    .attr("rows","10")
    .style("width","400px")
    .style("margin-top", "10px")
    .style("margin-left", "8%")
    .style("margin-bottom", "10px")

submit_target.append("button")
  .text("submit")
  .style("width","160px")
  .style("margin-left","100px")
  .on("click",function(x){

    var obj = {
    "name": d3.selectAll("input")[0][0].value,
    "script":d3.selectAll("textarea")[0][0].value,
    "type":"add"
    }
    console.log(obj)
    
    d3.xhr("/jobs")
      .post(
        JSON.stringify(obj),
        function(err,x) {
          var j = JSON.parse(x.response)

          resp_target.html("Job Submitted: <br><pre>" + x.response + "</pre><br>")
         
        }
      )
  })
</script>
            """
        self.render("datatable.html", data="", paths=js)


    def get_data_schedule(self):
        import pandas
        df = self.crushercache.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_schedule(df.to_dict("records"))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_schedule()
