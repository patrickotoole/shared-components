import tornado.web
import ujson
import pandas
import StringIO

API_QUERY = "select * from appnexus_reporting.%s where %s "


class MoneyHandler(tornado.web.RequestHandler):
    def initialize(self, db, api):
        self.db = db 
        self.api = api


    def get(self):
        response = ""
        table = self.get_argument("table",False)
        if table:
            response_format = self.get_argument("format","json")
            args = self.request.arguments
            args_list = ["1=1"]  
            args_list += [i + "=" + "".join(j) 
                for i,j in args.iteritems() 
                if i not in ["table","format"]
            ]

            where = " and ".join(args_list)

            table_query = API_QUERY % (table, where)
            data = self.db.select_dataframe(table_query)
            

            if response_format == "json":
                l = data.fillna(0).T.to_dict().values()
                response = ujson.dumps(l)
            elif response_format == "html":
                response = data.to_html()
            elif response_format == "csv":
                io = StringIO.StringIO()
                data.to_csv(io)
                response = io.getvalue()
                io.close()

            self.write(response)
        else:
            #j = self.api.get('/member').json

            self.render("../money.html")
            #self.write(ujson.dumps(j))


    def post(self):
        table = self.db.select_dataframe("select distinct a.advertiser_name as 'Advertiser', date(io.start_date) as 'Start', concat(date(date_add(io.start_date,interval datediff(io2.end_date_proposed,io2.start_date_proposed) day)),' (',datediff(date_add(io.start_date,interval datediff(io2.end_date_proposed,io2.start_date_proposed) day),io.start_date),')') as 'Contractual End', concat(date(date_add(now(), interval (io2.budget-(io2.budget-(io.budget-charged_client)))/((io2.budget-(io.budget-charged_client))/datediff(now(), start_date)) day)),' (', datediff(date_add(now(), interval (io2.budget-(io2.budget-(io.budget-charged_client)))/((io2.budget-(io.budget-charged_client))/datediff(now(), start_date)) day), start_date),')') as '~ End', round((io2.budget-(io2.budget-(io.budget-charged_client)))/((io2.budget-(io.budget-charged_client))/datediff(now(), start_date)), 0) as 'Days Remaining', concat('$', io2.budget) as 'Budget', concat('$', round(io2.budget-(io.budget-charged_client), 2)) as 'Budget Spent', concat('$', round(io.budget-charged_client, 2)) as 'Budget Remaining', concat('$', round((io2.budget-(io.budget-charged_client))/datediff(now(), start_date), 2)) as 'Spend Per Day' from (select external_advertiser_id, actual_end_date, sum(budget) as budget, max(actual_start_date) as start_date, case when actual_start_date=max(actual_start_date) then budget else 0 end as io_budget from insertion_order where actual_start_date is not null group by 1) io join ( select external_advertiser_id, sum(media_cost*case when cpm_multiplier is null then 1.6 else cpm_multiplier end) as charged_client, sum(media_cost) as cost from v3_reporting where active=1 and deleted=0 group by 1 ) r on io.external_advertiser_id=r.external_advertiser_id join advertiser a on io.external_advertiser_id=a.external_advertiser_id join insertion_order io2 on io.start_date = io2.actual_start_date where io2.actual_end_date is null;")
        table = table.to_html()
        self.write('<h3 class="page-header" >Rockerbox Current IOs</h3>')
        self.write(table)
        table = self.db.select_dataframe("select a.advertiser_name as 'Client', concat('$',round(sum(case when month(r.date)=1 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'January', concat('$',round(sum(case when month(r.date)=2 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'February', concat('$',round(sum(case when month(r.date)=3 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'March', concat('$',round(sum(case when month(r.date)=4 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'April', concat('$',round(sum(case when month(r.date)=5 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'May', concat('$',round(sum(case when month(r.date)=6 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'June', concat('$',round(sum(case when month(r.date)=7 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'July', concat('$',round(sum(case when month(r.date)=8 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'August', concat('$',round(sum(case when month(r.date)=9 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'September', concat('$',round(sum(case when month(r.date)=10 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'October', concat('$',round(sum(case when month(r.date)=11 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'November', concat('$',round(sum(case when month(r.date)=12 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'December', concat('$',round(sum(media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end),2)) as 'Total' from v3_reporting r join advertiser a on r.external_advertiser_id=a.external_advertiser_id where r.deleted=0 and r.active=1 and r.date>='2014-01-01 00:00:00' group by 1 union select 'Total', concat('$',round(sum(case when month(r.date)=1 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'January', concat('$',round(sum(case when month(r.date)=2 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'February', concat('$',round(sum(case when month(r.date)=3 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'March', concat('$',round(sum(case when month(r.date)=4 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'April', concat('$',round(sum(case when month(r.date)=5 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'May', concat('$',round(sum(case when month(r.date)=6 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'June', concat('$',round(sum(case when month(r.date)=7 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'July', concat('$',round(sum(case when month(r.date)=8 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'August', concat('$',round(sum(case when month(r.date)=9 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'September', concat('$',round(sum(case when month(r.date)=10 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'October', concat('$',round(sum(case when month(r.date)=11 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'November', concat('$',round(sum(case when month(r.date)=12 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end),2)) as 'December', concat('$',round(sum(media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end),2)) as 'Total' from v3_reporting r join advertiser a on r.external_advertiser_id=a.external_advertiser_id where r.deleted=0 and r.active=1 and r.date>='2014-01-01 00:00:00';").to_html()
        self.write('<h3 class="page-header" >Rockerbox Revenue</h3>')
        self.write(table)
        self.write('<br><h3 class="page-header" >Rockerbox Profit</h3>')
        table = self.db.select_dataframe("select a.advertiser_name as 'Client', concat('$',round(sum(case when month(r.date)=1 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=1 then media_cost else 0 end),2)) as 'January', concat('$',round(sum(case when month(r.date)=2 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=2 then media_cost else 0 end),2)) as 'February', concat('$',round(sum(case when month(r.date)=3 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=3 then media_cost else 0 end),2)) as 'March', concat('$',round(sum(case when month(r.date)=4 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=4 then media_cost else 0 end),2)) as 'April', concat('$',round(sum(case when month(r.date)=5 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=5 then media_cost else 0 end),2)) as 'May', concat('$',round(sum(case when month(r.date)=6 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=6 then media_cost else 0 end),2)) as 'June', concat('$',round(sum(case when month(r.date)=7 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=7 then media_cost else 0 end),2)) as 'July', concat('$',round(sum(case when month(r.date)=8 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=8 then media_cost else 0 end),2)) as 'August', concat('$',round(sum(case when month(r.date)=9 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=9 then media_cost else 0 end),2)) as 'September', concat('$',round(sum(case when month(r.date)=10 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=10 then media_cost else 0 end),2)) as 'October', concat('$',round(sum(case when month(r.date)=11 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=11 then media_cost else 0 end),2)) as 'November', concat('$',round(sum(case when month(r.date)=12 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=12 then media_cost else 0 end),2)) as 'December', concat('$',round(sum(media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end)-sum(media_cost),2)) as 'Total' from v3_reporting r join advertiser a on r.external_advertiser_id=a.external_advertiser_id where r.deleted=0 and r.active=1 and r.date>='2014-01-01 00:00:00' group by 1 union select 'Total', concat('$',round(sum(case when month(r.date)=1 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=1 then media_cost else 0 end),2)) as 'January', concat('$',round(sum(case when month(r.date)=2 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=2 then media_cost else 0 end),2)) as 'February', concat('$',round(sum(case when month(r.date)=3 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=3 then media_cost else 0 end),2)) as 'March', concat('$',round(sum(case when month(r.date)=4 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=4 then media_cost else 0 end),2)) as 'April', concat('$',round(sum(case when month(r.date)=5 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=5 then media_cost else 0 end),2)) as 'May', concat('$',round(sum(case when month(r.date)=6 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=6 then media_cost else 0 end),2)) as 'June', concat('$',round(sum(case when month(r.date)=7 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=7 then media_cost else 0 end),2)) as 'July', concat('$',round(sum(case when month(r.date)=8 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=8 then media_cost else 0 end),2)) as 'August', concat('$',round(sum(case when month(r.date)=9 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=9 then media_cost else 0 end),2)) as 'September', concat('$',round(sum(case when month(r.date)=10 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=10 then media_cost else 0 end),2)) as 'October', concat('$',round(sum(case when month(r.date)=11 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=11 then media_cost else 0 end),2)) as 'November', concat('$',round(sum(case when month(r.date)=12 then media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end else 0 end)-sum(case when month(r.date)=12 then media_cost else 0 end),2)) as 'December', concat('$',round(sum(media_cost*case when cpm_multiplier is null then 1 else cpm_multiplier end)-sum(media_cost),2)) as 'Total' from v3_reporting r join advertiser a on r.external_advertiser_id=a.external_advertiser_id where r.deleted=0 and r.active=1 and r.date>='2014-01-01 00:00:00';").to_html()
        self.write(table)
        
