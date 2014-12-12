from ...helpers import *
from ...base import Routes

class CensusRoutes(Routes):

    @namespace("/admin/census")
    @connectors("hive")
    def census(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/age_gender/?',reporting.AdvertiserReportingHandler, self.connectors),
            (r'/age_gender/?(.*?)/?', reporting.AgeGenderCensusHandler, self.connectors),
            (r'/age_gender/?(.*?)/?(meta)/?', reporting.AgeGenderCensusHandler, self.connectors),
            (r'/income/?(.*?)/?', reporting.IncomeCensusHandler, self.connectors),
            (r'/income/?(.*?)/?(meta)/?', reporting.IncomeCensusHandler, self.connectors),
            (r'/race/?(.*?)/?', reporting.RaceCensusHandler, self.connectors),
            (r'/race/?(.*?)/?(meta)/?', reporting.RaceCensusHandler, self.connectors)
        ]
 
 
