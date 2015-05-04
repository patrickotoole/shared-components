## Rule Group level reporting

class Report():


    def __init__(self):
        pass
        

def snapshot_report(opt_log_dump):
    report = "Total actions pushed: %d\n" %len(opt_log_dump)
    report += "Unique campaigns : %d\n" %len(opt_log_dump['campaign_id'].unique())
    report += "Unique advertisers: %d\n" %len(opt_log_dump['pixel_source_name'].unique())
    report += "\n"
    
    report +=  "Rule Group Actions:\n"
    for rule_group in opt_log_dump['rule_group_name'].unique():
        report +=  "\t"+ rule_group+":"+ str(sum(opt_log_dump['rule_group_name']== rule_group)) + "\n"

    report += "\n"
    report += "Campaign Fields Adjusted:\n"
    for field_name in opt_log_dump['field_name'].unique():
        report += "\t" + field_name + ":" +str(sum(opt_log_dump['field_name']== field_name)) + "\n"
    return report

    
def trend_report(df, by, save_path = None):
    matplotlib.rcParams.update({'font.size': 10})

    if by == "campaign":
        by_rule = df.groupby(['last_modified_date','rule_group_name']).apply(lambda x: pd.Series({'num_campaigns': len(x['campaign_id'].unique())})).reset_index()
        by_rule = by_rule.pivot(index='last_modified_date', columns='rule_group_name', 
                                    values='num_campaigns').fillna(0)
        title = "Campaigns"
    
    elif by == 'advertiser':
        by_rule = df.groupby(['last_modified_date','rule_group_name']).apply(lambda x: pd.Series({'num_advertisers': len(x['pixel_source_name'].unique())})).reset_index()
        by_rule = by_rule.pivot(index='last_modified_date', columns='rule_group_name', 
                                    values='num_advertisers').fillna(0)
        title = "Advertisers"
        
    elif by == 'actions':
        df['num_actions'] = 1
        by_rule = df.groupby(['last_modified_date','rule_group_name']).sum()[['num_actions']].reset_index()
        by_rule = by_rule.pivot(index='last_modified_date', columns='rule_group_name', values='num_actions').fillna(0)
        title = "Number Actions Pushed"

    # Plotting
    if len(by_rule.columns) > 1:
        fig,axes = plt.subplots(len(by_rule.columns),1 , figsize = [10,3 * len(by_rule.columns)] )
        for k in range(len(by_rule.columns)):
            col = by_rule.columns[k]
            ax = by_rule[col].plot(ax = axes[k], kind = 'bar',  title = col)
            ax.set_xlabel("")
            ax = qbr.prettify_plot(ax)
        #plt.subplots_adjust(top=0.85)
        plt.suptitle(title, y = 1.01, fontsize = 14)
        # plt.tight_layout()
        plt.show()
        
        if save_path:
            print save_path
            fig.savefig(save_path+".png")
            
    else:
        ax = by_rule[by_rule.columns[0]].plot(kind = 'bar',  title = by_rule.columns[0], figsize = [10,4])
        ax = qbr.prettify_plot(ax)
        plt.suptitle(title, y = 1.01, fontsize = 14)        
        plt.show()
        if save_path:
            print save_path
            fig = ax.get_figure()
            fig.savefig(save_path+".png")
            
    by_rule.to_csv(save_path+".csv")
    

def trend_report_advertiser(df, advertiser, by):
    print "\t\t\tAdvertiser: ", advertiser
    df_adv = df[df['pixel_source_name'] == advertiser]
    trend_report(df_adv, by)
    
def create_weekly_opt_log_daily():
    
    start_date = (datetime.today() - timedelta(days = 30)).strftime('%Y-%m-%d')
    end_date = (datetime.today() - timedelta(days = 1)).strftime('%Y-%m-%d')
    
    print start_date, end_date
    
    # Grabbing Data
    last_opt_log = get_all_actions(end_date, end_date)
    weekly_df = get_all_actions(start_date, end_date)
    
    message = sendgrid.Mail()
    #message.add_to('Spurs <spurs@rockerbox.com>')
    message.add_to('stephen@rockerbox.com') 
    message.set_from('stephen@rockerbox.com') 
    message.set_subject("Daily Opt Log Report: " + end_date) 
    message.set_text(snapshot_report(last_opt_log))
    
    save_dir = "/root/datascience-steve/analytics/Opt_Log_Reporting/data/"
    
    save_title ="Actions_%s_to_%s"%(start_date, end_date)
    trend_report(weekly_df, by = 'actions', save_path = save_dir + save_title)
        
    message.add_attachment(save_title+'.png', save_dir + save_title+'.png')
    message.add_attachment(save_title+'.csv', save_dir + save_title+'.csv')

    save_title ="Campaigns_%s_to_%s"%(start_date, end_date)
    trend_report(weekly_df, by = 'campaign', save_path = save_dir + save_title)
        
    message.add_attachment(save_title+'.png', save_dir + save_title+'.png')
    message.add_attachment(save_title+'.csv', save_dir + save_title+'.csv')

    save_title ="Advertisers_%s_to_%s"%(start_date, end_date)
    trend_report(weekly_df, by = 'advertiser', save_path = save_dir + save_title)
        
    message.add_attachment(save_title+'.png', save_dir + save_title+'.png')
    message.add_attachment(save_title+'.csv', save_dir + save_title+'.csv')
    
    status, msg = sg.send(message)
    print msg