def process_post_json(json_obj, con):
    json = ""
    if type(json_obj) ==list:
        data = []
        for item in json_obj:
            item_escaped = con.escape_string(item)
            data.append(item_escaped)
        json = str(data)
    else:
        json = con.escape_string(json_obj)
    return json

