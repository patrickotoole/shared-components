import pandas
import logging
from lib.pandas_sql import s as _sql
import logging
from cache_runner_base import BaseRunner

import datetime, uuid

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class AdvertiserActionRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors
        self.sql_query = _sql._write_mysql
        self.validation_data = False
        self.sql_query = _sql._write_mysql

    def make_request(self,crusher, pattern):
        url = "/crusher/v1/visitor/domains?format=json&url_pattern=%s" % pattern
        resp = crusher.get(url, timeout=91)
        return resp.json['domains']

    def validation(self, action_name, crusher):
        valid = False
        if not self.validation_data:
            url = "/crusher/funnel/action?format=json"
            resp = crusher.get(url)
            self.validation_data = resp.json['response']
        for segment in self.validation_data:
            if action_name == segment["action_name"]:
                self.action_id = segment['action_id']
                self.url_pattern = segment['url_pattern'][0]
                valid = True
        return valid

    def insert(self, df, advertiser, segment_name, db):
        df_filtered = df.filter(['domain', 'count'])
        table_name ="action_dashboard_cache"
        keys = ['advertiser', 'action_id', 'domain']
        batch_num = int(len(df_filtered) / 50)+1
        for batch in range(0, batch_num):
            if batch==0:
                to_insert = df_filtered.ix[0:50]
                to_insert['update_date'] = [current_datetime] * len(to_insert)
                to_insert['action_name'] = [segment_name] * len(to_insert)
                to_insert['action_id'] = [self.action_id] * len(to_insert)
                to_insert['url_pattern'] = [self.url_pattern] * len(to_insert)
                to_insert['advertiser'] = [advertiser] * len(to_insert)
            else:
                to_insert = df_filtered.ix[batch*50+1:(batch+1)*50]
                to_insert['update_date'] = [current_datetime] * len(to_insert)
                to_insert['action_name'] = [segment_name] * len(to_insert)
                to_insert['action_id'] = [self.action_id] * len(to_insert)
                to_insert['url_pattern'] = [self.url_pattern] * len(to_insert)
                to_insert['advertiser'] = [advertiser] * len(to_insert)
            if len(to_insert)>0:
                try:
                    to_insert['domain'] = to_insert['domain'].map(lambda x : x.encode('utf-8'))
                    self.sql_query(to_insert, table_name, list(to_insert.columns), db, keys)
                    logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), advertiser))
                except:
                    logging.info("error with df for %s and %s" % (segment_name, advertiser))

    def pre_process(self, advertiser, segment_name, base_url):
        crusher = self.get_crusher_obj(advertiser, base_url)
        valid= self.validation(segment_name, crusher)
        data = self.make_request(crusher, self.url_pattern)
        df = pandas.DataFrame(data)
        return df

    def execute(self, data, advertiser, segment_name, db):
        self.insert(data, advertiser, segment_name, db)
        return True

    def post_validation(self, advertiser, segment_name, ran_success):
        if ran_success:
            logging.info("done with %s for %s" % (segment_name, advertiser))
        else:
            logging.info("error with %s for %s" % (segment_name, advertiser))


def runner(advertiser,pattern, base_url, cache_date="", indentifiers="test", connectors=False):
    connectors = connectors or AdvertiserActionRunner.get_connectors()

    uuid_num = str(uuid.uuid4())
    AAR = AdvertiserActionRunner(connectors)
    AAR.accounting_entry_start(advertiser, pattern, "action_dashboard_runner", uuid_num)

    db = connectors['crushercache']
    zk = connectors['zk']
    data = AAR.pre_process(advertiser, pattern, base_url)

    executed = False
    if len(data)>0:
        executed = AAR.execute(data, advertiser, pattern, db)

    AAR.post_validation(advertiser, pattern, executed)
    AAR.accounting_entry_end(advertiser, pattern, "action_dashboard_runner", uuid_num)
