
import tornado.web
import ujson
import pandas
import StringIO
import mock
import time

from lib.helpers import *  

CONVERSION_PIXEL = """<!-- Rockerbox - %(segment_name)s -->
<script src="https://secure.adnxs.com/px?id=%(pixel_id)s&seg=%(segment_id)s&t=1&order_id=[variable_holder]" type="text/javascript"></script> 
<script src="https://getrockerbox.com/pixel?source=%(pixel_source_name)s&type=conv&id=%(pixel_id)s&seg=%(segment_id)s&order_type=[variable_holder]" type="text/javascript"></script>
<!-- End of Segment Pixel -->"""

SEGMENT_PIXEL = """<!-- Rockerbox - %(segment_name)s -->
<script src="https://getrockerbox.com/pixel?source=%(pixel_source_name)s&type=imp&an_seg=%(segment_id)s" type="text/javascript"></script>
<!-- End of Segment Pixel -->
"""

SEGMENT_DESCRIPTIONS = {
    "Purchase Conversion Pixel": "<b>Implementation Instructions :</b><div style=\"margin-left:20px\">The Purchase Conversion Pixel should be fired after a user executes a purchase.<br>The [variable_holder] field is used to pass purchase level information (e.g. order ID, purchase value, purchaser\\'s email) to Rockerbox. This information needs to be passed in <i>both</i> [variable_holder] locations.<br><br>Example :<ul><li><b>Order ID</b> : ....&amp;order_id=3454....&amp;order_type=3454</li><li><b>Purchaser\\'s Email :</b> ....&amp;order_id=test@test.com....&amp;order_type=test@test.com...</li></ul></div></div>",
    "Signup Conversion Pixel": "<b>Implementation Instructions :</b><div style=\"margin-left:20px\">The Signup Conversion Pixel should be fired after a user signs up / registers.<br>The [variable_holder] field is used to pass signup level information (e.g. user ID,  purchaser\\'s email) to Rockerbox. This information needs to be passed in <i>both</i> [variable_holder] locations.<br><br>Example :<ul><li><b>User ID</b> : ....&amp;order_id=432353....&amp;order_type=432353</li><li><b>Purchaser\\'s Email :</b> ....&amp;order_id=test@test.com....&amp;order_type=test@test.com...</li></ul></div></div>",
    "All Pages Segment": "<b>Implementation Instructions :</b><div style=\"margin-left:20px\">The All Pages Segment should be placed on <b>all</b> pages.</div>",
    "Logged In Segment": "<b>Implementation Instructions :</b><div style=\"margin-left:20px\">The Logged In Segment should be fired on <b>all</b> pages for visitors that are logged in. This allows Rockerbox to differentiate between new visitors and existing customrs.</div>"
}


API_QUERY = "select * from advertiser where %s "

INCLUDES = {
    "pixels":"advertiser_pixel",
    "campaigns": "advertiser_campaign",
    "segments": "advertiser_segment",
    "domain_lists": "advertiser_domain_list",
    "insertion_orders": "insertion_order",
    "hourly_served_estimate":"reporting.advertiser_served_hourly"
}
 
INSERT_ADVERTISER = """
INSERT INTO advertiser (
    contact_name, 
    external_advertiser_id, 
    email,
    advertiser_name,
    pixel_source_name,
    client_goals,
    client_sld
) 
VALUES (
    '%(contact_name)s', 
    %(advertiser_id)s, 
    '%(email)s', 
    '%(advertiser_name)s' , 
    '%(pixel_source_name)s',
    '%(client_goals)s',
    '%(client_sld)s'
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
INSERT_EMAIL = """
INSERT INTO advertiser_email (
    external_advertiser_id,
    contact_name,
    email
) 
VALUES (
    '%(external_advertiser_id)s', 
    '%(contact_name)s', 
    '%(email)s'
)
"""
 
class Advertiser(object):

    def insert_advertiser(self,advertiser_id,advertiser_name):
        params = {
            "advertiser_id": advertiser_id,
            "contact_name": self.get_argument('contact_name'),
            "email": self.get_argument('contact_email'),
            "advertiser_name": advertiser_name,
            "pixel_source_name": self.get_argument("pixel_source_name"),
            "client_goals" : self.get_argument("advertiser_details"),
            "client_sld" : self.get_argument("client_sld")
        }
        query = INSERT_ADVERTISER % params
        self.db.execute(query)            
        #self.db.commit()
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
        #self.db.commit()

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
        #self.db.commit()
 
    def insert_emails(self,advertiser_id):
        params = {
            "external_advertiser_id": advertiser_id,
            "contact_name": self.get_argument('contact_name'),
            "email": self.get_argument('contact_email')
        }
        query = INSERT_EMAIL % params
        print query
        self.db.execute(query)            
        #self.db.commit()
 
        if self.get_argument('contact_name_2') != "":
            params = {
                "external_advertiser_id": advertiser_id,
                "contact_name": self.get_argument('contact_name_2'),
                "email": self.get_argument('contact_email_2')
            }
            query = INSERT_EMAIL % params
            print query
            self.db.execute(query)            
            #self.db.commit()
              
    def create_advertiser(self,advertiser_name):
        data = {"advertiser": {"name": advertiser_name, "state": "active"} }
        response = self.api.post('/advertiser',data=ujson.dumps(data)).json
        logging.info(response)
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
        elif "Creative" not in segment_name and "Test" not in segment_name:
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
        if pixel_name == "Signup Conversion Pixel":
            pct = self.get_argument("signup_conversion_checkbox_pc")
            pvt = self.get_argument("signup_conversion_checkbox_pv")
        if pixel_name == "Purchase Conversion Pixel":
            pct = self.get_argument("purchase_conversion_checkbox_pc")
            pvt = self.get_argument("purchase_conversion_checkbox_pv")

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
        response_pub = self.api.post(URL,data=ujson.dumps(data)).json
        publisher_id = response_pub["response"]["publisher"]["id"]
        #Making base payment rule
        data = { 
                "payment-rule":{ 
                    "name": "Base Rule", 
                    "pricing_type": "revshare", 
                    "revshare": "1", 
                    "state": "active" 
                }
            }
        URL = "/payment-rule?publisher_id=%s" % publisher_id
        response_payment = self.api.post(URL,data=ujson.dumps(data)).json
        payment_id = response_payment["response"]["payment-rule"]["id"]
        #Adding base payment rule to publisher
        data = {
                "publisher":{
                    "base_payment_rule_id":payment_id
            }
        }
        URL = "/publisher?id=%s" % publisher_id
        response = self.api.put(URL,data=ujson.dumps(data)).json
        return publisher_id

    def set_default_placement_reselling(self,placement_id):
        data = {
            "placement":{
                "exclusive":"true"
            }
        }
        URL = "/placement?id=%s" % placement_id
        response = self.api.put(URL,data=ujson.dumps(data)).json
        return response

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
                "placement_targets": [{"id":placement_id}],
                "device_type_targets": ["phone","tablet"],
                "supply_type_targets": ["mobile_app","mobile_web"]
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

    def set_live_target_placement(self,advertiser_id,campaign_id,segment_id,placement_id,domain):
        data = {
            "profile": {
                 "segment_group_targets": [
                                {
                                    "boolean_operator": "and",
                                    "segments": [
                                        {
                                            "action": "include",
                                            "id": segment_id
                                        }
                                    ]
                                }
                            ],
                 "platform_placement_targets": [
                                {
                                    "action": "include",
                                    "id": placement_id
                                }
                            ],
                 "domain_action": "include",
                 "domain_targets": [
                                {
                                    "domain": domain
                                }
                            ],
                 "intended_audience_targets": [
                                "general",
                                "children",
                                "young_adult"
                            ],
                 "position_targets": {
                                "allow_unknown": true,
                                "positions": null
                            },
                 "trust": "appnexus",
                 "use_inventory_attribute_targets": true,
                 "use_operating_system_extended_targeting": true
            }
        }
        URL = "/profile?advertiser_id=%s&campaign_id=%s" % (advertiser_id,campaign_id) 
        response = self.api.post(URL,data=ujson.dumps(data)).json
        print response

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
         
     

    def get_default_placement(self,publisher_id,count=0):
        URL = "/placement?publisher_id=%s" % publisher_id
        response = self.api.get(URL).json
        if count==10:
            raise Exception("Fucked")
        try:
            placement =  response["response"]["placements"][0]["id"]
        except KeyError:
            import time
            time.sleep(5*count)
            return self.get_default_placement(publisher_id,count + 1)
        return placement
 

class AdvertiserHandler(tornado.web.RequestHandler,Advertiser):
    def initialize(self, db, api):
        self.db = db 
        self.api = api

    def put(self,advertiser_id):
        json = ujson.loads(self.request.body)
        
        update_string = ", ".join(["`%s`='%s'" % (i,j) for i,j in json.items()])

        query = "UPDATE advertiser set %s WHERE external_advertiser_id = %s" % (update_string,advertiser_id)
        print query

        self.db.execute(query)
        self.write("1")
        self.finish()
  
    
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
        self.insert_emails(advertiser_id)

        pixel_dict = self.create_pixels(advertiser_id,advertiser_name)
        segment_dict = self.create_segments(advertiser_id,advertiser_name,pixel_dict.keys(),pixel_dict)
    
        publisher_id = self.create_publisher(advertiser_name)
        #time.sleep(10)
        placement_id = self.get_default_placement(publisher_id)
        self.set_default_placement_reselling(placement_id) 

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
        self.write(ujson.dumps(advertiser_id)) 

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            o = Convert.df_to_json(data)
            if advertiser_id:
                self.render("../templates/admin/advertiser/%s.html" % self.page,data=o)
            else:
                self.render("../templates/admin/advertiser/%s.html" % self.page,data=o) 

        yield default, (data,)

    def get_data(self,advertiser_id=False):

        where = "deleted = 0"
        if advertiser_id:
            where = ("external_advertiser_id in (%s)" % advertiser_id)

        print API_QUERY % where
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id")
        includes = self.get_argument("include","domain_lists,segments,pixels,insertion_orders,campaigns,hourly_served_estimate")


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

        print arg

        if arg == "new":
            self.render("../templates/admin/advertiser/new.html")
        elif "streaming" in arg:
            a = arg.replace("streaming","").replace("/","")
            self.page = "streaming"
            self.get_data(False) if len(a) == 0 else self.get_data(a) 
        elif "info" in arg:
            a = arg.replace("info","").replace("/","")
            self.page = "info"
            self.get_data(False) if len(a) == 0 else self.get_data(a)
        else:
            self.page = "index"
            self.get_data(arg)
