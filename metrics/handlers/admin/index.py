import tornado.web
from ..base import BaseHandler

class IndexHandler(BaseHandler):

    def initialize(self, db=None):
        self.db = db

    def get(self):
        advertiser_id = self.get_argument("advertiser_id", False)
        pixel_source_name = self.get_argument("advertiser", False)

        if pixel_source_name:
            Q = "select external_advertiser_id from advertiser where pixel_source_name = '%s' "
            advertiser_id = str(self.db.select_dataframe(Q % pixel_source_name).external_advertiser_id[0])

        if advertiser_id:
            self.set_secure_cookie( "advertiser",advertiser_id )

        production_links = [
            ("/streaming", "Streaming"),
            ("/reporting", "Reporting"),
            ("/admin/advertiser/client/reporting", "[NEW] Reporting - admin access (use advertiser parameter)"),
            ("/pixel", "Pixel Reporting"),
            ("/hoverboard", "Hoverboard")
        ]

        tools = [
            ("/admin/advertiser/domain_list/streaming", "Targeting Tool"),
            ("/admin/advertiser/new", "Advertiser Creator Tool"),
            ("/admin/segment/scrubbed", "Scrubbed Segments Tool"),
            ("/admin/batch_request/new", "Batch Request Tool"),
            ("/admin/appnexus/campaign", "Mass edit (by campaign)"),
            ("/admin/advertiser/logins", "Advertiser Admin Logins"),
            ("/admin/pixel/alerts", "Pixel Alerts Settings"),
            ("/admin/pixel/status", "Pixel Status")
        ]

        opt_tools = [
            ("/admin/opt_config", "Optimization Config"),
            ("/admin/opt_campaigns", "Optimization Campaigns")
        ]

        delorean_links = [
            ("/admin/filter/domains","Delorean Domain"),
            ("/admin/filter","Delorean Filter Tool"),

            ("/admin/filter/streaming","Delorean Monitoring -- Bubbles"),
            ("/admin/filter/sankey","Delorean Monitoring -- Sankey"),

        ]

        dashboard_links = [
            ("/admin/advertiser", "Advertiser Index"),
            ("/admin/advertiser/streaming", "Streaming Dashboard"),
            ("/admin/advertiser/streaming?limited=true", "Streaming Dashboard (limited)"),
            ("/admin/trello", "Trello Dashboard")
        ]

        hoverboard_links = [
            ("/admin/advertiser/hoverboard_v2/reporting?meta=category&advertiser=baublebar&limit=20", "Hoverboard")
        ]

        advertiser_served_links = [
            ("/admin/advertiser/served/geo/reporting", "Served Geo data")
        ]

        advertiser_pixel_links = [
            ("/admin/advertiser/pixel/reporting", "Summary (Rockerbox vs. all users)"),
            ("/admin/advertiser/pixel/geo/reporting", "Geo (city, state, zip, dma, etc.) data"),
            ("/admin/advertiser/pixel/device/reporting", "Device (browser, os) data")
        ]

        advertiser_visit_links = [
            ("/admin/advertiser/visits/reporting", "Visits Reporting")
            ]

        advertiser_conversion_links = [
            ("/admin/advertiser/conversion/reporting", "Conversion Reporting"),
            ("/admin/advertiser/conversion/imps/reporting", "Served Imps Resulting in Conversions")
        ]

        advertiser_click_links = [
            ("/admin/advertiser/click/reporting", "Click Reporting"),
            ("/admin/advertiser/click/imps/reporting", "Served Imps Resulting in Clicks")
        ]

        advertiser_viewability_links = [
            ("/admin/advertiser/viewable/reporting", "Campaign Viewability")
        ]

        domain_links = [
            ("/admin/viewable/domain_list", "Domain List Optimization Status"),
            ("/admin/domain/categories/reporting", "Domain Volume by Category")
        ]

        demographics_links = [
            ("/admin/census/income", "Income Census Data"),
            ("/admin/census/age_gender", "Age/Gender Census Data"),
            ("/admin/census/race", "Race Census Data")
        ]

        datapipeline_links = [
            ("http://graphite.getrockerbox.com/dashboard/#will", "Graphite (Engineering)")
        ]

        deprecated = [
            ("/admin/advertiser/domain_list/reporting", "Domain List Impressions Available"),
            ("/admin/advertiser/segment", "Segment"),
            ("/admin/advertiser/reporting", "[ALPHA] Reporting (unified)"),
            ("/admin/money", "Money Tool"),
            ("/admin/segment/reporting", "Segment Avails Reporting"),
            ("/admin/viewable", "Viewability Analysis"),
            ("/admin/imps/", "Segment/DMA Analysis"),
            ("/admin/intraweek", "Intraweek Tool")
        ]

        self.render(
            '../templates/admin/index.html',
            production_links=production_links,
            datapipeline_links=datapipeline_links,
            dashboard_links=dashboard_links,
            advertiser_viewability_links=advertiser_viewability_links,
            advertiser_served_links = advertiser_served_links,
            advertiser_conversion_links = advertiser_conversion_links,
            advertiser_click_links = advertiser_click_links,
            advertiser_pixel_links = advertiser_pixel_links,
            advertiser_visit_links = advertiser_visit_links,
            domain_links = domain_links,
            demographics_links = demographics_links,
            hoverboard_links = hoverboard_links,
            tools = tools,
            opt_tools = opt_tools,
            deprecated = deprecated,
            delorean_links = delorean_links
        )
