import ujson
from kazoo.client import KazooClient
from zk_tree import ZKTree
from link import lnk


USER = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source, date, action, uid, u2) VALUES ('${source}','${date}', '%(url_pattern)s', '${adnxs_uid}', ${u2});"
RAW = "UPDATE rockerbox.pattern_occurrence_u2_counter set occurrence= occurrence + 1 where source = '${source}'and date = '${date}' and  url = '${referrer}' and uid = '${adnxs_uid}' and u2 = ${u2} and action ='%(url_pattern)s';"
URL = "UPDATE rockerbox.pattern_occurrence_urls_counter set count= count + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and action = '%(url_pattern)s';"
VIEW = "UPDATE rockerbox.pattern_occurrence_views_counter set count= count + 1 where source ='${source}' and date = '${date}' and action = '%(url_pattern)s';"

SQL_QUERY ="select distinct url_pattern, pixel_source_name from pattern_cache"

class ZKEndpoint(ZKTree):

    def __init__(self,host='zk1:2181',tree_name="for_play", con=lnk.dbs.rockerbox):
        self.conn = con
        self.zk = KazooClient(hosts=host)
        self.tree_name = tree_name
        self.start()


    def label_exists(self,label_name):
        exists = self.find_node_by_label(label_name)
        if exists is None:
            return False
        else:
            return True

    def find_label_all_levels(self,label_name):
        lst = []
        head = 0
        lst.append(zk.tree)
        while True:
            try:
                if lst[head]["node"]["label"] == label_name:
                    return True
                else:
                    children = lst[head]["children"]
                    lst[head] = None
                    head = head+1
                    for c in children:
                        lst.append(c)
            except:
                return False

    def create_node(self,label=False, pattern=False, query=False, children=[]):
        node = {"node":{"pattern":"","label":""},"children":[]}
        if label:
            node["node"]["label"]= label
        if pattern:
            node["node"]["pattern"]=pattern
        if len(children)>0:
            node["children"] = children
        return node

    def construct_example_tree(self):
        sample_tree = {"patternTree":self.create_node()}
        sample_tree["patternTree"]["children"].append(self.create_node())
        sample_tree["patternTree"]["children"].append(self.create_node(label="_pattern", children=[self.create_node()]))
        return sample_tree

    def construct_from_db(self, con):
        df = self.conn.select_dataframe(SQL_QUERY)
        for advertiser in df.pixel_source_name.unique():
            nodes = []
            actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
            for action in actions:
                self.create_node(query=X, pattern=Y)


zk = ZKEndpoint(tree_name="for_play")
import ipdb; ipdb.set_trace()
print zk.get_tree()
zk.stop()
