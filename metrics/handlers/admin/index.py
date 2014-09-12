import tornado.web

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        production_links = [
            ("/streaming", "Streaming"),
            ("/reporting", "Reporting")
        ]

        advertiser_links = [
            ("/admin/advertiser", "Advertiser Creator"),
            ("/admin/advertiser/pixel/reporting", "On-site Analysis (Rockerbox vs. all users)"),
            ("/admin/advertiser/viewable", "Advertiser Viewability"),
            ("/admin/advertiser/domain_list/reporting", "Advertiser Domain List Reporting (Total Available Impressions)"), 
            ("/admin/advertiser/reporting", "Advertiser Quick Stats Reporting"),  
        ]

        
        internal_links = [
            ("/admin/advertiser/domain_list/", "Targeting Tool"),
            ("/admin/intraweek", "Intraweek Tool"),
            ("/admin/batch_request/new", "Batch Requests"),
            ("/admin/segment/scrubbed", "Scrubbed Segments"), 
            ("/admin/segment/reporting", "Segment Avails Reporting"),  
            ("/admin/imps/", "Segment/DMA Analysis"),
            ("/admin/viewable", "Viewability Analysis"),
            ("/admin/analysis/pixel/", "Pixel Analysis (aka Rockerbox vs. Non-Rockerbox)"),
            ("/admin/money", "Money Tool"),
            ("http://graphite.getrockerbox.com/dashboard", "Graphite (Engineering)")
        ]
        
        self.render(
            '../templates/admin/index.html', 
            production_links=production_links, 
            internal_links=internal_links,
            advertiser_links=advertiser_links
        )
