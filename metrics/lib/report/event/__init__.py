def _get_table_name(name):
    return ('v4_reporting' if name == 'datapulling' else
            'domain_reporting' if name == 'domain' else
            'conversion_reporting')

def _create_report_events(con, **kwargs):
    df = pd.DataFrame([kwargs])
    logging.info("creating report event")
    cur = con.cursor()
    _sql._write_mysql(df, "reportevent", df.columns.tolist(), cur, key=None)
    con.commit()

def _get_kwargs_for_reportevent(kwargs, job_created_at, status, name):
    """
    @return: dict(start: str(time), end: str(time), status: bool,
                  success: str(time), failure: str(time), name: str(reportname))
    """
    start, end = get_dates(end_date=kwargs['end_date'], lookback=kwargs['lookback'])
    success = failure = None
    if status:
        success = job_created_at
    else:
        failure = job_created_at
    return dict(start=start,
                end=end,
                status=status,
                success=success,
                failure=failure,
                name=name,
                )
