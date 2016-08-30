

def column_builder(col_list):
    return ",".join(col_list)

def column_builder2(col_list):
    as_str = "'" + "'".join(",".join(col_list)) +"'"
    return as_str

def value_builder(data_dict, col_list):
    insert_list = col_list
    insert_dict ={}
    insert_list = []
    for col in col_list:
        insert_dict[col] = data_dict[col]
        string_item = "%({})s".format(col)
        insert_list.append(string_item)
    insert_str = "\"" +  "\",\"".join(insert_list) + "\""
    return (insert_str, insert_dict)
