from lib.topic_queue import *
from lib.topic_queue import classify as cl
from link import lnk

QUERY = "select * from url_title where title != '' and title != 'No title' order by RAND() limit 50"

result = lnk.dbs.crushercache.select_dataframe(QUERY)

url_titles = []
for item in result.iterrows():
    tempobj = {}
    tempobj['title'] = item[1]['title']
    tempobj['url'] = item[1]['url']
    url_titles.append(tempobj)

classify_data = {}
classOld = cl.LDAClassifier("LDAoct14.p")
for url in url_titles:
    ur = url['url']
    ti = classOld.classify(url['url'],url['title'])
    classify_data[ur] = []
    classify_data[ur].append(ti)
    print ur
    print ti

print "NEW"
del(classOld)

classNew = cl.LDAClassifier("LDAmodelobj1000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti

del(classNew)

classNew = cl.LDAClassifier("LDAmodelobj2000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti

classNew = cl.LDAClassifier("LDAmodelobj3000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti

del(classNew)
classNew = cl.LDAClassifier("LDAmodelobj10281000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti
del(classNew)
classNew = cl.LDAClassifier("LDAmodelobj10282000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti
del(classNew)
classNew = cl.LDAClassifier("LDAmodelobj10283000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti
del(classNew)
classNew = cl.LDAClassifier("LDAmodelobj10284000.p")
for url in url_titles:
    ur = url['url']
    ti = classNew.classify(url['url'],url['title'])
    classify_data[ur].append(ti)
    print ur
    print ti
import csv
del(classNew)
with open("check_class6.csv", 'w') as f:
    wr = csv.writer(f, delimiter=',')
    for key, val in classify_data.iteritems():
        temp=[]
        for i in val:
            temp.append(i)
        temp.append(key)
        wr.writerow(temp)
