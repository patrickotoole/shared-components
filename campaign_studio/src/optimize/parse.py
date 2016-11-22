def parse(dd):
    data = dd['data']
    params = dd['params']

    dparams = { i['key'] : i.get('value',0) for i in params }

    append = (dparams['append'] == "Append")
    dparams['append'] = append

    LINE_ITEM_ID = dparams['line_item_id']
    ADVERTISER = dparams['advertiser']

    duplicate = (dparams['duplicate'] == "Duplicate")
    dparams['modify'] = (dparams['duplicate'] == "Modify")
    dparams['create'] = (dparams['duplicate'] == "Create")

    dparams['duplicate'] = True if dparams['create'] else duplicate
    
    breakout = (dparams['breakout'] == "Breakout")
    dparams['breakout'] = breakout

    return dparams
