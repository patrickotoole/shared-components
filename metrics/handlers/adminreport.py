from lib.report.base import ReportDomainHandler


class AdminReportHandler(ReportDomainHandler):
    def initialize(self, *args, **kwargs):
        kwargs['cache'] = True
        super(AdminReportHandler, self).__init__(**kwargs)
