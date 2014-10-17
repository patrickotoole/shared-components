import logging

SELECT_UNIQUE_KEY_QUERY = """SELECT group_concat(k.COLUMN_NAME) FROM information_schema.table_constraints t LEFT JOIN information_schema.key_column_usage k USING(constraint_name,table_schema,table_name) WHERE t.constraint_type='UNIQUE' AND t.table_schema=DATABASE() AND t.table_name='{table_name}'"""

def get_unique_keys(con, table_name):
    """
    :con: Link(db_wrapper)
    :table_name: str
    :return: list(str)|None
    """
    query = SELECT_UNIQUE_KEY_QUERY.format(table_name=table_name)
    try:
        res = con.select_dataframe(query)
        return list(res.values[0])
    except Exception as e:
        logging.warn("no unique key found for table: %s; error: %s" % (table_name, str(e)))
        return None

def get_report_names(cur):
    query = 'select name from index_report;'
    return [d.get('name') for d in cur.select(query).as_dict()]
