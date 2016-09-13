
QUERY = "select html from adops_crm where path = '%s'"

def get_html(db, uri):
    df_html = db.select_dataframe(QUERY % uri)
    html = df_html['html'][0]
    return html
