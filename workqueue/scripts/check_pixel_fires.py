from link import lnk
import time
import logging

NEW_QUERY = "select a.pixel_source_name from advertiser a left join advertiser_caching b on a.pixel_source_name = b.pixel_source_name where b.pixel_source_name is null and a.crusher =1 and a.active=1 and deleted=0"
INSERT_CACHE = "insert into advertiser_caching (pixel_source_name) values ('%s')" 
CURRENT_QUERY = "select pixel_source_name from advertiser_caching"
UPDATE_CACHE_0 = "update advertiser_caching set valid_pixel_fires_yesterday = 0 where pixel_source_name = '%s'"
UPDATE_CACHE_1 = "update advertiser_caching set valid_pixel_fires_yesterday = 1 where pixel_source_name = '%s'"
SEGMENT_QUERY = """
select external_segment_id from advertiser_segment a join advertiser b on a.external_advertiser_id = b.external_advertiser_id where b.pixel_source_name = '{}' and a.segment_name like "%%all pages%%"
"""

class SetCacheList():


    def __init__(self, db, crusher_wrapper):
        self.db = db
        self.advertisers = self.get_current_advertisers()
        logging.info(self.advertisers)
        self.api_wrapper = crusher_wrapper
        self.api_wrapper.base_url="http://192.168.99.100:8888"

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
             time.sleep(2)
             resp = _resp.json
         except:
             resp = {}
         return resp

    def check_pixel_fires(self, advertiser, segment):
        logging.info("requesting advertiser % segment %s" % (advertiser, segment))
        sample_list = [5,25,50,75,100]
        resp ={}
        index = 0
        while len(resp)==0 and index <=4:
            resp = self.get_from_portal(advertiser,segment, sample_list[index])
            index+=1
        if len(resp) > 5:
            return True
        else: 
            return False

    def populate_advertiser_table(self):
        for advertiser in self.advertisers:
           all_pages_segment = self.get_segment_id(advertiser)
           check = self.check_pixel_fires(advertiser, all_pages_segment)
           if check:
               self.db.execute(UPDATE_CACHE_1 % advertiser)


if __name__ == "__main__":

    api = lnk.api.crusher
    db = lnk.dbs.rockerbox
    scl = SetCacheList(db,api)
    scl.reset_cache_list()
    scl.populate_advertiser_table()
