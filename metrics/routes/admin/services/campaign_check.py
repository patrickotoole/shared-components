from ...helpers import *
from ...base import Routes

class CampaignCheckRoutes(Routes):

    @namespace("/admin/campaign_check")
    @connectors("db")
    def campaign_check(self):
        import handlers.admin.checks as checks

        return [
            (r'/fixtures/?(.*?)/?', checks.FixtureHandler, self.connectors),
            (r'/suites/?(.*?)/?', checks.SuiteHandler, self.connectors),
            (r'/relation/?(.*?)/?', checks.CampaignRelationsHandler, self.connectors),
            (r'.xml', checks.CircleCIXMLHandler, {}),
            (r'/?(.*?)/?', checks.CampaignChecksHandler, self.connectors)
        ]
