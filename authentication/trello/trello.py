import logging
import requests
import pandas
import datetime

class Trello(object):

    BOARDS = [
        "Sales -- Qualified"
    ]
    TOKEN = "?key=dace821409b7d5329f7eaea1fcfd6291&token=8438a68450d300dd283a6823849025b9064831f7f26385bb1e7f1312837de742"
    #"1c30fdfe663da661294e8b35e00f79863df4de6af14fc751bf71d20401a50ace"

    def __init__(self,token=TOKEN,boards=BOARDS):
        self.token = token
        self.lists = {}

    def post(self,uri,params={},data="",headers=False):
        headers = headers or {'Content-type': 'application/json', 'Accept': 'text/plain'}
        
        resp = requests.post("https://api.trello.com/1/" + uri + self.token,params=params,data=data,headers=headers)
        return resp.json()

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
