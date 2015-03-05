import tornado.web

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        production_links = [
            ("/streaming", "Streaming"),
            ("/reporting", "Reporting")
        ]

        advertiser_links = [
            ("/admin/advertiser", "Index"),
            ("/admin/advertiser/new", "Advertiser Creator"),
            ("/admin/advertiser/logins", "Advertiser Admin Logins"),            
            ("/admin/advertiser/segment", "Segment"),  
            ("/admin/advertiser/pixel/reporting", "On-site (Rockerbox vs. all users)"),
            ("/admin/advertiser/pixel/geo/reporting", "On-site geo (city, state, zip, dma, etc.) data"),
            ("/admin/advertiser/pixel/device/reporting", "On-site device (browser, os) data"),
            ("/admin/advertiser/reporting", "[ALPHA] Reporting (unified)"), 
            ("/admin/advertiser/domain_list/reporting", "Domain List Impressions Available"), 
            ("/admin/advertiser/summary/reporting", "Domain Aggregated Reporting"),  
            ("/admin/advertiser/debug/reporting", "Debug Reporting"),
            ("/admin/advertiser/served/geo/reporting", "Served Geo data"),
            ("/admin/advertiser/hoverboard/reporting", "Hoverboard data"),
            ("/admin/advertiser/hoverboard_v2/reporting?meta=category&advertiser=baublebar&limit=20", "Hoverboard V2 (categories)"),
            ("/admin/advertiser/hoverboard_v2/reporting?meta=keyword&advertiser=baublebar&limit=20", "Hoverboard V2 (keywords)"),
            ("/admin/advertiser/hoverboard_v2/reporting?meta=domain&advertiser=baublebar&limit=20", "Hoverboard V2 (domains)")
        ]

        advertiser_viewability_links = [
            ("/admin/advertiser/viewable", "Viewablity"), 
            ("/admin/advertiser/viewable/reporting", "Campaign Viewability"),
            ("/admin/advertiser/viewable/reporting?meta=bucket", "Campaign Bucket Viewability"),
            ("/admin/advertiser/viewable/reporting?meta=domain_list", "Domain List Viewability"),
            ("/admin/advertiser/viewable/reporting?meta=experiment", "Experiment Viewability")
        ]

        advertiser_conversion_links = [
            ("/admin/advertiser/conversion/reporting", "Conversion Reporting"),
            ("/admin/advertiser/conversion/imps/reporting", "Served Imps Resulting in Conversions"),
            ("/admin/advertiser/conversion/reporting?meta=bucket", "Campaign Bucket Conversions"),
            ("/admin/advertiser/conversion/reporting?meta=experiment", "Experiment Conversions"),
            ("/admin/advertiser/conversion/reporting?meta=top_domains", "Top Performing Domains")
        ]

        advertiser_click_links = [
            ("/admin/advertiser/click/reporting", "Click Reporting"),
            ("/admin/advertiser/click/imps/reporting", "Served Imps Resulting in Clicks"),
            ("/admin/advertiser/click/reporting?meta=bucket", "Campaign Bucket Clicks"),
            ("/admin/advertiser/click/reporting?meta=experiment", "Experiment Clicks")
        ]

        domain_links = [
            ("/admin/viewable/domain_list", "Domain List Optimization Status"),
            ("/admin/domain/categories/reporting", "Domain Volume by Category")
        ]

        segment_links = [
            ("/admin/batch_request/new", "Batch Segment Request"),
            ("/admin/segment/scrubbed", "Scrubbed Segments"), 
            ("/admin/segment/reporting", "Segment Avails Reporting"),   
        ]

        demographics_links = [
            ("/admin/census/income", "Income Census Data"),
            ("/admin/census/age_gender", "Age/Gender Census Data"),
            ("/admin/census/race", "Race Census Data")
        ]
        
        internal_links = [
            ("/admin/appnexus/campaign", "Mass edit (by campaign)"), 
            ("/admin/advertiser/domain_list/streaming", "Targeting Tool"),
            ("/admin/filter","Delorean Filter Tool"),
            ("/admin/intraweek", "Intraweek Tool"),
            ("/admin/imps/", "Segment/DMA Analysis"),
            ("/admin/viewable", "Viewability Analysis"),
            ("/admin/money", "Money Tool"),
            ("http://graphite.getrockerbox.com/dashboard", "Graphite (Engineering)")
        ]
        
        self.render(
            '../templates/admin/index.html', 
            production_links=production_links, 
            internal_links=internal_links,
            advertiser_links=advertiser_links,
            advertiser_viewability_links=advertiser_viewability_links,
            advertiser_conversion_links = advertiser_conversion_links,
            advertiser_click_links = advertiser_click_links,
            domain_links = domain_links,
            segment_links=segment_links,
            demographics_links = demographics_links
        )
