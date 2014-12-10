from advertiser import AdvertiserReportingRoutes
from segment import SegmentRoutes
from domain import DomainRoutes
from imps import ImpsRoutes
from viewable import ViewableRoutes

class ReportingRoutes(
    AdvertiserReportingRoutes,
    SegmentRoutes,
    DomainRoutes,
    ImpsRoutes,
    ViewableRoutes
):
    pass
