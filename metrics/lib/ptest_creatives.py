from link import lnk
import sendgrid
import math
import datetime
import time
c = lnk.api.console
db = lnk.dbs.reporting

       

lineitems = c.get_all_pages("/line-item?state=active","line-items")

lineitems_dict = {}
for lineitem in lineitems:
	if lineitem["campaigns"] != None and lineitem["creatives"] != None:
		tempdict = {}
		for i in lineitem["creatives"]:
			if i["state"] == "active":
				if str(i["width"]) + "x" + str(i["height"]) not in tempdict:
					tempdict[str(i["width"]) + "x" + str(i["height"])] = []
				tempdict[str(i["width"]) + "x" + str(i["height"])].append(i["id"])
		for i in tempdict:
			if len(tempdict[i]) > 1:
				if lineitem["id"] not in lineitems_dict:
					lineitems_dict[lineitem["id"]] = {}
				lineitems_dict[lineitem["id"]][i] = tempdict[i]
			
creatives_to_sizes = {}
for i in lineitems_dict:
	for j in lineitems_dict[i]:
		for k in lineitems_dict[i][j]:
			creatives_to_sizes[k] = j

creatives = ""
for i in creatives_to_sizes:
	creatives += str(i) + ","
creatives = creatives[:-1]

keys = ""
for i in lineitems_dict:
	keys += str(i) + ","
keys = keys[:-1]


##determine most recent datestart for each creative within a line item

def getLatestDate(li, cr1, cr2):
	if li not in li_creative_lastbreak:
		print "error1"
		return "error1"
	elif cr1 not in li_creative_lastbreak[li] or cr2 not in li_creative_lastbreak[li]:
		print "error2"
		return "error2"
	else:
		t1 = li_creative_lastbreak[li][cr1]
		t2 = li_creative_lastbreak[li][cr2]
		return max(t1,t2)

date_data = db.select_dataframe("select creative_id, date, line_item_id, clicks, imps from v4_reporting where line_item_id in (" + keys + ") and creative_id in (" + creatives + ") and date > (CURDATE() - INTERVAL 1 MONTH) order by 3,1,2 asc")


#temp_data = db.select_dataframe("select creative_id, date, line_item_id, clicks, imps from v4_reporting where line_item_id = 1488470 and creative_id in (21324300,21324303,21324297,21324298) and date > (CURDATE() - INTERVAL 1 MONTH) order by 3,1,2 asc")

li_creative_lastbreak = {}
for i in date_data.iterrows():
	li = i[1]["line_item_id"]
	cr = i[1]["creative_id"]
	if li not in li_creative_lastbreak:
		li_creative_lastbreak[li] = {}
	if cr not in li_creative_lastbreak[li]:
		li_creative_lastbreak[li][cr] = i[1]["date"]
		lastdate = i[1]["date"]
	thisdate = i[1]["date"]
	if (thisdate-lastdate).days * 24 + (thisdate-lastdate).seconds/3600 > 96:
		li_creative_lastbreak[li][cr] = thisdate
		print (thisdate-lastdate).days * 24 + (thisdate-lastdate).seconds/3600
		print cr
		print thisdate
		print lastdate
	lastdate = thisdate


##Loop through every creative in a size, compare it to others in that size, output a zscore + pvalue for that combination under the line item (size not important after comparing)
def z_to_p(z):
	from math import erf,sqrt
	p=0.5*(1+math.erf(math.fabs(z)/math.sqrt(2)))
	return 2*(1-p)
	
def ztest(x1,n1,x2,n2):
	if n1>0 and n2>0 and (x1+x2 > 0):
		x1 = float(x1)
		x2 = float(x2)
		n1 = float(n1)
		n2 = float(n2)
		p1 = x1/n1
		p2 = x2/n2
		pp = (x1+x2)/(n1+n2)
		z = (p1-p2)/math.sqrt(pp*(1-pp)*(1/n1+1/n2))
		return [z, z_to_p(z)]
	else:
		return "no data"
 
def getClicksAndImps(li, cr, date):
	clicks = 0
	imps = 0
	for i in date_data.iterrows():
		if i[1]["line_item_id"] == li and i[1]["creative_id"] == cr:
			try:
				if i[1]["date"] >= date:
					clicks += i[1]["clicks"]
					imps += i[1]["imps"]
			except TypeError:
				print i
	return [clicks, imps]

decision_dict = {}
for i in lineitems_dict: #lineitem
	for j in lineitems_dict[i]: #size
		for k in range(0,len(lineitems_dict[i][j])):
			for l in range (k+1, len(lineitems_dict[i][j])):
				cr1 = lineitems_dict[i][j][k]
				cr2 = lineitems_dict[i][j][l]
				print str(i) + "-" + str(cr1) + ":" + str(cr2)
				date = getLatestDate(i,cr1,cr2)
				if date != "error1" and date != "error2":
					ci1 = getClicksAndImps(i,cr1,date)
					ci2 = getClicksAndImps(i,cr2,date)
					print ci1
					print ci2
					print date
					if ci1[1] > 5000 and ci2[1] > 5000:
						z = ztest(ci1[0],ci1[1],ci2[0],ci2[1])
						print z
						if i not in decision_dict:
							decision_dict[i] = []
						decision_dict[i].append({"creative1":cr1, "creative2": cr2, "z_score":z[0], "p_value":z[1]})
					else:
						print "Sample size not large enough"
				print "-----"
				
print decision_dict

#Print and output to necessary places

def add_to_db(row, line_item_id):
        db.execute("insert into pvalue_test (line_item_id,creative1,creative2,zscore,pvalue,addressed) values (" + str(line_item_id) + "," + str(row["creative1"]) + "," + str(row["creative2"]) + "," + str(row["p_value"]) + "," + str(row["z_score"]) + ",0)")

def already_done(row, line_item_id):
        now = datetime.datetime.fromtimestamp(time.time())
        for i in done_data.iterrows():
                if i[1]["line_item_id"] == line_item_id and i[1]["creative1"] == row["creative1"] and i[1]["creative2"] == row["creative2"]:
                        if (now-i[1]["timestamp"]).days < 7:
                                return True
        return False

done_data = db.select_dataframe("select * from pvalue_test")



output_str = ""
for i in decision_dict:
	for j in decision_dict[i]:
		if j["p_value"] < .01:
                        if not already_done(j, i):
                                add_to_db(j, i)
                                print "Line Item " + str(i) + " has creatives with a statistical difference of p_value " + str(j["p_value"])
                                output_str += "Line Item " + str(i) + " has creatives with a statistical difference of p_value " + str(j["p_value"])
                                output_str += "<br/>"
                                if j["z_score"] > 0:
                                        print "Winner: http://ib.adnxs.com/cr?id=" + str(j["creative1"])
                                        output_str += "Winner: http://ib.adnxs.com/cr?id=" + str(j["creative1"])
                                        output_str += "<br/>"
                                        print "Loser: http://ib.adnxs.com/cr?id=" + str(j["creative2"])
                                        output_str += "Loser: http://ib.adnxs.com/cr?id=" + str(j["creative2"])
                                else:
                                        print "Winner: http://ib.adnxs.com/cr?id=" + str(j["creative2"])
                                        output_str += "Winner: http://ib.adnxs.com/cr?id=" + str(j["creative2"])
                                        output_str += "<br/>"
                                        print "Loser: http://ib.adnxs.com/cr?id=" + str(j["creative1"])
                                        output_str += "Loser: http://ib.adnxs.com/cr?id=" + str(j["creative1"])
                                print "-----"
                                output_str += "<br/><br/>"

if output_str != "":
        print "emailing..."
	sg = sendgrid.SendGridClient('ronjacobson', 'rockerbox13')
	message = sendgrid.Mail()
	message.add_to(['Lee Yanco <lee@rockerbox.com>','Rick O\'Toole <rick@rockerbox.com>','Alan Kwok <alan@rockerbox.com>','Will West <will@rockerbox.com>'])
	message.set_subject('Creative pTest Report')
	message.set_html(output_str)
	message.set_from('reporting <reporting@rockerbox.com>')
	status, msg = sg.send(message)
        print "sent!"

