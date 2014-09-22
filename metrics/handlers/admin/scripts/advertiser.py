import tornado.web
import ujson
import pandas
import StringIO

API_QUERY = "select * from appnexus_reporting.%s where %s "

class AdvertiserHandler(tornado.web.RequestHandler):
    def initialize(self, db, api):
        self.db = db 
        self.api = api

    def get(self):
        response = ""
        table = self.get_argument("table",False)
        if table:
            response_format = self.get_argument("format","json")
            args = self.request.arguments
            args_list = ["1=1"]  
            args_list += [i + "=" + "".join(j) 
                for i,j in args.iteritems() 
                if i not in ["table","format"]
            ]

            where = " and ".join(args_list)

            table_query = API_QUERY % (table, where)
            data = self.db.select_dataframe(table_query)
            

            if response_format == "json":
                l = data.fillna(0).T.to_dict().values()
                response = ujson.dumps(l)
            elif response_format == "html":
                response = data.to_html()
            elif response_format == "csv":
                io = StringIO.StringIO()
                data.to_csv(io)
                response = io.getvalue()
                io.close()

            self.write(response)
        else:
            #j = self.api.get('/member').json

            self.render("../templates/admin/advertiser/new.html")
            #self.write(ujson.dumps(j))


    def post(self):
        advertiser_name = self.get_argument('advertiser_name')
        contact_name = self.get_argument('contact_name')
        contact_email = self.get_argument('contact_email')
        all_pages_pixel = self.get_argument('all_pages_pixel_checkbox')
        pixel_source_name = self.get_argument('pixel_source_name','')
        post_data = { "advertiser": { "name":advertiser_name, "state":"active" }}
        advertiser_post_response = self.api.post('/advertiser',data=ujson.dumps(post_data)).json
        print advertiser_post_response
        advertiser_id = advertiser_post_response["response"]["advertiser"]["id"]

        insert_advertiser_query = "insert into appnexus_reporting.advertiser (contact_name,external_advertiser_id,email,advertiser_name,pixel_source_name) values ('%s', %s, '%s', '%s' , '%s')" % (contact_name,str(advertiser_id),contact_email,advertiser_name,pixel_source_name)
        #Insert New Advertiser
        self.write(insert_advertiser_query)
        self.db.execute(insert_advertiser_query)            
        self.db.commit()
 
        #Making Creative Viewed / Clicked Segment
        post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - Creative Viewed" } }
        advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
        post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - Creative Clicked" } }
        advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
 
        #ALL PAGES SEGMENT PIXEL
        if self.get_argument('all_pages_pixel_checkbox') == "true":
            post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - All Pages Segment" } }
            advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
        
        #LOGGED IN SEGMENT PIXEL
        if self.get_argument('logged_in_pixel_checkbox') == "true":
            post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - Logged In Segment" } }
            advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
  
        #SIGNUP CONVERSION
        if self.get_argument('signup_conversion_checkbox') == "true":
            signup_conversion_checkbox_pc = int(self.get_argument('signup_conversion_checkbox_pc'))
            signup_conversion_checkbox_pv = int(self.get_argument('signup_conversion_checkbox_pv'))
 
            post_data = { "pixel": { "name": advertiser_name+" - Signup Conversion Pixel", "post_view_expire_mins": signup_conversion_checkbox_pv*60, "post_click_expire_mins": signup_conversion_checkbox_pc*60, "post_view_value": 1, "state": "active", "trigger_type": "hybrid" } } 
            pixel_post_response = self.api.post('/pixel?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
            pixel_id = pixel_post_response["response"]["pixel"]["id"]
            signup_pixel_query = "insert into appnexus_reporting.advertiser_pixel (external_advertiser_id,pixel_id,pixel_display_name,pc_window_hours,pv_window_hours) values ("+str(advertiser_id)+","+str(pixel_id)+",'Signup',"+str(signup_conversion_checkbox_pc)+","+str(signup_conversion_checkbox_pv)+");"
            self.write(signup_pixel_query)
            self.db.execute(signup_pixel_query)            
            self.db.commit()
 
            #SIGNUP CONVERSION SEGMENT
            post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - Converted Signup Segment","code":"1_"+str(advertiser_id) } }
            self.write(ujson.dumps(post_data)) 
            advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json

        #PURCHASE CONVERSION
        if self.get_argument('purchase_conversion_checkbox') == "true":
            purchase_conversion_checkbox_pc = int(self.get_argument('purchase_conversion_checkbox_pc'))
            purchase_conversion_checkbox_pv = int(self.get_argument('purchase_conversion_checkbox_pv'))
 
            post_data = { "pixel": { "name": advertiser_name+" - Purchase Conversion Pixel", "post_view_expire_mins": purchase_conversion_checkbox_pv*60, "post_click_expire_mins": purchase_conversion_checkbox_pc*60, "post_view_value": 1, "state": "active", "trigger_type": "hybrid" } } 
            pixel_post_response = self.api.post('/pixel?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json
            pixel_id = pixel_post_response["response"]["pixel"]["id"]
            purchase_pixel_query = "insert into appnexus_reporting.advertiser_pixel (external_advertiser_id,pixel_id,pixel_display_name,pc_window_hours,pv_window_hours) values ("+str(advertiser_id)+","+str(pixel_id)+",'Purchase',"+str(purchase_conversion_checkbox_pc)+","+str(purchase_conversion_checkbox_pv)+");"
            self.write(purchase_pixel_query)
            self.db.execute(purchase_pixel_query)            
            self.db.commit()
 
            #Purchase CONVERSION SEGMENT
            post_data = { "segment":{ "member_id":2024, "short_name":advertiser_name+" - Converted Purchase Segment","code":"2_"+str(advertiser_id) } }
            self.write(ujson.dumps(post_data)) 
            advertiser_post_response = self.api.post('/segment?advertiser_id='+str(advertiser_id),data=ujson.dumps(post_data)).json













