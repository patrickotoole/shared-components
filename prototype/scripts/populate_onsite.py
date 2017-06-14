from link import lnk
import pandas
import ujson
import StringIO
import logging

import re

from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

from lib.aho import AhoCorasick

BATCHINSERT = "insert into onsite (uid, full_onsite_url, advertiser, segments, time) values "

DEFAULT_INTERVAL = "minute"

QUERYDB =  "select distinct uid as uid from uid_test"

SEGMENTS = "select url_pattern, action_id from action_with_patterns where pixel_source_name='{}'"

SUBFILTERS = "select action_id, filter_pattern from action_filters where action_id in {}"

class PopulateOnsitePrototype:

    def __init__(self, cassandra, prototype, rockerbox):
        self.cassandra = cassandra
        self.prototype = prototype
        self.rockerbox = rockerbox

    def create_segment_dataframe(self, advertiser):
        df_seg = self.rockerbox.select_dataframe(SEGMENTS.format(advertiser))
        df_filter = self.rockerbox.select_dataframe(SUBFILTERS.format(tuple(df_seg.action_id.tolist())))
        df_segments = df_seg.reset_index()[['action_id','url_pattern']]
        df_filters = df_filter.reset_index()[['action_id', 'filter_pattern']]
        df = df_segments.merge(df_filters, on='action_id', how='left')
        return df

    def build_segment_dict(self,segments_df):
        non_filtered = segments_df[segments_df.filter_pattern.isnull()]
        filtered = segments_df[segments_df.filter_pattern.notnull()]

        segments_dict  = {}
        for i,row in non_filtered.iterrows():
            if not segments_dict.get(row.url_pattern,False):
                segments_dict[row.url_pattern] = [row.action_id]
            else:
                segments_dict[row.url_pattern].append(row.action_id)
        
        filtered_dict = filtered.to_dict('records')
        for record in filtered_dict:
            if not segments_dict.get(record['filter_pattern'],False):
                segments_dict[record['filter_pattern']] = [record['action_id']]
            else:
                segments_dict[record['filter_pattern']].append(record['action_id']) 
        return segments_dict

    def include_sentence_segments(self,df, advertiser):
        segments_df = self.create_segment_dataframe(advertiser)
        segments_dict = self.build_segment_dict(segments_df)
        #df_for_filter_ids = df[['url_pattern', 'action_id']]
        #df_for_filter_ids = df_for_filter_ids.set_index('action_id')
        #new_column = df_for_filter_ids.map(lambda x : [ item for sublist in [y for z,y in segments_dict if z in x] for item in sublist])
        df['action_ids'] = df.url.map(lambda x : [ item for sublist in [y for z,y in segments_dict.items() if z in x] for item in sublist])
        #newdf = df.apply(lambda x: [y for y in non_filtered.url_pattern.tolist() if y in x])
        return df

    def select_uids(self):
        data = self.prototype.select_dataframe(QUERYDB)
        return data.uid.tolist()


    def defer_get_uid_visits(self, source, uids):

        xx = self.paginate_get_visits(uids, source)
        df = pandas.DataFrame(xx)

        #filtered = df[df.url.map(lambda x: "adsf" in x)]

        return df

 
    def paginate_get_visits(self, uids, source):

        DOMAIN_SELECT = "select * from rockerbox.visit_events_source_uid_date_url where source = ? and uid = ?"
        statement = self.cassandra.prepare(DOMAIN_SELECT)
        def execute(data):
            bound = statement.bind(data)
            return self.cassandra.execute_async(bound)

        logging.info("AXY")

        prepped = [[source, u] for u in uids]
        results, _ = FutureHelpers.future_queue(prepped,execute,simple_append,120,[],"DUMMY_VAR")

        logging.info("ASDF")

        return results


    def batch_insert(self,df):
        num_times = len(df) / 1000
        for z in range(0,num_times+2):
            if z==0:
                y = 1000
            else:
                y = (z+1)*1000
            x= z *1000
            if z == num_times+1:
                y= x + (len(df) % 1000)
            portion = df[x:y]
            self._batch_insert(portion)

    def _batch_insert(self,df):
        values_list = []
        values_base = "('%s','%s', '%s', '%s', '%s')"
        for i,row in df.iterrows():
            temp_value = values_base % (row['uid'], row['url'].replace("'","").replace('"',""), row['source'], " ".join([str(x) for x in row['action_ids']]), row['timestamp'])
            values_list.append(temp_value)
        values_portion = ",".join(values_list)
        full_query = BATCHINSERT + values_portion
        self.prototype.execute(full_query)


if __name__ == "__main__":

    from link import lnk
    cass = lnk.dbs.cassandra
    proto = lnk.dbs.prototype
    rockerbox = lnk.dbs.rockerbox
    pp = PopulateOnsitePrototype(cass,proto,rockerbox)
    uids = pp.select_uids()
    df = pp.defer_get_uid_visits("vimeo",uids)
    df = pp.include_sentence_segments(df,'vimeo')

    pp.batch_insert(df)

    #num_times = len(df) / 1000
    #for z in range(0,num_times+2):
    #    if z==0:
    #        y = 1000
    #    else:
    #        y = (z+1)*1000
    #    x= z *1000
    #    if z == num_times+1:
    #        y= x + (len(df) % 1000)
    #    print str(x)
    #    print str(y)
    #    portion = df[x:y]
    #    pp.batch_insert(portion)
