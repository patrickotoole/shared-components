



QUERY = "select url, topic from url_title where topic like '%{}%'"

def get_topic_from_db(db,topic):
    df = db.select_dataframe(QUERY.format(topic))
    return df
