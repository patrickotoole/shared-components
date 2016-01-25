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

class ZKEndpoint(ZKTree):

    def __init__(self,host='zk1:2181',tree_name="for_play", con=lnk.dbs.rockerbox):
        self.conn = con
        self.zk = KazooClient(hosts=host)
        self.tree_name = tree_name
        self.start()

    def find_label_all_levels(self,label_name):
        lst = []
        head = 0
        lst.append(self.tree)
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

    def create_node(self,label="", pattern="", query=False, children=[]):
        node = {"node":{"pattern":pattern,"label":label},"children":children}
        query_node = {"node":{"pattern":pattern,"label":label, "query":query},"children":children}
        if query:
            node = query_node    
        return node

    def construct_example_tree(self):
        sample_tree = {"patternTree":self.create_node()}
        sample_tree["patternTree"]["children"].append(self.create_node())
        sample_tree["patternTree"]["children"].append(self.create_node(label="_patterns", children=[self.create_node()]))
        return sample_tree

    def find_label_child_num(self,label):
        children = self.tree["patternTree"]["children"]
        returnChildIndex = -1
        index = 0
        for child in children:
            if child["node"]["label"] == label:
                returnChildIndex = index
            index = index+1
        return returnChildIndex

    def find_advertiser_child_num(self, advertiser):
        children = self.find_label_child("_patterns")["children"]
        match_string = '"source":"{}'
        returnChildIndex=-1
        index =0
        for child in children:
            if child["node"]["pattern"] == match_string.format(advertiser):
                returnChildIndex = index
            index = index + 1
        return returnChildIndex

    def find_advertiser_child(self, advertiser):
        children = self.find_label_child("_patterns")["children"]
        match_string = '"source":"{}'
        returnChild = {}
        for child in children:
            if child["node"]["pattern"] == match_string.format(advertiser):
                returnChild = child
        return returnChild

    def find_label_child(self,label):
        children = self.tree["patternTree"]["children"]
        returnChild = {}
        for child in children:
            if child["node"]["label"] == label:
                returnChild = child
        return returnChild

    def add_advertiser(self, advertiser):
        match_string = '"source":"{}'
        children = self.find_label_child("_patterns")["children"]
        found = False
        for child in children:
            if child["node"]["pattern"] == match_string.format(advertiser):
                found = True
        if found == False:
            children.append(self.create_node(pattern=match_string.format(advertiser)))
            self.set_tree()
        return found

    def construct_from_db(self, con):
        df = self.conn.select_dataframe(SQL_QUERY)
        finalTree={"patternTree":{"node":{"pattern":"","label":""},"children":[{"node":{"pattern":"","label":"_patterns"},"children":[]}]}}
        childrenLocation = finalTree["patternTree"]["children"][0]["children"]
        for advertiser in df.pixel_source_name.unique():
            nodes = []
            actions = Convert.df_to_values(df[df.pixel_source_name == advertiser])
            ad_node = self.create_node(pattern='"source":"{}'.format(advertiser))
            nodes = []
            for action in actions:
                nodes.append(self.create_node(pattern=action['url_pattern'], query=USER % action))
                nodes.append(self.create_node(pattern=action['url_pattern'], query=RAW % action))
                nodes.append(self.create_node(pattern=action['url_pattern'], query=VIEW % action))
                nodes.append(self.create_node(pattern=action['url_pattern'], query=URL % action))
            ad_node["children"] = nodes
            childrenLocation.append(ad_node)
        self.set_tree(finalTree)
        return self.tree_name

    def add_advertiser_pattern(self, advertiser, url_pattern):
        advertiserChildren = self.find_advertiser_child(advertiser)
        if len(advertiserChildren)==0:
            self.add_advertiser(advertiser)
            advertiserChildren = self.find_advertiser_child(advertiser)
        found = False
        for child in advertiserChildren["children"]:
            if child["node"]["pattern"] == url_pattern:
                found = True
        if found ==False:
            action = {"url_pattern":url_pattern}
            advertiserChildren["children"].append(self.create_node(pattern=url_pattern,query=USER % action))
            advertiserChildren["children"].append(self.create_node(pattern=url_pattern,query=RAW % action))
            advertiserChildren["children"].append(self.create_node(pattern=url_pattern,query=VIEW % action))
            advertiserChildren["children"].append(self.create_node(pattern=url_pattern,query=URL % action))
            self.set_tree()
        return found


#["pattrenTree"]
