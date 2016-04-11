CREATE = """INSERT INTO log_appnexus_report_processed (external_advertiser_id,report_name,report_start_date,report_end_date) VALUES (%(advertiser_id)s,'%(report_name)s','%(start_date)s','%(end_date)s') """

def log_init(db,params):
    _id = db.execute(CREATE % params)
    params['id'] = _id

def log_report_id(db, params):
    db.execute("UPDATE log_appnexus_report_processed set report_id = '%(report_id)s' where id = %(id)s" % params)

def log_retreived(db, params):
    db.execute("UPDATE log_appnexus_report_processed set last_activity = '%(retreived_at)s', retreived_at = '%(retreived_at)s', report_num_rows = %(report_num_rows)s where id = %(id)s" % params)

def log_processed(db, params):
    db.execute("UPDATE log_appnexus_report_processed set last_activity = '%(processed_at)s', processed_at = '%(processed_at)s' where id = %(id)s" % params)
