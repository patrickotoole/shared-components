import logging
from link import lnk
import datetime

ADVERTISERS = "select pixel_source_name from advertiser_caching where valid_pixel_fires_yesterday=1"
SEGMENTS = "select a.action_id, a.action_name, a.url_pattern from action_with_patterns a join action b on a.action_id = b.action_id where a.pixel_source_name = '%s' and b.deleted=0 and b.active=1"
CURRENT_SEGMENTS = "select filter_id from advertiser_caching_segment where pixel_source_name = '%s'"
FILL_IN_DB = "insert into advertiser_caching_segment (pixel_source_name, filter_id, action_name, pattern) values (%s, %s, %s, %s)"
UPDATE_DB="update advertiser_caching_segment set data_populated=%s, updated_at = %s where pixel_source_name = %s and filter_id = %s"

SEGMENT_LOG = "insert into advertiser_segment_check (pixel_source_name, url_pattern, filter_id, pixel_fires, date, skip_at_log) values (%s, %s, %s, %s, %s, %s)"

class CheckSegmentData():

    def __init__(self,rockerbox, hindsight, crushercache):
        self.rockerbox = rockerbox
        self.hindsight = hindsight
        self.crushercache = crushercache
        self.advertisers = self.get_advertisers()
        self.segment_dict = {}
        self.build_segment_dict()

    def get_advertisers(self):
        advertiser = self.rockerbox.select_dataframe(ADVERTISERS).pixel_source_name
        return advertiser.tolist()

    def build_segment_dict(self):
        for advertiser in self.advertisers: 
            self.segment_dict[advertiser] = self.get_segments(advertiser)
            current_segments = self.rockerbox.select_dataframe(CURRENT_SEGMENTS % advertiser).filter_id.tolist()
            for seg in self.segment_dict[advertiser].iterrows():
                self.compare_and_insert(advertiser, current_segments,seg)

    def compare_and_insert(self,advertiser, list_of_existing, segment_data):
        if segment_data[1]['action_id'] not in list_of_existing:
            self.fill_missing_segment(advertiser, segment_data[1]['url_pattern'], segment_data[1]['action_id'], segment_data[1]['action_name'])

    def get_segments(self,advertiser):
        segments = self.rockerbox.select_dataframe(SEGMENTS % advertiser)
        return segments

    def fill_missing_segment(self, advertiser, pattern, filter_id, action_name):
        self.rockerbox.execute(FILL_IN_DB, (advertiser, filter_id, action_name, pattern))

    def check_timeseries_endpoint(self, pattern, action_id):
        try:
            _resp = self.hindsight.get('/crusher/pattern_search/timeseries_only?filter_id=%s&search=%s' % (action_id, pattern), timeout=300)
            if 'results' in _resp.json.keys() and len(_resp.json['results']) >0 and 'date' in _resp.json['results'][0]:
                last_two_days = sorted(_resp.json['results'], key=lambda x : x['date'],reverse=True)[:2]
                checks = sum([x['uniques'] for x in last_two_days])
                has_data = True if checks>20 else False
            else:
                has_data =False
        except:
            has_data=False
        return has_data

    def iter_segments(self):
        for advertiser in self.advertisers:
            self.hindsight.user = 'a_%s' % advertiser
            self.hindsight.authenticate()
            for seg in self.segment_dict[advertiser].iterrows():
                has_data = self.check_timeseries_endpoint(seg[1]['url_pattern'], seg[1]['action_id'])
                self.update_db(has_data, advertiser, seg[1]['action_id'], seg[1]['url_pattern'])

    def update_db(self,has_data, advertiser, filter_id, pattern):
        now = datetime.datetime.now().strftime("%Y-%m-%d")
        set_to_skip = self.rockerbox.select_dataframe("select skip from advertiser_caching_segment where filter_id = %s" % filter_id)['skip'][0] 
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if has_data:
            self.rockerbox.execute(UPDATE_DB, (1, timestamp, advertiser, filter_id))
            self.crushercache.execute(SEGMENT_LOG, (advertiser,pattern, filter_id,1,now, set_to_skip))
        else:
            self.rockerbox.execute(UPDATE_DB, (0, timestamp, advertiser, filter_id))
            self.crushercache.execute(SEGMENT_LOG, (advertiser,pattern, filter_id,0,now,set_to_skip))

if __name__ =="__main__":
    from link import lnk
    rockerbox = lnk.dbs.rockerbox
    crusher = lnk.api.crusher
    crushercache = lnk.dbs.crushercache
    csd = CheckSegmentData(rockerbox, crusher, crushercache)
    csd.iter_segments()
