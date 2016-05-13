import pandas
import logging
from lib.pandas_sql import s as _sql

import datetime
SQL = "INSERT INTO action_dashboard_cache (advertiser, count, domain) values ('{}', {}, '{}')" 
current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

SQLENTRY="insert into crusher_cache_accounting (advertiser, pattern, ts, start_or_end, script_name, uuidi, filter_id) values ('{}', '{}', '{}', '{}', '{}', '{}',{})"
SQLENTRYREPLACE = "replace into crusher_cache_accounting (advertiser, pattern, ts, start_or_end, script_name, uuid, filter_id) values ('{}', '{}', '{}', '{}', '{}', '{}',{})"

class BaseRunner():

    def __init__(self, connectors):
        self.connectors =connectors
        self.sql_query = _sql._write_mysql

    @staticmethod
    def get_connectors():
        from link import lnk
        return {
            "db": lnk.dbs.rockerbox,
            "crushercache":lnk.dbs.crushercache,
            "zk": {},
            "cassandra": lnk.dbs.cassandra
        }

    def getActionIDPattern(self, pattern,crusher):
        resp = crusher.get('/crusher/funnel/action?format=json')
        data = resp.json['response']
        for segment in data:
            if pattern == segment["url_pattern"][0]:
                self.action_id = segment['action_id']        

    def getActionIDName(self, segment_name,crusher):
        resp = crusher.get('/crusher/funnel/action?format=json')
        data = resp.json['response']
        for segment in data:
            if pattern == segment["action_name"]:
                self.action_id = segment['action_id']

    def generic_insert(self, data, advertiser, db):
        db.execute(SQL.format(data))

    def accounting_entry_start(self, advertiser, pattern, name, uuid, filter_id=0):
        try:
            self.connectors['crushercache'].execute(SQLENTRY.format(advertiser,pattern, current_datetime, "Start", name, uuid, filter_id))
            logging.info("start entry")
        except:
            self.connectors['crushercache'].execute(SQLENTRYREPLACE.format(advertiser,pattern, current_datetime, "Start", name, uuid, filter_id))
            logging.info("start entry")

    def accounting_entry_end(self, advertiser, pattern, name, uuid, filter_id=0):
        try:
            self.connectors['crushercache'].execute(SQLENTRY.format(advertiser,pattern, current_datetime, "End", name, uuid, filter_id))
            logging.info("finish entry")
        except:
            self.connectors['crushercache'].execute(SQLENTRYREPLACE.format(advertiser,pattern, current_datetime, "End", name, uuid, filter_id))
            logging.info("finish entry")

    def get_crusher_obj(self, advertiser, base_url):
        from link import lnk
        crusher = lnk.api.crusher
        crusher.user = "a_{}".format(advertiser)
        crusher.password= "admin"
        crusher.base_url = base_url
        crusher.authenticate()
        logging.info(crusher._token)
        return crusher

    def pre_process(self, advertiser, segment_name, base_url):
        crusher = self.get_crusher_obj(advertiser, base_url)
        return crusher

    def execute(self, data, advertiser, segment_name, db):
        return True

    def post_validation(self, advertiser, segment_name, ran_success):
        if ran_success:
            logging.info("done with %s for %s" % (segment_name, advertiser))
        else:
            logging.info("error with %s for %s" % (segment_name, advertiser))

