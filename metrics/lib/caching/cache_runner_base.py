import pandas
import logging
from lib.pandas_sql import s as _sql

import datetime
SQL = "INSERT INTO action_dashboard_cache (advertiser, count, domain) values ('{}', {}, '{}')" 
current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class BaseRunner():

    def __init__(self, connectors):
        self.connectors =connectors

    @staticmethod
    def get_connectors(self):
        from link import lnk
        return {
            "db": lnk.dbs.rockerbox,
            "zk": {},
            "cassandra": lnk.dbs.cassandra
        }

    def generic_insert(self, data, advertiser, db):
        db.execute(SQL.format(data))

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

