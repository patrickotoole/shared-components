import ujson
from kazoo.client import KazooClient
from zk_tree import ZKTree
from link import lnk
from lib.helpers import *

USER = "INSERT INTO rockerbox.pattern_occurrence_users_u2 (source, date, action, uid, u2) VALUES ('${source}','${date}', '%(url_pattern)s', '${adnxs_uid}', ${u2});"
RAW = "UPDATE rockerbox.pattern_occurrence_u2_counter set occurrence= occurrence + 1 where source = '${source}'and date = '${date}' and  url = '${referrer}' and uid = '${adnxs_uid}' and u2 = ${u2} and action ='%(url_pattern)s';"
URL = "UPDATE rockerbox.pattern_occurrence_urls_counter set count= count + 1 where source = '${source}' and date = '${date}' and  url = '${referrer}' and action = '%(url_pattern)s';"
VIEW = "UPDATE rockerbox.pattern_occurrence_views_counter set count= count + 1 where source ='${source}' and date = '${date}' and action = '%(url_pattern)s';"

SQL_QUERY ="select distinct url_pattern, pixel_source_name from action_with_patterns where action_id is not null"

class ZKEndpoint(ZKHelper):

    #def __init__(self,host='zk1:2181',tree_name="for_play", con=lnk.dbs.rockerbox):
    def __init__(self, kazooclient, tree_name="for_play", con = lnk.dbs.rockerbox):
        self.conn = con
        #self.zk = KazooClient(hosts=host)
        self.zk = kazooclient
        self.tree_name = tree_name
        self.start()

    @classmethod
    def construct_example_tree(self):
        sample_tree = self.create_node()
        sample_tree["children"].append(self.create_node())
        sample_tree["children"].append(self.create_node(label="_patterns", children=[self.create_node()]))
        return sample_tree

    @classmethod
    def add_advertiser(self, advertiser, tree_struct):
        match_string = '"source": "{}'
        children = self.find_label_child("_patterns", tree_struct)["children"]
        foundChild = self.iterate_tree("pattern", match_string.format(advertiser), children, parentkeyname="node")
        if foundChild == {}:
            children.append(self.create_node(pattern=match_string.format(advertiser)))
            self.set_tree()
        return foundChild

    @classmethod
    def construct_from_db(self, con):
        df = con.select_dataframe(SQL_QUERY)
        finalTree = TREE.copy()
        childrenLocation = finalTree["children"][0]["children"]
        for advertiser in df.pixel_source_name.unique():
            nodes = []
            actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
            ad_node = self.create_node(pattern='"source":"{}'.format(advertiser))
            nodes = []
            for action in actions:
                query_list = [USER, RAW, VIEW, URL]
                parameter_list = [{
                                    "query": q % action,
                                    "pattern":action["url_pattern"],
                                    "label":"",
                                    "children":[]
                                 } for q in query_list]
                action_nodes = map(lambda x : self.create_node(**x), parameter_list)
                map(nodes.append, action_nodes)
            ad_node["children"] = nodes
            childrenLocation.append(ad_node)
        return finalTree

    @classmethod
    def add_advertiser_pattern(self, advertiser, url_pattern, tree_struct):
        advertiserChildren = self.find_advertiser_child(advertiser, tree_struct)
        if advertiserChildren =={}:
            self.add_advertiser(advertiser, tree_struct)
            advertiserChildren = self.find_advertiser_child(advertiser, tree_struct)
        foundChild = self.iterate_tree("pattern", url_pattern, advertiserChildren, parentkeyname="node")
        if foundChild =={}:
            action = {"url_pattern":url_pattern}
            query_list = [USER, RAW, VIEW, URL]
            parameter_list = [{
                                "query": q % action,
                                "pattern":url_pattern,
                                "label":"",
                                "children":[]
                            } for q in query_list]
            nodes = map(lambda x : self.create_node(**x), parameter_list)
            map(advertiserChildren["children"].append, nodes)
        return tree_struct


if __name__ == "__main__":
    import ipdb; ipdb.set_trace()
    zk = ZKEndpoint(KazooClient(hosts="zk1:2181"))
    #tree = zk.construct_from_db(lnk.dbs.rockerbox)
    #zk.set_tree(tree)
    #print zk.get_tree()

    #zk.add_advertiser_pattern("test advertiser", "/", zk.tree)
    #print zk.get_tree()
