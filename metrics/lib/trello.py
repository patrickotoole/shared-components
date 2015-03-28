import requests
import pandas
import datetime
import ujson
import logging

SELECT_UNIQUE_KEY_QUERY = """SELECT k.COLUMN_NAME FROM information_schema.table_constraints t LEFT JOIN information_schema.key_column_usage k USING(constraint_name,table_schema,table_name) WHERE t.constraint_type='UNIQUE' AND t.table_schema=DATABASE() AND t.table_name='{table_name}'"""

from lib.pandas_sql import s as _sql

def init_logging():
    import sys
    requests_log = logging.getLogger("requests")
    requests_log.setLevel(logging.WARNING)

    LOG_FORMAT = "[%(levelname)1.1s %(asctime)s %(module)s:%(lineno)d] %(message)s"
    _format = logging.Formatter(LOG_FORMAT)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    h1 = logging.StreamHandler(sys.__stderr__)
    h1.setFormatter(_format)
    logger.addHandler(h1)

def get_unique_keys(con, table_name):
    """
    :con: Link(db_wrapper)
    :table_name: str
    :return: list(str)|None
    """
    query = SELECT_UNIQUE_KEY_QUERY.format(table_name=table_name)
    return set(list(con.select_dataframe(query)['column_name']))

def write_mysql(frame, table=None, con=None):
    key = get_unique_keys(con, table)
    return _sql._write_mysql(frame, table, list(frame.columns), con, key=key)



class Trello(object):

    BOARDS = [
        "1) Pre Launch Operations",
        "2) Launched -- Operations",
        "3) Media Trading -- Optimization"
    ]
    TOKEN = "?key=dace821409b7d5329f7eaea1fcfd6291&token=1c30fdfe663da661294e8b35e00f79863df4de6af14fc751bf71d20401a50ace"

    def __init__(self,token=TOKEN,boards=BOARDS):
        self.token = token
        self.lists = {}

        self.board_data_list = [(board,self.get_board_checklists(board)) for board in boards]

        self.board_data_df = self.board_data_list[0][1].copy()
        for i,j in self.board_data_list[1:]:
            self.board_data_df = self.board_data_df.append(j)

        del self.board_data_df['nameData']
        self.board_data_df['date'] = datetime.date.today()



    def get(self,uri,params=""):
        resp = requests.get("https://api.trello.com/1/" + uri + self.token + params)
        return resp.json()

    def get_boards(self):
        if not hasattr(self,"boards"):
            self.boards = self.get("members/me/boards")
        return self.boards

    def get_board(self,name):
        logging.info("Getting board %s" % name)
        df = pandas.DataFrame(self.get_boards())
        return df[df.name == name]

    def get_board_lists(self,board_name):
        logging.info("Getting lists on board %s" % board_name)
        board_id = self.get_board(board_name).id.values[0]

        lists = self.lists.get(board_id,False)
        if lists is False:
            self.lists[board_id] = self.get("boards/" + board_id + "/lists")
            lists = self.lists[board_id]

        df = pandas.DataFrame(lists)
        return df

    def get_board_list_cards(self,board_name,list_name):
        logging.info("Getting cards from %s | %s" % (board_name,list_name))
        df = self.get_board_lists(board_name)
        list_id = df[df.name == list_name].id.values[0]
        cards = self.get("list/" + list_id + "/cards")#, "&card_fields=idChecklists")
        df = pandas.DataFrame(cards)
        return df

    def get_board_list_checklists(self,board_name,list_name):
        logging.info("Getting tasks from %s | %s" % (board_name,list_name))

        df = self.get_board_list_cards(board_name,list_name)

        if len(df) > 0:

            series = df.set_index("name")["idChecklists"].map(lambda x: [self.get_checklist(i) for i in x])
            items = series.map(lambda y: [dict(i.items() + {"checklist":x['name']}.items()) for x in y for i in x['checkItems']])

            return pandas.DataFrame([
                dict({"board":board_name,"list":list_name,"client":i}.items() + k.items())
                for i,j in items.iteritems() for k in j if "Template" not in i
            ])
        else:
            logging.info("No cards on %s | %s" % (board_name,list_name))
            return pandas.DataFrame()

    def get_board_checklists(self,board_name):
        lists = self.get_board_lists(board_name)
        list_names = lists['name'].values

        df = self.get_board_list_checklists(board_name,list_names[0])

        for l in list_names[1:]:
            df = df.append(self.get_board_list_checklists(board_name,l))

        return df

    def get_checklist(self, checklist_id):
        return self.get("checklist/" + checklist_id)

class TrelloTimeseries(object):

    def __init__(self,db):
        self.df = db.select_dataframe("select * from trello_status")

    @property
    def client_status_by_board_and_list(self):
        df = self.df
        list_grouped = df.groupby(["date","board","list","client","state"])["state"].count().unstack("state").fillna(0)
        list_grouped['state'] = list_grouped["incomplete"].map(lambda x: "opened client" if x > 0 else "closed client")

        client_list_state = list_grouped.reset_index().groupby(["date","board","list","state"])['client'].count().unstack("state").fillna(0)
        client_list_state['total'] = client_list_state['closed client'] + client_list_state['opened client']
        return client_list_state

    @property
    def task_status_by_board_and_list(self):
        df = self.df
        tasks_summary = df.groupby(["date","board","list","state"])["state"].count().unstack("state").fillna(0)
        tasks_summary['total'] = tasks_summary['complete'] + tasks_summary['incomplete']
        tasks_summary['%incomplete'] = tasks_summary['incomplete'] / tasks_summary['total']
        return tasks_summary

    @property
    def task_status_by_board_list_and_client(self):
        df = self.df
        per_client_tasks = df.groupby(["date","board","list","client","state"])["state"].count().unstack("state").fillna(0)
        per_client_tasks['total'] = per_client_tasks['complete'] + per_client_tasks['incomplete']
        per_client_tasks['%incomplete'] = per_client_tasks['incomplete'] / per_client_tasks['total']
        return per_client_tasks



if __name__ == "__main__":

    init_logging()

    from link import lnk
    tr = Trello()
    write_mysql(tr.board_data_df,"trello_status",lnk.dbs.reporting)

    grouped = TrelloTimeseries(lnk.dbs.reporting).client_status_by_board_and_list.reset_index().groupby("date")
    ll = list(grouped)
    print ujson.dumps([j for i in ll for j in i[1][i[1]["board"] == "1) Pre Launch Operations"].T.to_dict().values()])

