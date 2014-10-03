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
            ("/admin/advertiser/segment", "Segment"),  
            ("/admin/advertiser/pixel/reporting", "[ALPHA] On-site (Rockerbox vs. all users)"),
            ("/admin/advertiser/reporting", "[ALPHA] Reporting (unified)"), 
            ("/admin/advertiser/domain_list/reporting", "Domain List Impressions Available"), 
            ("/admin/advertiser/summary/reporting", "Domain Aggregated Reporting"),  
            ("/admin/advertiser/conversion/reporting", "Conversion Reporting"),
            ("/admin/advertiser/conversion/imps/reporting", "Conversion Served Imps Reporting"),
            ("/admin/advertiser/debug/reporting", "Debug Reporting")
        ]

        advertiser_viewability_links = [
            ("/admin/advertiser/viewable", "Viewablity"), 
            ("/admin/advertiser/viewable/reporting", "Campaign Viewability"),
            ("/admin/advertiser/viewable/reporting?meta=domain_list", "Domain List Viewability")
        ]

        segment_links = [
            ("/admin/batch_request/new", "Batch Segment Request"),
            ("/admin/segment/scrubbed", "Scrubbed Segments"), 
            ("/admin/segment/reporting", "Segment Avails Reporting"),   
        ]
        
        internal_links = [
            ("/admin/advertiser/domain_list/streaming", "Targeting Tool"),
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
            segment_links=segment_links
        )