import tornado.web

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        production_links = [
            ("/admin/streaming", "Streaming Tool"),
            ("/reporting", "Reporting Tool")
        ]
        
        internal_links = [
            ("/admin/targeting", "Targeting Tool"),
            ("/intraweek", "Intraweek Tool"),
            ("/admin/batch_request", "Batch Segment Request"),
            ("/analysis", "Segment/DMA Analysis"),
            ("/advertiser", "Advertiser Creator"),
            ("/money", "Money Tool"),
            ("http://graphite.getrockerbox.com/dashboard", "Graphite (Engineering)")
        ]
        
        self.render('../templates/index.html', production_links=production_links, internal_links=internal_links)
