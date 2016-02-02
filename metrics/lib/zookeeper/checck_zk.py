import requests, ujson
import zk_endpoint
from kazoo.client import KazooClient



kc =KazooClient(hosts="zk1:2181") 
zke = zk_endpoint.ZKEndpoint(kc)
zke.start()
zt = zke.get_tree()

search_obj = [{"label":False,"pattern":False},{"label":"_patterns", "pattern":False},{"pattern":'"source": "baublebar',"label":False},{"label":False,"pattern":"TESTP"}]
search_obj2 = [{"label":False,"pattern":False},{"label":"_patterns", "pattern":False},{"pattern":'"source": "TESTP',"label":False},{"label":False,"pattern":"TESTP"}]
search_obj3 =[{"label":False,"pattern":False},{"label":"_patterns","pattern":False},{"pattern":'"source": "baublebar',"label":False},{"label":False,"pattern":"PUTTEST"}]
url = "http://192.168.99.100:8888/crusher/funnel/action"
delete_url = "http://192.168.99.100:8888/crusher/funnel/action?id=%s"
put_url = "http://192.168.99.100:8888/crusher/funnel/action?id=%s"
pdataone = {"action_name":"TESTP", "url_pattern" :["TESTP"]}
pdatatwo = {"action_name":"TESTP", "url_pattern": ["TESTP"], "advertiser":"TESTADV"}
putdata = {"action_name":"TESTP", "url_pattern" :["PUTTEST"], "action_id":1008}

data = {"username":"a_baublebar","password":"admin"}
auth_data = ujson.dumps(data)
resp = requests.post("http://crusher.getrockerbox.com/login", data=auth_data)
cookie = dict(resp.cookies)
print cookie

print zke.search_tree_children(search_obj, zt)
#print zke.search_tree_node(search_obj, zt)
#if zke.search_tree_children(search_obj, zt) != False:
    #requests.delete(delete_url % "1006",cookies=cookie)

print zke.search_tree_children(search_obj, zt)

rone = requests.post(url, data=ujson.dumps(pdataone), cookies=cookie)
print rone.text

zt1 = zke.get_tree()

print zke.search_tree_children(search_obj, zt1)
#print zke.search_tree_node(search_obj, zt1)

#rtwo = requests.post(url, data=ujson.dumps(pdatatwo), cookies=cookie)
#print rtwo.text

zt2 = zke.get_tree()

print zke.search_tree_children(search_obj2, zt2)
#print zke.search_tree_node(search_obj2, zt2)

rthree = requests.put(put_url % "1008", data=ujson.dumps(putdata), cookies=cookie)
print rthree.text

zt3 = zke.get_tree()
print zke.search_tree_children(search_obj3, zt3)
