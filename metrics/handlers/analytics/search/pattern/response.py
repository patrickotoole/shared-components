from lib.helpers import *

class PatternSearchResponse:

    def response_summary(self,response,stats_df):
        summarized = stats_df.sum()

        response['summary']['users'] = summarized.uniques
        response['summary']['views'] = summarized.views
        response['summary']['visits'] = summarized.visits

        return response
        
    def response_timeseries(self,response,stats_df):
        results = Convert.df_to_values(stats_df.reset_index())
        response['results'] = results

        return response

    def response_domains(self,response,domains_df):
        results = Convert.df_to_values(domains_df)
        response['domains'] = results

        return response

    def response_urls(self,response,urls_df):
        results = Convert.df_to_values(urls_df.head(1000))
        response['urls'] = results

        return response


