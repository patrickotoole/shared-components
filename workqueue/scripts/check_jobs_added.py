import logging

QUERY = "select count(*) from cache_submit where udf='domains_full_time_minute' and updated_at > '%s'"


def slack():
    class Slack():
        def __call__(self,msg):
            return self.send(msg)

        def send(self, msg):
            self.send_message(msg["channel"],msg["message"])
        
        def send_message(self, channel = "#yoshibot", message = "hello"):
            self.slackclient.api_call("chat.postMessage", channel = channel, text = message, as_user=False)
                
        def __init__(self):
            from slackclient import SlackClient
            TOKEN = "xoxp-2171079607-2171842034-68524602183-09d52162c2"
            self.slackclient = SlackClient(TOKEN)
    return Slack()


class JobsAddedChecks():

    def __init__(self, crushercache):
        self.crushercache = crushercache

    def number_added(self):
        import datetime
        now = datetime.datetime.now().strftime("%Y-%m-%d")
        number_df = self.crushercache.select_dataframe(QUERY % now)
        return number_df['count(*)'][0]

        
    def run_check(self):
        number_added = self.number_added()
        if number_added < 50:
            send_msg = {"channel":"egnineering", "message":"Caching jobs not added to WorkQueue today. Resolve issue and re-run chronos job"}
            logging.info(params["parameters"]["parameters"])
            slack().__call__(send_msg)     


if __name__ == "__main__":
    from link import lnk
    cr = lnk.dbs.crushercache
    jac = JobsAddedChecks(cr)
    jac.run_check()
