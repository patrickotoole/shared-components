import tornado.web
import json
import pandas
import StringIO

import work_queue

from twisted.internet import defer
from lib.helpers import *

class CacheHandler(tornado.web.RequestHandler):

    def initialize(self, zookeeper=None, *args, **kwargs):
        self.db = kwargs.get("crushercache",None)
        self.zookeeper = zookeeper

    @decorators.formattable
    def get_content_test(self,data):
        def default(self,data):
            if type(data)==tuple:
                data = data[0]
            o = json.dumps([{"class":"script","type":"select","key":"script","values":data}])

            js = """
<style>
.content .label {
  min-width:100px;color:black;display:inline-block
}
</style>
<script>
var content = d3.select(".content");

var data = """ + o + """

var select_target = content.append("div").classed("selector",true)

var submit_target = content.append("div").classed("submit",true)


var resp_target = content.append("div").classed("response",true)

for (i = 0; i < data[0].values.length; i++){
        tmp_data=data[0].values[i]
submit_target.append("button")
  .text(tmp_data.name)
  .style("width","160px")
  .style("margin-left","10px")
  .on("click",function(x){
var obj = {
"udf":tmp_data.name
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
submit_target.append("div").classed("break",true).html("<br/>")
}
</script>
<a href="/logging" target="_blank">LOG</a>
            """
            self.render("datatable.html", data="", paths=js)
        yield default, (data,)


    def get_data_test(self):
        df = self.db.select_dataframe("select name from recurring_scripts where active = 1 and deleted = 0")
        self.get_content_test((df.to_dict("records")))

    @tornado.web.asynchronous
    def get(self):
        self.get_data_test()
