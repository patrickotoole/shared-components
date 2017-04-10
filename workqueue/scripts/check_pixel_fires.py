from link import lnk
import time
import logging
import datetime

NEW_QUERY = "select a.pixel_source_name from advertiser a left join advertiser_caching b on a.pixel_source_name = b.pixel_source_name where b.pixel_source_name is null and a.crusher =1 and deleted=0"
INSERT_CACHE = "insert into advertiser_caching (pixel_source_name) values ('%s')" 
CURRENT_QUERY = "select pixel_source_name from advertiser_caching"
UPDATE_CACHE_0 = "update advertiser_caching set valid_pixel_fires_yesterday = 0 where pixel_source_name = '%s'"
UPDATE_CACHE_1 = "update advertiser_caching set valid_pixel_fires_yesterday = 1 where pixel_source_name = '%s'"
SEGMENT_QUERY = """
select external_segment_id from advertiser_segment a join advertiser b on a.external_advertiser_id = b.external_advertiser_id where b.pixel_source_name = '{}' and b.deleted=0 and a.segment_name like "%%all pages%%"
"""

PIXEL_LOG = "insert into advertiser_pixel_fires (pixel_source_name, pixel_fires, date) values ('%s', '%s', '%s')"

class SetCacheList():


    def __init__(self, db, crusher_wrapper, crushercache):
        self.db = db
        self.advertisers = self.get_current_advertisers()
        logging.info(self.advertisers)
        self.api_wrapper = crusher_wrapper
        self.crushercache = crushercache
        self.api_wrapper.base_url="http://portal.getrockerbox.com"

    def query_advertisers(self, QUERY):
        df = self.db.select_dataframe(QUERY)
        return df['pixel_source_name'].tolist()

    def get_current_advertisers(self):
        new_advertisers = self.query_advertisers(NEW_QUERY)
        logging.info("got new")
        [self.db.execute(INSERT_CACHE % x) for x in new_advertisers]
        all_advertisers = self.query_advertisers(CURRENT_QUERY) + new_advertisers
        logging.info("got old and new")
        return all_advertisers


    def reset_cache_list(self):
        [self.db.execute(UPDATE_CACHE_0 % x) for x in self.advertisers]
        logging.info("Reset")
        return True

    def get_segment_id(self, advertiser):
        segment_id = self.db.select_dataframe(SEGMENT_QUERY.format(advertiser))
        segment = segment_id.ix[0]['external_segment_id'] if len(segment_id)>0 else 0
        return segment

    def get_from_portal(self, advertiser,segment, sample_size):
         try:
             _resp = self.api_wrapper.get("/admin/pixel/lookup?advertiser=%s&segment=%s&sample=%s" % (advertiser, segment,sample_size), auth=('rockerbox','RBOXX2017'))
             time.sleep(5)
             resp = _resp.json
         except:
             resp = {}
         return resp

    def check_pixel_fires(self, advertiser, segment):
        logging.info("requesting advertiser % segment %s" % (advertiser, segment))
        sample_list = [1,5,25,50,75,100]
        resp ={}
        index = 0
        while len(resp)==0 and index <=5:
            resp = self.get_from_portal(advertiser,segment, sample_list[index])
            index+=1
        if len(resp) > 0:
            return True
        else: 
            return False

    def populate_advertiser_table(self):
        for advertiser in self.advertisers:
           all_pages_segment = self.get_segment_id(advertiser)
           check = self.check_pixel_fires(advertiser, all_pages_segment)
           now = datetime.datetime.now().strftime("%Y-%m-%d")
           if check:
               self.db.execute(UPDATE_CACHE_1 % advertiser)
               self.crushercache.execute(PIXEL_LOG % (advertiser,1,now))
           else:
               self.crushercache.execute(PIXEL_LOG % (advertiser,0,now))


if __name__ == "__main__":

    api = lnk.api.crusher
    db = lnk.dbs.rockerbox
    crushercache = lnk.dbs.crushercache
    scl = SetCacheList(db,api, crushercache)
    scl.reset_cache_list()
    scl.populate_advertiser_table()
