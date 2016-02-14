import logging
import pandas
from lib.trello.trello import Trello

def parse_card(j,board):

    split = j['name'].split("(")
    if (len(split) > 1):
        opp = split[1].replace(")","")
        ab = split[0].split("-")
    else:
        opp = ""

        ab = split[0].split("-")
        
    if (len(ab) > 1):
        agency = ab[0]
        brand = ab[1]
    else:
        agency = ""
        brand = ab[0]
        
    split_opp = opp.split("-")
    if len(split_opp) > 1:
        opportunity = "-".join(split_opp[:-1])
        timing = split_opp[-1]
    else:
        opportunity = ""
        timing = ""

    from datetime import datetime  
    
    return {
        "agency": agency.strip(),
        "brand" : brand.strip(),
        "opportunity" : opportunity.strip(),
        "timing" : timing.strip(),
        "board" : board,
        "trello_id": j.id,
        "last_modified": j.dateLastActivity,
        "created_at": datetime.fromtimestamp(int(j.id[0:8],16))
    }

if __name__ == "__main__":

    ## INIT
    logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s - %(message)s')
    logger = logging.getLogger()

    logging.info("Initializing...")
    from link import lnk
    from lib.pandas_sql import s

    sql_query = s._write_mysql
    BOARDS = ["Sales -- Qualified"]
    tr = Trello(boards=BOARDS)
    logging.info("Initialized.")

    ## PULL
    logging.info("Pulling from trello...")
    advertisers = [
        parse_card(j,board)
        for board in list(tr.get_board_lists("Sales -- Qualified").name) 
        for i,j in tr.get_board_list_cards("Sales -- Qualified",board).iterrows()
    ] 
    df = pandas.DataFrame(advertisers)
    logging.info("Pulled from trello.")

    ## INSERT
    logging.info("Inserting...")
    sql_query(df, "prospect", list(df.columns), lnk.dbs.rockerbox, ["trello_id"])
    logging.info("Inserted.")

