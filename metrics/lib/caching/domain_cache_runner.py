import pandas
import logging
from lib.pandas_sql import s as _sql
import logging
from cache_runner_base import BaseRunner

import datetime
import uuid

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d")

class AdvertiserActionRunner(BaseRunner):

    def __init__(self, connectors):
        self.connectors =connectors
        self.sql_query = _sql._write_mysql
        self.validation_data = False
        self.sql_query = _sql._write_mysql

    def make_request(self,crusher, pattern, filter_id):
        url = "/crusher/v1/visitor/domains?format=json&url_pattern=%s&filter_id=%s" % (pattern, filter_id)
        resp = crusher.get(url, timeout=200)
        try:
            results = resp.json['response']
        except:
            results = resp.json
        return results

    def validation_name(self, crusher, name):
        valid = False
        if not self.validation_data:
            url = "/crusher/funnel/action?format=json"
            resp = crusher.get(url)
            self.validation_data = resp.json['response']
        for segment in self.validation_data:
            if name == segment["action_name"]:
                self.action_id = segment['action_id']
                self.url_pattern = segment['url_pattern'][0]
                valid = True
        return valid

    def validation_pattern(self, crusher, url_pattern):
        valid = False
        self.url_pattern=url_pattern
        if not self.validation_data:
            url = "/crusher/funnel/action?format=json"
            resp = crusher.get(url)
            self.validation_data = resp.json['response']
        for segment in self.validation_data:
            if url_pattern == segment["url_pattern"][0]:
                self.action_id = segment['action_id']
                self.segment_name = segment['action_name']
                valid = True
        return valid

    def insert(self, df, advertiser, segment_name, db):
        df_filtered = df.filter(['domain', 'count'])
        table_name ="domains_cache"
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
                to_insert['record_date'] = current_datetime
            else:
                to_insert = df_filtered.ix[batch*50+1:(batch+1)*50]
                to_insert['update_date'] = [current_datetime] * len(to_insert)
                to_insert['action_name'] = [segment_name] * len(to_insert)
                to_insert['action_id'] = [self.action_id] * len(to_insert)
                to_insert['url_pattern'] = [self.url_pattern] * len(to_insert)
                to_insert['advertiser'] = [advertiser] * len(to_insert)
                to_insert['record_date'] = current_datetime
            if len(to_insert)>0:
                try:
                    to_insert['domain'] = to_insert['domain'].map(lambda x : x.encode('utf-8'))
                    self.sql_query(to_insert, table_name, list(to_insert.columns), db.create_connection(), keys)
                    logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), advertiser))
                except:
                    logging.info("error with df for %s and %s" % (segment_name, advertiser))

    def pre_process(self, advertiser, base_url, url_pattern, segment_name, crusher):
        if segment_name:
            valid= self.validation_name(crusher, segment_name)
            data = self.make_request(crusher, self.url_pattern, self.action_id)
        else:
            vaid = self.validation_pattern(crusher, url_pattern)
            data = self.make_request(crusher, url_pattern, self.action_id)
        df = pandas.DataFrame(data)
        return df

    def execute(self, data, advertiser, pattern, segment_name, db):
        if not segment_name:
            segment_name = self.segment_name
        self.insert(data, advertiser, segment_name, db)
        return True

    def post_validation(self, advertiser, segment_name, ran_success):
        if ran_success:
            logging.info("done with %s for %s" % (segment_name, advertiser))
        else:
            logging.info("error with %s for %s" % (segment_name, advertiser))


def runner(advertiser,pattern, segment_name, base_url, filter_id, cache_date="", indentifiers="test", connectors=False):
    connectors = connectors or AdvertiserActionRunner.get_connectors()

    uuid_num = str(uuid.uuid4())
    AAR = AdvertiserActionRunner(connectors)
    crusher = AAR.get_crusher_obj(advertiser, base_url)
    if not filter_id:
        if pattern:
            AAR.getActionIDPattern(pattern, crusher)
        else:
            AAR.getActionIDName(segment_name, crusher)
    else:
        AAR.action_id = filter_id
    AAR.accounting_entry_start(advertiser, pattern, "action_dashboard_runner", uuid_num, AAR.action_id)

    db = connectors['crushercache']
    zk = connectors['zk']
    data = AAR.pre_process(advertiser, base_url, pattern, segment_name, crusher)

    executed = False
    if len(data)>0:
        executed = AAR.execute(data, advertiser, pattern, segment_name, db)

    AAR.post_validation(advertiser, pattern, executed)
    AAR.accounting_entry_end(advertiser, pattern, "action_dashboard_runner", uuid_num, AAR.action_id)
