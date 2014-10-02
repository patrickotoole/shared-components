import tornado.web
import ujson
import pandas
import StringIO
import mock
import time

from lib.helpers import *  

CONVERSION_PIXEL = """<!-- Rockerbox -- %(segment_name)s -->
<script src="https://secure.adnxs.com/px?id=%(pixel_id)s&seg=%(segment_id)s&t=1&order_id=[user_identifier]" type="text/javascript"></script> 
<script src="https://getrockerbox.com/pixel?source=%(pixel_source_name)s&type=conv&id=%(pixel_id)s&seg=%(segment_id)s&order_type=[user_identifier]" type="text/javascript"></script>
<!-- End of Segment Pixel -->"""

SEGMENT_PIXEL = """<!-- Rockerbox -- %(segment_name)s -->
<script src="https://getrockerbox.com/pixel?source=%(pixel_source_name)s&type=imp&an_seg=%(segment_id)s" type="text/javascript"></script>
<!-- End of Segment Pixel -->
"""

SEGMENT_DESCRIPTIONS = {
    "Purchase Conversion Pixel": "Fire the following after a user makes a purchase. <br/> Substitute a unique identifier (e.g. user ID, order_id, user email) for [user_identifier] prior to firing the pixel. ",
    "Signup Conversion Pixel": "Fire the following after a user has executed a signup. <br/> Substitute a unique identifier (e.g. user ID, order_id, user email) for [user_identifier] prior to firing the pixel. ",
    "All Pages Segment": "Place the following on ALL PAGES",
    "Logged In Segment": "Place the following on ALL pages for EXISTING CUSTOMERS"
}


API_QUERY = "select * from advertiser where %s "

INCLUDES = {
    "pixels":"advertiser_pixel",
    "campaigns": "advertiser_campaign",
    "segments": "advertiser_segment",
    "domain_lists": "advertiser_domain_list",
    "insertion_orders": "insertion_order"
}
 
INSERT_ADVERTISER = """
INSERT INTO advertiser (
    contact_name, 
    external_advertiser_id, 
    email,
    advertiser_name,
    pixel_source_name
) 
VALUES (
    '%(contact_name)s', 
    %(advertiser_id)s, 
    '%(email)s', 
    '%(advertiser_name)s' , 
    '%(pixel_source_name)s'
)
"""

INSERT_PIXEL = """
INSERT INTO advertiser_pixel (
    external_advertiser_id, 
    pixel_id,
    pixel_display_name,
    pixel_name,
    pc_window_hours,
    pv_window_hours
) 
VALUES (
    '%(external_advertiser_id)s', 
    '%(pixel_id)s', 
    '%(pixel_display_name)s', 
    '%(pixel_name)s' , 
    '%(pc_window_hours)s',
    '%(pv_window_hours)s'
)
"""

INSERT_SEGMENT = """
INSERT INTO advertiser_segment (
    external_advertiser_id,
    external_member_id,
    external_segment_id,
    segment_name,
    segment_implemented,
    segment_description
) 
VALUES (
    '%(external_advertiser_id)s', 
    '%(external_member_id)s', 
    '%(external_segment_id)s', 
    '%(segment_name)s',
    '%(segment_implemented)s',
    '%(segment_description)s'
)
"""

class Advertiser(object):

    def insert_advertiser(self,advertiser_id,advertiser_name):
        params = {
            "advertiser_id": advertiser_id,
            "contact_name": self.get_argument('contact_name'),
            "email": self.get_argument('contact_email'),
            "advertiser_name": advertiser_name,
            "pixel_source_name": self.get_argument("pixel_source_name")
        }
        query = INSERT_ADVERTISER % params
        self.db.execute(query)            
        self.db.commit()
        df = self.db.select_dataframe(
            "select id from advertiser where external_advertiser_id = %s" % advertiser_id
        )
        return df["id"][0]

    def insert_pixel(self,pixel_id,pixel_name,advertiser_id,advertiser_name,pct,pvt):
        params = {
            "external_advertiser_id": advertiser_id,
            "pixel_id": pixel_id,
            "pixel_display_name": pixel_name,
            "pixel_name": pixel_name,
            "pc_window_hours": pct,
            "pv_window_hours": pvt
        }
        query = INSERT_PIXEL % params
        self.db.execute(query)            
        self.db.commit()

    def insert_segment(self,segment_id,segment_name,advertiser_id,member_id,segment_implemented,segment_description):
        params = {
            "external_advertiser_id": advertiser_id,
            "external_segment_id": segment_id,
            "segment_name": segment_name,
            "advertiser_id": advertiser_id,
            "external_member_id": member_id,
            "segment_implemented": segment_implemented,
            "segment_description": segment_description
        }
        query = INSERT_SEGMENT % params
        print query
        self.db.execute(query)            
        self.db.commit()
 

    def create_advertiser(self,advertiser_name):
        data = {"advertiser": {"name": advertiser_name, "state": "active"} }
        response = self.api.post('/advertiser',data=ujson.dumps(data)).json
        print response
        advertiser_id = response["response"]["advertiser"]["id"]
        return advertiser_id

    def create_segment(self,advertiser_id,advertiser_name,segment_name,conversion_pixel=None):
        data = {"segment":{ "member_id":2024, "short_name":advertiser_name + " - " + segment_name} }
        URL = "/segment?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json

        params = {
            "pixel_source_name":self.get_argument("pixel_source_name"),
            "segment_id": response["response"]["segment"]["id"],
            "segment_name":advertiser_name + " - " + segment_name,
            "pixel_id":conversion_pixel
        }

        if conversion_pixel is not None:
            formatted_pixel = CONVERSION_PIXEL % params 
        elif "Creative" not in segment_name:
            formatted_pixel = SEGMENT_PIXEL % params
        else:
            formatted_pixel = ""
 
        self.insert_segment(
            response["response"]["segment"]["id"],
            advertiser_name + " - " + segment_name,
            advertiser_id,
            2024,
            formatted_pixel,
            SEGMENT_DESCRIPTIONS.get(segment_name,"")
        ) 
        return response["response"]["segment"]["id"]
   
    def create_pixel(self,advertiser_id,advertiser_name,pixel_name,pct,pvt):
        data = {
            "pixel": { 
                "name": "%s - %s" % (advertiser_name,pixel_name), 
                "post_view_expire_mins": 720*60, 
                "post_click_expire_mins": 720*60, 
                "post_view_value": 1, 
                "state": "active", 
                "trigger_type": "hybrid" 
            } 
        } 
        URL = "/pixel?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json

        self.insert_pixel(
            response["response"]["pixel"]["id"],
            pixel_name.split(" Conv")[0],
            advertiser_id,
            advertiser_name,
            pct,
            pvt
        )

        return response["response"]["pixel"]["id"]

    def create_publisher(self,advertiser_name):
        data = {
            "publisher": {
                "name": advertiser_name
            }
        }
        URL = "/publisher"
        response = self.api.post(URL,data=ujson.dumps(data)).json

        return response["response"]["publisher"]["id"]

    def create_managed_line_item(self,pixel_dict,advertiser_id):
        data = {
            "line-item" : {
                "name": "Managed Test",
                "state": "active",
                "revenue_type": "cpa",
                "pixels": [ {"id":_id, "post_click_revenue":0} for name, _id in pixel_dict.iteritems() ]
                
            }
        }
        URL = "/line-item?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["line-item"]["id"]

    def create_managed_campaign(self,advertiser_id,line_item_id):
        data = {
            "campaign" : {
                "name": "Managed Test",
                "state": "active",
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "inventory_type": "direct"
            }
        }

        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id)
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["campaign"]["id"] 

    def set_managed_target(self,advertiser_id,campaign_id,placement_id):
        data = {
            "profile": {
                "inventory_action": "include",
                "placement_targets": [{"id":placement_id}]
            }
        }

        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["profile"]["id"]

    def create_live_line_item(self,pixel_dict,advertiser_id):
        data = {
            "line-item" : {
                "name": "Live Test",
                "state": "active",
                "revenue_type": "cpa",
                "pixels": [ {"id":_id, "post_click_revenue":0} for name, _id in pixel_dict.iteritems() ]
            }
        }

        URL = "/line-item?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["line-item"]["id"]

    def create_live_campaign(self,advertiser_id,line_item_id):
        data = {
            "campaign" : {
                "name": "Live Test",
                "state": "active",
                "advertiser_id":  advertiser_id,
                "line_item_id": line_item_id,
                "lifetime_budget": 50,
                "inventory_type": "real_time",
                "cpm_bid_type": "base",
                "base_bid": 1
            }
        }
        URL = "/campaign?advertiser_id=%s&line_item=%s" % (advertiser_id,line_item_id)
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["campaign"]["id"] 

    def set_live_target(self,advertiser_id,campaign_id,segment_id):
        data = {
            "profile": {
                "segment_targets": [{"id":segment_id}]
            }
        }
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response
        return response["response"]["profile"]["id"]

        
    def set_campaign_profile_id(self,advertiser_id,campaign_id,profile_id):
        data = {
            "campaign": {
                "id":campaign_id,
                "profile_id": profile_id
            }
        }

        URL = "/campaign?id=%s&advertiser_id=%s" % (campaign_id,advertiser_id)
        response = self.api.put(URL,data=ujson.dumps(data)).json

        return response
         
     

    def get_default_placement(self,publisher_id):
        URL = "/placement?publisher_id=%s" % publisher_id
        response = self.api.get(URL).json
        print response
        return response["response"]["placements"][0]["id"]
 

class AdvertiserHandler(tornado.web.RequestHandler,Advertiser):
    def initialize(self, db, api):
        self.db = db 
        self.api = api
  

    def create_segments(self,advertiser_id,advertiser_name,_segment_names=[],conversion_pixels={}): 
        segment_names = _segment_names + ["Creative Viewed", "Creative Clicked", "Test Segment"] 

        if self.get_argument('all_pages_pixel_checkbox') == "true":
            segment_names.append("All Pages Segment")

        if self.get_argument('logged_in_pixel_checkbox') == "true":
            segment_names.append("Logged In Segment")

        segment_dict = { 
            segment_name: self.create_segment(advertiser_id,advertiser_name,segment_name,conversion_pixels.get(segment_name,None)) 
                for segment_name in segment_names
        }

        return segment_dict


    def create_pixels(self,advertiser_id,advertiser_name):
        pixel_names = []
        if self.get_argument('signup_conversion_checkbox') == "true":
            pixel_names.append("Signup Conversion Pixel")

        if self.get_argument('purchase_conversion_checkbox') == "true":
            pixel_names.append("Purchase Conversion Pixel")
        pct = 1
        pvt = 1

        pixel_dict = {
            pixel_name: self.create_pixel(advertiser_id, advertiser_name, pixel_name, pct, pvt)
                for pixel_name in pixel_names
        }
        
        return pixel_dict


    def post(self,arg="new"):
        advertiser_name = self.get_argument('advertiser_name')

        advertiser_id = self.create_advertiser(advertiser_name)
        internal_id = self.insert_advertiser(advertiser_id,advertiser_name)

        pixel_dict = self.create_pixels(advertiser_id,advertiser_name)
        segment_dict = self.create_segments(advertiser_id,advertiser_name,pixel_dict.keys(),pixel_dict)
    
        publisher_id = self.create_publisher(advertiser_name)
        time.sleep(5)
        placement_id = self.get_default_placement(publisher_id)
        
        # Managed test
        line_item_id = self.create_managed_line_item(pixel_dict,advertiser_id)
        campaign_id = self.create_managed_campaign(advertiser_id, line_item_id)

        profile_id = self.set_managed_target(advertiser_id, campaign_id, placement_id)
        self.set_campaign_profile_id(advertiser_id,campaign_id,profile_id)


        # Live test
        line_item_id = self.create_live_line_item(pixel_dict,advertiser_id)
        campaign_id = self.create_live_campaign(advertiser_id, line_item_id)
        time.sleep(5)

        segment_id = segment_dict["Test Segment"]
        profile_id = self.set_live_target(advertiser_id, campaign_id, segment_id)
        self.set_campaign_profile_id(advertiser_id,campaign_id,profile_id)
 

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            if advertiser_id:
                self.render("../templates/admin/advertiser/show.html",data=o)
            else:
                self.render("../templates/admin/advertiser/index.html",data=o) 

        yield default, (data,)

    def get_data(self,advertiser_id=False):

        where = "deleted = 0"
        if advertiser_id:
            where = ("external_advertiser_id = %s" % advertiser_id)
        
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id")
        includes = self.get_argument("include","domain_lists,segments,pixels,insertion_orders")


        include_list = includes.split(",")
        for include in include_list:
            included = INCLUDES.get(include,False)
            if included:
              q = "select * from %s where %s" % (included,where)
              idf = self.db.select_dataframe(q)
              if len(idf) > 0:
                  df[include] = idf.groupby("external_advertiser_id").apply(Convert.df_to_values)

        self.get_content(df.reset_index(),advertiser_id)
        

    @tornado.web.asynchronous
    def get(self,arg=False):

        if arg == "new":
            self.render("../templates/admin/advertiser/new.html")
        else:
            self.get_data(arg)
