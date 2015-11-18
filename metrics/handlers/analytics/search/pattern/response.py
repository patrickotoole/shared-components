from lib.helpers import *

class PatternSearchResponse:

    def response_summary(self,response,stats_df):
        summarized = stats_df.sum()

        response['summary']['users'] = summarized.uniques
        response['summary']['views'] = summarized.views
        response['summary']['visits'] = summarized.visits
        
    def response_timeseries(self,response,stats_df):
        results = Convert.df_to_values(stats_df.reset_index())
        response['results'] = results


