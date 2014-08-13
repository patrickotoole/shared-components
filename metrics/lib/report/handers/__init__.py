import logging
import urllib

from handlers.reporting import ReportingHandler
from lib.helpers import decorators
from lib.report.utils.utils import parse_params
from lib.report.utils.reportutils import get_report_obj


class ReportDomainHandler(ReportingHandler):
    def initialize(self, *args, **kwargs):
        pass

    #@tornado.web.authenticated
    @decorators.formattable
    def get(self, name):
        url = self.request.uri
        kwargs = parse_params(url)

        if 'format' in kwargs:
            kwargs.pop('format')

        kwargs = dict((k, int(v) if v.isdigit() else urllib.unquote(v))
                      for k, v in kwargs.items())
        logging.info("kwargs: %s" % kwargs)

        report_obj = get_report_obj(name)
        data = report_obj.get_report(**kwargs)

        def default(self, data):
            url = "reporting_domain/_report_%s.html" % name
            self.render(url, data=data)

        yield default, (data,)
