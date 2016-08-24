import json
import md5

class ScheduleDatabase:

    def make_scheduled(self,advertiser_id,obj):
        I = "INSERT INTO action_dashboard_schedule (advertiser_id,json,days,time) VALUES ('%s','%s','%s','%s') "
        days = obj['days']
        time = obj['time']
        del obj['days']
        del obj['time']

        js = json.dumps(obj).replace('\\"','\\\\"')
        self.db.execute( I % (advertiser_id,js,days,time) )

