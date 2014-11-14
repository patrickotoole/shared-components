import sys
import json
import time
import datetime

import MySQLdb
import requests

#First, sync over any new accounts/companies:
accounts_riq = []
i = 0
#curl -X GET https://api.relateiq.com/v2/accounts -u 544ea306e4b0317ce9b4e0fa:qnIArzhqMD53NIeqfoLsr1Pg0fe
while (True):
	print i
	r = requests.get('https://api.relateiq.com/v2/accounts?_start=' + str(i), auth=('544ea306e4b0317ce9b4e0fa','qnIArzhqMD53NIeqfoLsr1Pg0fe'))

	if r.status_code != 200:
		sys.exit()
	output = json.loads(r.text)
	if output['objects'] == []:
		break
	else:
		for l in output['objects']:
			a = {"id": l["id"].encode('latin-1'), "name": l["name"].encode('latin-1')}
			accounts_riq.append(a)
#	print accounts_riq
	i += 50
#print accounts_riq

#accounts_riq.append({"id":"abcdefg","name":"lee test"})
#accounts_riq.append({"id":"new_abcdefg","name":"lee test_new"})
#accounts_riq.append({"id":"new_abcdefg_2","name":"lee test_ne'w"})


#mysql -h 107.170.18.93 -u ron_test --password=ron_test -A rockerbox
db = MySQLdb.connect(host="107.170.18.93", 
			user="ron_test", 
			passwd="ron_test", 
			db="rockerbox") 
cur = db.cursor() 
cur.execute("SELECT * FROM relateiq_account")

accounts_rb = {}
for row in cur.fetchall() :
	accounts_rb[row[0]] = row[1]


accounts_to_add = []
for account in accounts_riq:
	if account["id"] not in accounts_rb:
		accounts_to_add.append("('" + account["id"] + "','" + account["name"].replace("'","\\'") + "')")
print ','.join(accounts_to_add)

if len(accounts_to_add) > 0:
	cur.execute("INSERT INTO relateiq_account (id,name) VALUES " + ','.join(accounts_to_add))
	db.commit()


#Now we pull the status of each account and insert it into relateiq_events:

status_riq = []
status_riq_obj = {}
i = 0
#curl -X GET https://api.relateiq.com/v2/lists/536a8ba8e4b071e7be2a1cc4/listitems -u 544ea306e4b0317ce9b4e0fa:qnIArzhqMD53NIeqfoLsr1Pg0fe
#need to dedupe duplicate accounts in the list. Will take the last created one.
while (True):
	print i
	r = requests.get('https://api.relateiq.com/v2/lists/536a8ba8e4b071e7be2a1cc4/listitems?_start=' + str(i), auth=('544ea306e4b0317ce9b4e0fa','qnIArzhqMD53NIeqfoLsr1Pg0fe'))

	if r.status_code != 200:
		sys.exit()
	output = json.loads(r.text)
	if output['objects'] == []:
		break
	else:
		for l in output['objects']:
			try:
				event_id = int(l["fieldValues"]["0"][0]["raw"])
			except (KeyError):
				event_id = 0
			a = {"account_id": l["accountId"].encode('latin-1'), 
			"event_id": event_id,
			"timestamp": datetime.datetime.fromtimestamp(l["modifiedDate"]/1000).strftime('%Y-%m-%d %H:%M:%S'),
			"created_on": l["createdDate"]}
			if a["account_id"] not in status_riq_obj:
				status_riq_obj[a["account_id"]] = a
			elif a["created_on"] > status_riq_obj[a["account_id"]]["created_on"]:
				status_riq_obj[a["account_id"]] = a
#	print status_riq
	i += 50
for obj in status_riq_obj:
	status_riq.append(status_riq_obj[obj])
#print status_riq

#select b.account_id, b.event_id, b.datetime from (select account_id, max(datetime) datetime from relateiq_events group by account_id) a left join relateiq_events b on a.account_id = b.account_id and a.datetime = b.datetime;
cur.execute("select b.account_id, b.event_id, b.datetime from (select account_id, max(datetime) datetime from relateiq_events group by account_id) a left join relateiq_events b on a.account_id = b.account_id and a.datetime = b.datetime")

events_rb = {}
for row in cur.fetchall() :
	events_rb[row[0]] = row[1]

events_to_add = []
for status in status_riq:
	if status["account_id"] not in events_rb:
		events_to_add.append("('" + status["account_id"] + "'," + str(status["event_id"]) + ",'" + str(status["timestamp"]) + "')")
	elif events_rb[status["account_id"]] != status["event_id"]:
		events_to_add.append("('" + status["account_id"] + "'," + str(status["event_id"]) + ",'" + str(status["timestamp"]) + "')")
print ','.join(events_to_add)

if len(events_to_add) > 0:
        cur.execute("INSERT INTO relateiq_events (account_id,event_id,datetime) VALUES " + ','.join(events_to_add))
        db.commit()
db.close()
