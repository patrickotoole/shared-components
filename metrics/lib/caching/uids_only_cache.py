import requests, json, logging, pandas

from link import lnk
import datetime
from kazoo.client import KazooClient


logger = logging.getLogger()

SQL_QUERY1 = "insert into uids_only_visits_cache (advertiser, pattern, num_visits, visit_user_count) values ('{}', '{}', {}, {})"
SQL_QUERY2 = "insert into uids_only_sessions_cache (advertiser, pattern, num_sessions, sessions_user_count) values ('{}', '{}', {}, {})"

class UIDSCache():
    
    def __init__(self, db, user, crusher_api=False):
        self.query1 = SQL_QUERY1
        self.query2 = SQL_QUERY2
        self.db = db
        self.user = user
        if crusher_api:
            self.crusher_api = crusher_api
        else:
            self.crusher_api = self.connect_to_api()

    def connect_to_api(self):
        return ""

    def make_request(self, pattern):
        url = "/crusher/pattern_search/uids_only?search={}"
        response = self.crusher_api.get(url.format(pattern))
        
        #from IPython import embed; embed(); import ipdb; ipdb.set_trace()
        #data_for_df = {"sessions":[], "visits":[]}
        #for item in response.json["results"]["sessions"].values():
        #data_for_df["sessions"].append(len(item))
        #for i in item:
        #data_for_df["visits"].append(i["visits"])

        d1 = response.json["results"]["sessions"]
        df = pandas.DataFrame(d1.items())
        df.columns = ["col1", "col2"]
        df2 = df.groupby("col1").apply(lambda x: pandas.DataFrame(x["col2"].iloc[0]).set_index('date'))
        
        df3 = df2.groupby(level=0).apply(lambda x: pandas.Series({"sessions":len(x), "visits":sum(x["visits"])}))
        
        agg_visits = df3.groupby("visits").count()
        final_agg_visits = agg_visits.reset_index()
        final_agg_visits.columns = ["visits", "users_count"]

        agg_sessions = df3.groupby("sessions").count()
        final_agg_sessions = agg_sessions.reset_index()
        final_agg_sessions.columns = ["sessions", "users_count"]

        data = {"visits" : final_agg_visits, "sessions": final_agg_sessions}

        return data

    def write_to_table_visits(self,advertiser, pattern, data):
        self.db.execute(self.query1.format(advertiser, pattern, data["visits"], data["users_count"]))

    def write_to_table_sessions(self,advertiser, pattern, data):
        self.db.execute(self.query2.format(advertiser, pattern, data["sessions"], data["users_count"]))


if __name__ == "__main__":

    sql = lnk.dbs.rockerbox
    crusher = lnk.api.crusher
    crusher.user="a_littlebits"
    crusher.password="admin"
    crusher.base_url="http://192.168.99.100:8888"
    crusher.authenticate()
    uidsc  = UIDSCache(sql, "littlebits", crusher)
    data = uidsc.make_request("google")
    for i in range(0, len(data["visits"])):
        uidsc.write_to_table_visits("littlebits", "google", data["visits"].ix[i])
    for i in range(0, len(data["sessions"])):
        uidsc.write_to_table_sessions("littlebits", "google", data["sessions"].ix[i])
