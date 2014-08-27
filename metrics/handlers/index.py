import tornado.web

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        production_links = [
            ("/streaming", "Streaming"),
            ("/reporting", "Reporting")
        ]
        
        internal_links = [
            ("/admin/targeting", "Targeting Tool"),
            ("/admin/intraweek", "Intraweek Tool"),
            ("/admin/batch_request", "Batch Segment Request"),
            ("/admin/scrubbed_segments", "Scrubbed Segments"), 
            ("/analysis", "Segment/DMA Analysis"),
            ("/admin/viewable", "Viewability Analysis"),
            ("/admin.advertiser", "Advertiser Creator"),
            ("/analysis/pixel/", "Pixel Analysis (aka Rockerbox vs. Non-Rockerbox)"),
            ("/admin/money", "Money Tool"),
            ("http://graphite.getrockerbox.com/dashboard", "Graphite (Engineering)")
        ]
        
        self.render('../templates/index.html', production_links=production_links, internal_links=internal_links)
