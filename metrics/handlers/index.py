import tornado.web

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        production_links = [
            ("/streaming", "Streaming Tool"),
            ("/reporting", "Reporting Tool")
        ]
        
        internal_links = [
            ("/admin/targeting", "Targeting Tool"),
            ("/intraweek", "Intraweek Tool"),
            ("/analysis", "Segment/DMA Analysis"),
            ("/advertiser", "Advertiser Creator"),
            ("/money", "Money Tool"),
            ("http://graphite.getrockerbox.com/dashboard", "Graphite (Engineering)")
        ]
        
        self.render('../templates/index.html', production_links=production_links, internal_links=internal_links)
