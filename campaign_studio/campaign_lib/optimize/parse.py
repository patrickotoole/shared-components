def parse(dd):

    assert "params" in dd

    params = dd['params']

    dparams = { i['key'] : i.get('value',0) for i in params }

    append = (dparams['append'] == "Append")
    dparams['append'] = append

    LINE_ITEM_ID = dparams['line_item_id']
    ADVERTISER = dparams['advertiser']

    dparams['duplicate'] = (dparams['opt_type'] == "Duplicate")
    dparams['deactivate'] = (dparams['opt_type'] == "Deactivate")
    dparams['modify'] = (dparams['opt_type'] == "Modify")
    dparams['create'] = (dparams['opt_type'] == "Create")
    dparams['replace'] = (dparams['opt_type'] == "Replace")

    
    breakout = (dparams['breakout'] == "Breakout")
    dparams['breakout'] = breakout
    dparams['action'] = "include" if dparams['duplicate'] or dparams['replace'] else "exclude"

    return dparams
