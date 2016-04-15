import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
from base import BaseHandler

from lib.helpers import *  

from lib.zookeeper.zk_tree import ZKTreeWithConnection

Q = """
select 
    p.*, 
    s.*, 
    t.name as pattern_type 
FROM delorean_segment_patterns p 
RIGHT JOIN delorean_segments s on s.id = p.delorean_segment_id 
LEFT JOIN delorean_value_types t on p.delorean_value_type = t.id
"""

class DeloreanRedis(object):

    def add_domain_to_redis(self,domain):

        self.redis.add(domain)

class DeloreanZookeeper(object):

    def deloran_object_to_tree(self,delorean_object):

        patterns = delorean_object["patterns"]
        children = []

        for pattern in patterns:
            children.append({
                "node": {
                    "pattern": pattern['pattern'],
                    "label":"",
                    "segment": {
                        "id": delorean_object['appnexus_segment_id'], 
                        "value": pattern['segment_value'],
                        "duration": 10080
                    }
                },
                "children": []
            })



        return children

    def add_domain_to_tree(self,delorean_object):

        domain = delorean_object['domain']

        sub_tree = self.tree.find_node_by_label("Domains")
        if sub_tree is False:
            self.tree.tree['children'].append({
                "node":{
                    "pattern": "",
                    "label": "Domains"
                },
                "children": []
            })
        sub_tree = self.tree.find_node_by_label("Domains")
        domain_tree = self.tree.find_node_by_label(domain,sub_tree)

        if domain_tree is False:
            sub_tree['children'].append({
                "node":{
                    "pattern": "",
                    "label": domain
                },
                "children": []
            })
        domain_tree = self.tree.find_node_by_label(domain,sub_tree)


        domain_tree['children'] = [
            {"node":{"pattern":domain,"label":""},"children":self.deloran_object_to_tree(delorean_object)}
        ]

        self.tree.set_tree()


        
 

class DeloreanDatabase(object):

    def get_dataframe(self,domain=False):
        R = Q
        if domain: R += " where domain = '%s'" % domain

        df = self.db.select_dataframe(R)

        func = lambda x: [ i for i in x[x.deleted == 0][["pattern_type","pattern","segment_value"]].to_dict("records") if i["pattern_type"] ]
        df = df.groupby(["id","domain","appnexus_segment_id"]).apply(func)

        return df 

    def create_segment(self,data):
        Q = "INSERT INTO delorean_segments (domain, appnexus_segment_id, appnexus_name, delorean_name, delorean_type) VALUES (%s,%s,%s,%s,%s)"
        return self.db.execute(Q,(data['domain'],data['appnexus_segment_id'],data['appnexus_name'],data['domain'],data['delorean_type']))

    def get_patterns(self,delorean_id):
        CHECK = "SELECT * from delorean_segment_patterns where delorean_segment_id = %s and deleted = 0"
        df = self.db.select_dataframe(CHECK % (delorean_id))
        return df

    def insert_pattern(self,delorean_id,pattern):

        QTYPE = "SELECT * FROM delorean_value_types"
        pattern_type = self.db.select_dataframe(QTYPE).set_index("name")['id'].to_dict()

        CHECK = "SELECT * from delorean_segment_patterns where delorean_segment_id = %s "
        seg_value = self.db.select_dataframe(CHECK % delorean_id).segment_value.max() 
        seg_value = seg_value if seg_value is not pandas.np.nan else 0

        Q = "INSERT INTO delorean_segment_patterns (delorean_segment_id,pattern,delorean_value_type,segment_value) VALUES (%s,%s,%s,%s)"
        self.db.execute(Q, (delorean_id,pattern['pattern'],1,pattern_type.get('pattern_type',seg_value + 1)) )
 

    def create_patterns(self,delorean_id,patterns):

        for pattern in patterns:
            self.insert_pattern(delorean_id,pattern)
            

    def check_patterns(self,delorean_id,patterns):

        stored_patterns = self.get_patterns(delorean_id)
        new_patterns = [pattern for pattern in patterns if str(pattern['pattern']) not in list(stored_patterns.pattern)]

        return new_patterns
 


class DeloreanHandler(BaseHandler,DeloreanDatabase,DeloreanZookeeper):

    def initialize(self, db=None, api=None, zookeeper=None, **kwargs):
        self.db = db 
        self.api = api
        self.zk = zookeeper
        self.tree = ZKTreeWithConnection(self.zk,"kafka-filter/tree/raw_imps_tree")

    def get_data(self,domain=False):
        df = self.get_dataframe(domain)
        _dict = df.reset_index().rename(columns={0:"patterns"}).to_dict("records")

        return _dict

    def write_data(self,_dict):

        self.write(ujson.dumps({"response":_dict}))
        self.finish()

    def create_appnexus_segment(self,data):
        short_name = "Delorean: %s" % data['domain']
        obj = {
            "segment": {
                "member_id": 2024,
                "short_name": short_name
            }
        }

        resp = self.api.post("/segment?format=json", data=ujson.dumps(obj))
        _id = resp.json['response']['id']

        return (_id, short_name)


           
    @tornado.web.asynchronous
    def get(self):
        self.write_data(self.get_data(self.get_argument("domain",False)))

    @tornado.web.asynchronous
    def post(self):
        data = ujson.loads(self.request.body)
        df = self.get_dataframe(data['domain'])
        
        if len(df) and df.map(len).sum():
            _dict = df.reset_index().rename(columns={0:"patterns"}).to_dict("records")
            self.write(ujson.dumps({"response":_dict,"error": "You have already created patterns. To update use PUT"}))
            self.finish()
            return

        if len(df) > 0:
            data['appnexus_segment_id'] = df.reset_index().ix[0,'appnexus_segment_id']

            delorean_id = df.reset_index().ix[0,'id']
            data['delorean_type'] = "DOMAIN"
        else:
            _id, name = self.create_appnexus_segment(data)

            data['appnexus_segment_id'] = _id
            data['appnexus_name'] = name
            data['delorean_type'] = 'DOMAIN'

            delorean_id = self.create_segment(data)

        patterns = data['patterns']
        self.create_patterns(delorean_id,patterns)

        _domain_data = self.get_data(data['domain'])
        self.add_domain_to_tree(_domain_data[0])

        self.write_data(_domain_data)

    @tornado.web.asynchronous
    def put(self):
        domain = self.get_argument("domain")

        data = ujson.loads(self.request.body)
        df = self.get_dataframe(domain)
        
        if len(df) > 0:
            data['appnexus_segment_id'] = df.reset_index().ix[0,'appnexus_segment_id']

            delorean_id = df.reset_index().ix[0,'id']
            data['delorean_type'] = "DOMAIN"

        patterns = data['patterns']
        override = self.get_argument("override",False)
        if override:
            self.db.execute("UPDATE delorean_segment_patterns set deleted = 1 where delorean_segment_id = %s" % delorean_id)

        new_patterns = self.check_patterns(delorean_id,patterns)
        self.create_patterns(delorean_id,new_patterns)

        _domain_data = self.get_data(data['domain'])
        self.add_domain_to_tree(_domain_data[0])

        self.write_data(_domain_data)
