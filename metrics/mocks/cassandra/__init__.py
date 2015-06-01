import mock

CASSANDRA = mock.MagicMock()

def execute(query):
    import sys
    import ujson 

    path = sys.path[0]

    if "rockerbox.visit_urls" in query:
        urls = open(path + "/mocks/cassandra/urls.json","r").read()
        json = ujson.loads(urls)
        value = json

    elif "rockerbox.visitor_domains" in query:
        domains = open(path + "/mocks/cassandra/domains.json","r").read()
        json = ujson.loads(domains)
        value = json
        
    elif "rockerbox.visit_uids_2" in query:
        uids = open(path + "/mocks/cassandra/uids1.json","r").read()
        json = ujson.loads(uids)
        value = json

    return value

def select_dataframe(query):
    import pandas

    return pandas.DataFrame(execute(query))


CASSANDRA.select_dataframe.side_effect = select_dataframe
CASSANDRA.execute.side_effect = execute

if __name__ == "__main__":
    import ipdb; ipdb.set_trace()
