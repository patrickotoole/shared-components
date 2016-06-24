from link import lnk
from kazoo.client import KazooClient
import logging
from cache_runner_base import BaseRunner

QUERY = "select action_id, pixel_source_name, action_name from action where ToDelete='yes' order by pixel_source_name"


class RemoveSegments(BaseRunner):

    def __init__(self, connectors):
        self.connectors = connectors

    def get_segments_todelete(self):
        data =self.connectors['db'].select_dataframe(QUERY)
        df_dict = data.to_dict('records')
        return df_dict

    def send_to_slack(self, df_dict):
        import requests
        import ujson
        url= "https://hooks.slack.com/services/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"
        requests.post(url, data=ujson.dumps({"text":"@channel: the forthcoming segments are set to be deleted. Alert channel if you wish any of the below segments to remain"}))
        for item in df_dict:
            _link = "http://beta.crusher.getrockerbox.com/crusher/action/existing?id=%s" % item['action_name']
            _message = "- *%s*: _%s_ %s" % (item['pixel_source_name'], item['action_name'], _link)
            requests.post(url, data=ujson.dumps({"text":_message}))

if __name__ == "__main__":
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    connectors = {'db': lnk.dbs.rockerbox, 'crushercache':lnk.dbs.crushercache}#, 'zk':zk, 'cassandra':''}
    rem = RemoveSegments(connectors)
    df = rem.get_segments_todelete()
    rem.send_to_slack(df)
