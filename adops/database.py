
QUERY = "select html from adops_cms where path = '%s' and active=1 and deleted=0"

def get_html(db, uri):
    df_html = db.select_dataframe(QUERY % uri)
    html = df_html['html'][0]
    return html
