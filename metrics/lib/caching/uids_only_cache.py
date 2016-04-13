import requests, json, logging, pandas

from link import lnk
import datetime
import uuid
from kazoo.client import KazooClient
from cache_runner_base import BaseRunner

logger = logging.getLogger()

SQL_QUERY1 = "insert into uids_only_visits_cache (advertiser, pattern, num_visits, visit_user_count) values ('{}', '{}', {}, {})"
SQL_QUERY2 = "insert into uids_only_sessions_cache (advertiser, pattern, num_sessions, sessions_user_count) values ('{}', '{}', {}, {})"


class OnsiteCacheRunner(BaseRunner):

    def make_request(self,advertiser, pattern, base_url):

        crusher = lnk.api.crusher
        crusher.user = "a_"+advertiser
        crusher.password="admin"
        crusher.base_url = base_url
        crusher.authenticate()

        url = "/crusher/pattern_search/uids_only?search={}"
        try:
            response = crusher.get(url.format(pattern), timeout=300)
            d1 = response.json["results"]
            df = pandas.DataFrame(d1)
     
            agg_visits = df.groupby("visits").count()
            final_agg_visits = agg_visits.reset_index()
            final_agg_visits_filter = final_agg_visits.filter(['visits', 'uid'])
            final_agg_visits_filter.columns = ["visits", "users_count"]

            agg_sessions = df.groupby("sessions").count()
            final_agg_sessions = agg_sessions.reset_index()
            final_agg_sessions_filter = final_agg_sessions.filter(['sessions','uid'])
            final_agg_sessions_filter.columns = ["sessions", "users_count"]
    
            data = {"visits" : final_agg_visits_filter, "sessions": final_agg_sessions_filter}
    
            return data
        except:
            return {}

    def write_to_table_visits(self,advertiser, pattern, data,db):
        try:
            db.execute(SQL_QUERY1.format(advertiser, pattern, data["visits"], data["users_count"]))
        except:
            logging.info("duplicate entry -- visits")

    def write_to_table_sessions(self,advertiser, pattern, data,db):
        try:
            db.execute(SQL_QUERY2.format(advertiser, pattern, data["sessions"], data["users_count"]))
        except:
            logging.info("duplicate entry -- sessions")


def runner(advertiser, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or OnsiteCacheRunner.get_connectors()
    
    uuid_num = str(uuid.uuid4())
    OCR = OnsiteCacheRunner(connectors)

    OCR.accounting_entry_start(advertiser, pattern, "onsite_cache_runner", uuid_num)
    data = OCR.make_request(advertiser, pattern, base_url)
    if data !={}:
        for i in range(0, len(data["visits"])):
            OCR.write_to_table_visits(advertiser, pattern, data["visits"].ix[i], connectors['db'])
        for i in range(0, len(data["sessions"])):
            OCR.write_to_table_sessions(advertiser, pattern, data["sessions"].ix[i], connectors['db'])

    OCR.accounting_entry_end(advertiser, pattern, "onsite_cache_runner", uuid_num)
