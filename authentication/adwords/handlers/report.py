import ujson
from tornado import web
from adwords import AdWords
import json

class ReportHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        slef.adwords = kwargs.get('adwords',None)

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        adwords_client = self.adwords.get_adwords_client(advertiser_id)
        report_downloader = adwords_client.GetReportDownloader(version='v201609')

        # Create report definition.
        report = {
            'reportName': 'Last 7 days CRITERIA_PERFORMANCE_REPORT',
            'dateRangeType': 'LAST_7_DAYS',
            'reportType': 'CRITERIA_PERFORMANCE_REPORT',
            'downloadFormat': 'CSV',
            'selector': {
                'fields': ['CampaignId', 'AdGroupId', 'Id', 'CriteriaType',
                'Criteria', 'FinalUrls', 'Impressions', 'Clicks', 'Cost']
            }
        }

        try:
            report_output = StringIO.StringIO()

            report_downloader.DownloadReport(
            report, report_output, skip_report_header=False, skip_column_header=False,
            skip_report_summary=False)

            response = {
                'success': True,
                'reports': []
            }
            raw_data = report_output.getvalue().split('\n')
            row_i = 1

            for row in raw_data:
                if(row_i > 2 and row != ''):
                    columns = [x.strip() for x in row.split(',')]
                    response['reports'].append({
                        'campaign_id': columns[0],
                        'ad_group_id': columns[1],
                        'keyword_id': columns[2],
                        'criteria_type': columns[3],
                        'keyword_placement': columns[4],
                        'final_url': columns[5],
                        'impressions': columns[6],
                        'clicks': columns[7],
                        'cost': columns[8]
                    })
                row_i += 1
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while generating the reports.'
            }

        self.write(response)
