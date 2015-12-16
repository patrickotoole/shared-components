import mock
import pandas
import lib.password_hash

def select(query):


    if "advertiser_id as external_advertiser_id" in query and "username = '" in query: # login
        username = query.split(" username = '")[1].split("'")[0]
        pw_hash = lib.password_hash.PasswordHash()
        password = pw_hash.hash_password("admin")
        return pandas.DataFrame([
            {"username": username,"password":password,"show_reporting":0, "external_advertiser_id": 302568}
        ])


    if "select user.id, user.advertiser_id, user.username" in query:  # advertiser

        username = query.split(" username = '")[1].split("'")[0]
        pw_hash = lib.password_hash.PasswordHash()
        password = pw_hash.hash_password("admin")
        return pandas.DataFrame([
            {"username": username,"password":password,"show_reporting":0, "advertiser_id": 302568}
        ])



    if "select * from advertiser where " in query:
        l = [{'media_trader': 'jenny', 'pixel_source_name': 'baublebar', 'advertiser_name': 'Baublebar', 'client_sld': 'baublebar.com', 'deleted': 0, 'client_goals': '10', 'min_report_date': '2015-07-01 00:00:00', 'owner': 'jenny', 'email': 'becca@baublebar.com', 'last_activity': '2015-11-19 22:52:25', 'running': 1, 'client_type': 'direct', 'media_trader_slack_name': 'jenny', 'advertiser_goal': 3.2, 'contact_name': 'Becca', 'monthly_budget': 25000, 'active': 1, 'id': 11, 'reporting_type': 'internal', 'external_advertiser_id': 302568}]
        return pandas.DataFrame(l)

    if "SELECT pixel_source_name" in query: 
        advertiser_id = query.split("external_advertiser_id=")[1].split(" ")[0]
        return pandas.DataFrame([{"name": "baublebar"}])

    if "a.username = '" in query: # permissions 

        username = query.split("a.username = '")[1].split("'")[0]

        l = [
{"external_advertiser_id":302568,"pixel_source_name":"baublebar","advertiser_name":"Baublebar","selected":True},
{"external_advertiser_id":456836,"pixel_source_name":"littlebits","advertiser_name":"LittleBits","selected":False},
{"external_advertiser_id":225133,"pixel_source_name":"bigstock","advertiser_name":"Bigstock","selected":False},
{"external_advertiser_id":250058,"pixel_source_name":"journelle","advertiser_name":"Journelle","selected":False},
{"external_advertiser_id":417162,"pixel_source_name":"jackthreads","advertiser_name":"Jackthreads","selected":False},
{"external_advertiser_id":507474,"pixel_source_name":"digital_ocean","advertiser_name":"Digital Ocean","selected":False},
{"external_advertiser_id":573376,"pixel_source_name":"squarespace","advertiser_name":"Squarespace","selected":False}
        ]
        return pandas.DataFrame(l)

    if "cast(external_segment_id AS CHAR)": # segment
        l = [{'segment': '974310', 'segment_name': 'LearnVest - All Pages'}]
        return pandas.DataFrame(l)




    
    if "advertiser_segment" in query:
        l = [{'external_member_id': 2024, 'external_segment_id': 1580463, 'segment_raw': 'https://secure.adnxs.com/px?id=174187&seg=1580463&t=1&order_id=[user_identifier]', 'deleted': 0, 'notes': None, 'segment_description': None, 'segment_implemented': '<!-- Conversion Pixel - BaubleBar Purchase Pixel - DO NOT MODIFY -->\n<script src="https://secure.adnxs.com/px?id=174187&seg=1580463&t=1&order_id=[user_identifier]"\ntype="text/javascript"></script>\n<script src="https://getrockerbox.com/pixel?source=baublebar&type=conv&id=174187&seg=1580463&order_type=[user_identifier]" type="text/javascript"></script>\n<!-- End of Conversion Pixel -->', 'last_activity': Timestamp('2015-11-12 17:14:51'), 'external_advertiser_id': 302568, 'segment_name': "BaubleBar's Conversion", 'active': None, 'id': 106, 'segment_fields': 'seg,order_id,id,t'}, {'external_member_id': 2024, 'external_segment_id': 1602040, 'segment_raw': 'https://getrockerbox.com/pixel?source=baublebar&type=imp&an_seg=1602040', 'deleted': 0, 'notes': None, 'segment_description': None, 'segment_implemented': '<!-- Rockerbox -- All Pages Pixel -->\n<script src="https://getrockerbox.com/pixel?source=baublebar&type=imp&an_seg=1602040" type="text/javascript"></script>\n<!-- End of Segment Pixel -->\n', 'last_activity': Timestamp('2015-11-12 17:15:24'), 'external_advertiser_id': 302568, 'segment_name': 'BaubleBar All Pages', 'active': None, 'id': 108, 'segment_fields': 'source,type,an_seg'}]
        return pandas.DataFrame(l)



    
DB = mock.MagicMock()

DB.select_dataframe = select
