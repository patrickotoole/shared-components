import logging
from link import lnk

ADVERTISERS = "select pixel_source_name from advertiser_caching where valid_pixel_fires_yeterday=1"
SEGMENTS = "select a.action_id, a.action_name, a.url_pattern from action_with_patterns a join action b on a.action_id = b.action_id where a.pixel_source_name = '%s' and b.deleted=0 and b.active=1"

class CheckSegmentData():

    def __init__(self,rockerbox):
        self.rockerbox = rockerbox
        self.advertisers = self.get_advertisers()
        self.segment_dict = {}
        self.segment_dict = self.build_segment_dict()
        self.random = 0

    def get_advertisers(self):
        advertiser = self.rockerbox.select_dataframe(ADVERTISERS).pixel_source_name
        return advertisers.tolist()

    def build_segment_dict(self):
        for advertiser in self.advertisers:
            self.segment_dict[advertiser] = self.get_segments(advertiser)


if __name__ =="__main__":
    csd = CheckSegmentData()
