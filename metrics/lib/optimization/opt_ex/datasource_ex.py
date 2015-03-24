import sys
sys.path.append("../")
from opt_script import DataSource

QUERY = """
SELECT 
    advertiser,
    campaign,
    tag, 
    sum(num_served) as num_served,
    sum(num_visible) as num_visible
FROM advertiser_visibility_daily
WHERE 
    date >= "%(start_date)s" and 
    date <= "%(end_date)s"
GROUP BY advertiser, campaign, tag
"""

class DataSourceExample(DataSource):

    def __init__(self, approved_advertisers):
        self.approved_advertisers = approved_advertisers

    def pull(self):
        query_args = {
            "start_date": "15-03-01",
            "end_date": "15-03-02"
        }

        query = QUERY % query_args
        self.logger.info("Executing query: {}".format(query))
        self.df = self.hive.select_dataframe(query)

        self.logger.info("Pulled DataFrame with {} rows and {} columns"
                          .format(len(self.df), len(self.df.columns.tolist())))

    def transform(self):
        # Add new column
        self.df["percent_visible"] = self.df.num_visible / self.df.num_served

        # Remove all columns with NaN or None values
        self.df = self.df.dropna()

    def filter(self):
        # Filter out all advertisers who are not approved
        self.df = self.df[self.df.advertiser.isin(self.approved_advertisers)]

        # Filter out all tags that have less than 100 served imps
        self.df = self.df[self.df.num_served > 100]

        # Only keep columns we need
        self.df = self.df[["campaign", "tag", "num_served","percent_visible"]]
