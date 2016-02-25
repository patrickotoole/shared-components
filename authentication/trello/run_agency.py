import ujson
import datetime
from trello import *

SELECT = "SELECT agency, brand, trello_id, opportunity, timing FROM prospect"
CHECK = "SELECT * FROM prospect_agency where agency = '%s'"
INSERT = "INSERT INTO prospect_agency (trello_id,board,agency,created_at) VALUES ('%(trello_id)s','%(board)s','%(agency)s','%(created_at)s')"
UPDATE = "UPDATE prospect set agency_trello_id = '%s' where trello_id in ('%s')"

def build_card(_id,name,related_cards):
    return {
        "due":None,
        "idList": str(_id),
        "idBoard": "56cf1874e735e6e2e9aa508b",
        "name":name,
        "urlSource": None,
        "desc": related_cards
    }

def find_related(agency,agency_brand):

    vv = agency
    vx = agency_brand.set_index(["agency"]).ix[[vv]]

    return vx

def build_links(vx):
    
    def process(row):
        _ = (row.opportunity,row.timing,"http://trello.com/c/"+row.trello_id)
        return "[Link: %s %s](%s)" % _

    s = vx.T.apply(process)
    return "\n".join(list(s))
    

def build_agency(row, boards, agency_brand, tr, db):
    
    if (row['agency']):
        name = "%s" % (row.agency)
        
        board = "Agency"
        _id = boards.ix[board].id
        agency = row.agency.replace("'","")
    
        vx = find_related(row.agency.strip(),agency_brand)
        related = build_links(vx)
    
    
        card = build_card(_id,name,related)
        json = ujson.dumps(card)
        checked = db.select_dataframe(CHECK % agency)
    
        if len(checked) == 0:
            tr_card = tr.post("cards",data=json)
            trello_id = tr_card['id']
        else:
            trello_id = checked['trello_id'].iloc[0]
        
        print trello_id

        obj = {
            "board": board,
            "trello_id": trello_id,
            "agency": agency,
            "created_at": datetime.datetime.fromtimestamp(int(trello_id[0:8],16))
        }
        
        print obj
        if len(checked) == 0:
            db.execute(INSERT % obj)
            
        print UPDATE % (obj['trello_id'],"'" +"','".join(list(vx.trello_id)) + "'" )
        db.execute(UPDATE % (obj['trello_id'],"','".join(list(vx.trello_id)) ))
    
if __name__ == "__main__":

    from link import lnk
    db = lnk.dbs.rockerbox

    tr = Trello()
    boards = tr.get_board_lists("Accounts").set_index("name")
    agency_brand = db.select_dataframe(SELECT)
    
    
    for i, row in agency_brand.iterrows():
        build_agency(row,boards,agency_brand,tr,db)
            
    
