SELECT_UNIQUE_KEY_QUERY = """SELECT group_concat(k.COLUMN_NAME) FROM information_schema.table_constraints t LEFT JOIN information_schema.key_column_usage k USING(constraint_name,table_schema,table_name) WHERE t.constraint_type='UNIQUE' AND t.table_schema=DATABASE() AND t.table_name='{table_name}'"""


def get_unique_keys(cur, table_name):
    query = SELECT_UNIQUE_KEY_QUERY.format(table_name=table_name)
    res = cur.select(query)
    keys = res.as_dict()[0].values()
    return keys
