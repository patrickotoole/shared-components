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
            ("/admin/advertiser/reporting", "[ALPHA] Reporting (unified)"), 
            ("/admin/advertiser/domain_list/reporting", "Domain List Impressions Available"), 
            ("/admin/advertiser/served/geo/reporting", "Served Geo data"),
            ("/admin/advertiser/hoverboard_v2/reporting?meta=category&advertiser=baublebar&limit=20", "Hoverboard")
        ]

        advertiser_pixel_links = [
            ("/admin/advertiser/pixel/reporting", "Summary (Rockerbox vs. all users)"),
            ("/admin/advertiser/pixel/geo/reporting", "Geo (city, state, zip, dma, etc.) data"),
            ("/admin/advertiser/pixel/device/reporting", "Device (browser, os) data")
        ]

        advertiser_viewability_links = [
            ("/admin/advertiser/viewable", "Viewablity"), 
            ("/admin/advertiser/viewable/reporting", "Campaign Viewability")
        ]

        advertiser_conversion_links = [
            ("/admin/advertiser/conversion/reporting", "Conversion Reporting"),
            ("/admin/advertiser/conversion/imps/reporting", "Served Imps Resulting in Conversions")
        ]

        advertiser_click_links = [
            ("/admin/advertiser/click/reporting", "Click Reporting"),
            ("/admin/advertiser/click/imps/reporting", "Served Imps Resulting in Clicks")
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
            advertiser_pixel_links = advertiser_pixel_links,
            domain_links = domain_links,
            segment_links=segment_links,
            demographics_links = demographics_links
        )
