import sendgrid
sg = sendgrid.SendGridClient('ronjacobson', 'rockerbox2013') 
from link import lnk
import pandas as pd
import sys
from datetime import datetime, timedelta
import matplotlib
import matplotlib.pyplot as plt
import ast
import numpy as np

pd.options.mode.chained_assignment = None
pd.options.display.mpl_style = 'default'
matplotlib.rc('font', family='sans-serif') 
matplotlib.rc('font', serif='Helvetica Neue') 
matplotlib.rc('text', usetex='false') 
pd.set_option('display.max_rows', 500)
pd.set_option('display.max_columns', 500)
pd.set_option('display.width', 1000)

TODAY = datetime.today().strftime('%Y-%m-%d')

def get_data(start_date = "2015-03-01", end_date =TODAY):
    
    query = '''
    SELECT opt_log.rule_group_id, opt_log.last_modified, opt_log.campaign_id, opt_log.field_name, 
    opt_log.field_old_value, opt_log.field_new_value, opt_log.value_group_id, opt_rules.rule_group_name,
    rockerbox.advertiser.pixel_source_name, rockerbox.advertiser_campaign.campaign_name
    FROM opt_log 
        LEFT JOIN opt_rules ON opt_log.rule_group_id = opt_rules.rule_group_id
        LEFT JOIN rockerbox.advertiser_campaign ON rockerbox.advertiser_campaign.campaign_id = opt_log.campaign_id
        LEFT JOIN rockerbox.advertiser ON rockerbox.advertiser.external_advertiser_id = rockerbox.advertiser_campaign.external_advertiser_id

    WHERE date(opt_log.last_modified ) >= '%s' and date(opt_log.last_modified) <= "%s"
    '''%(start_date, end_date)

    db = lnk.dbs.reporting
    df = db.select_dataframe(query)
    df['last_modified_date']= df['last_modified'].apply(lambda x: x.strftime('%Y-%m-%d'))

    return df


def reshape_by_rule_date(df):

    df['num_actions'] = 1
    grouped = df.groupby(['last_modified_date','rule_group_name'])
    by_rule_date = grouped.apply(lambda x: pd.Series({  'num_campaigns': len(x['campaign_id'].unique()),
                                                        'num_advertisers': len(x['pixel_source_name'].unique()),
                                                        'num_actions': x['num_actions'].sum()
                                                    }))
    return by_rule_date

def trend_report_by_rule_group(data, by, save_path = None):

    by_rule_date = reshape_by_rule_date(data)
    by_rule_date = by_rule_date.reset_index()

    by_rule = by_rule_date.pivot(index='last_modified_date', columns='rule_group_name', values= by)
    by_rule = by_rule.fillna(0)
    by_rule.index = pd.to_datetime(by_rule.index)

    fig, axes = multi_bar_plot(by_rule, by_rule.columns, [20,3 * len(by_rule.columns)], by_rule.columns)
    # plt.show()

    if save_path:
        print save_path
        fig.savefig(save_path+".png")
        by_rule.to_csv(save_path+".csv")



def trend_report_by_advertiser(data, by, save_path = None):

    grouped_adv = data.groupby(['pixel_source_name','last_modified_date'])
    df = grouped_adv.apply(lambda x: pd.Series({'num_actions': len(x), 
                                            'num_opt_rules': len(x['rule_group_name'].unique())}))
    df = df.reset_index()

    by_adv = df.pivot(index = 'last_modified_date', columns = 'pixel_source_name', values = by).fillna(0)
    by_adv.index = pd.to_datetime(by_adv.index)

    fig, axes = multi_bar_plot(by_adv, by_adv.columns, [20,3 * len(by_adv.columns)], by_adv.columns)
    # plt.show()

    if save_path:
        print save_path
        fig.savefig(save_path+".png")
        by_adv.to_csv(save_path+".csv")



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


def advertiser_snapshot_report(opt_log_dump):
    summary = ""
    for advertiser in opt_log_dump['pixel_source_name'].unique():
        if advertiser is not None:
            summary += advertiser.upper() + ": \n"
            summary += "Num Campaigns: %d" %len(opt_log_dump[opt_log_dump['pixel_source_name'] == advertiser]['campaign_id'].unique())
            summary += "\n"
            summary += "Num Total Actions: %d" %len(opt_log_dump[opt_log_dump['pixel_source_name'] == advertiser].drop_duplicates(['campaign_id','field_old_value', 'field_new_value']) )
            summary += "\n\n"
    return summary 

class EmailReport():

    def __init__(self, send_to, send_from):

        self.send_to = send_to
        self.send_from = send_from
        self.message = sendgrid.Mail()

        self.message.add_to(self.send_to)
        self.message.set_from(self.send_from) 

    
    def trend_report_panel(self, data, save_path = None):

        by_rule_date = reshape_by_rule_date(data)
        by_rule_date = by_rule_date.reset_index()

        by_advertisers = by_rule_date.pivot(index='last_modified_date', columns='rule_group_name', 
                                    values='num_advertisers').fillna(0)

        by_campaigns = by_rule_date.pivot(index='last_modified_date', columns='rule_group_name', 
                                        values='num_campaigns').fillna(0)

        by_actions = by_rule_date.pivot(index='last_modified_date', columns='rule_group_name', values='num_actions').fillna(0)

        ## Plotting
        fig,axes = plt.subplots(len(data['rule_group_name'].unique()), 3 , 
                                figsize = [20,4 * len(data['rule_group_name'].unique())] )

        for k in range(len(by_advertisers.columns)):
            col = by_advertisers.columns[k]
            ax = by_advertisers[col].plot(ax = axes[k][0], kind = 'bar',  title = col + ": # Advertisers")
            ax.set_xlabel("")
            ax = prettify_plot(ax)
        
        for k in range(len(by_campaigns.columns)):
            col = by_campaigns.columns[k]
            ax = by_campaigns[col].plot(ax = axes[k][1], kind = 'bar',  title = col + ": # Campaigns")
            ax.set_xlabel("")
            ax = prettify_plot(ax)
            
        for k in range(len(by_actions.columns)):
            col = by_actions.columns[k]
            ax = by_actions[col].plot(ax = axes[k][2], kind = 'bar',  title = col + ": # Actions Pushed")
            ax.set_xlabel("")
            ax = prettify_plot(ax)
        
        if save_path:
            print save_path
            fig.savefig(save_path+".png")

    def send_daily_report_advertiser(self):
        
        start_date = (datetime.today() - timedelta(days = 7)).strftime('%Y-%m-%d')
        end_date = (datetime.today() - timedelta(days = 1)).strftime('%Y-%m-%d')
                
        # Grabbing Data
        last_opt_log = get_data(end_date, end_date)
        weekly_df = get_data(start_date, end_date)
        

        self.message.set_subject("Daily Opt Log Report: " + end_date) 
        self.message.set_text(snapshot_report(last_opt_log) + "\n\n" + advertiser_snapshot_report(last_opt_log))
        
        save_dir = "/tmp/"
        
        save_title ="Total_Actions_on_Advertiser_%s_to_%s"%(start_date, end_date)
        trend_report_by_advertiser(weekly_df, 'num_actions', save_path = save_dir + save_title)
        self.message.add_attachment(save_title+'.png', save_dir + save_title+'.png')
        self.message.add_attachment(save_title+'.csv', save_dir + save_title+'.csv')

        save_title ="Total_Opts_Rules_on_Advertiser_%s_to_%s"%(start_date, end_date)
        trend_report_by_advertiser(weekly_df, 'num_opt_rules', save_path = save_dir + save_title) 
        self.message.add_attachment(save_title+'.png', save_dir + save_title+'.png')
        self.message.add_attachment(save_title+'.csv', save_dir + save_title+'.csv')
        
        save_title ="7_Day_Report_%s_to_%s"%(start_date, end_date)
        self.trend_report_panel(weekly_df, save_path = save_dir + save_title)    
        self.message.add_attachment(save_title+'.png', save_dir + save_title+'.png')

        status, msg = sg.send(self.message)
        print msg
    

    def opt_rule_report(self):

        start_date = (datetime.today() - timedelta(days = 1)).strftime('%Y-%m-%d')
        end_date = (datetime.today() - timedelta(days = 1)).strftime('%Y-%m-%d')

        opt_log_data = get_data(start_date, end_date)
        opt_log_data = opt_log_data.drop_duplicates('value_group_id')

        self.message.set_subject("Opt Rules Report: %s" %(end_date))
        self.message.set_text(" ")

        for rule in opt_log_data['rule_group_name'].unique():
            print rule
            metrics_table = create_metrics_table(rule, opt_log_data)
            metrics_table.to_csv('/tmp/%s_report.csv'%rule)
            self.message.add_attachment("%s_%s.csv"%(rule, end_date) ,'/tmp/%s_report.csv'%rule)
        
        status, msg = sg.send(self.message)
        print msg




def target_diff(row):

    if row['field_name'] == "platform_placement_targets" or row['field_name'] == "domain_targets":
    
        field_old_value = ast.literal_eval(row['field_old_value'])
        field_new_value = ast.literal_eval(row['field_new_value'])

        if field_old_value is None:
            field_old_value = []
        if field_new_value is None:
            field_new_value = []

        diff = lambda l1,l2: [x for x in l1 if x not in l2]
        d = diff(field_new_value, field_old_value)
        
        if len(d) > 0:
            if row['field_name'] == "platform_placement_targets":
                return str(d[0]['action']) + " : " + str(d[0]['id'])
            elif row['field_name'] == "domain_targets":
                return "exclude: " + str(d[0]['domain'])
        else:
            return None
    else:
        return None


def create_metrics_table(rule_group_name, data):

    db = lnk.dbs.reporting

    data = data[data['rule_group_name'] == rule_group_name]

    if len(data) > 0:

        value_group_ids = data['value_group_id']
        opt_values_query = '''
        SELECT value_group_id, metric_name, metric_value 
        FROM opt_values
        WHERE value_group_id in ''' + str(list(value_group_ids)).replace('[', '(').replace(']',')')
        metric_values = db.select_dataframe(opt_values_query)

        metric_values = metric_values.pivot(index = 'value_group_id', columns = 'metric_name', values = 'metric_value')
        metric_cols = metric_values.columns

        metrics_table = pd.merge(data, metric_values, left_on = 'value_group_id', right_index = True, how = 'outer')
        
        if "domain" in rule_group_name or "placement" in rule_group_name:
            metrics_table['field_diff'] = metrics_table.apply(lambda row: target_diff(row), axis = 1)
            cols = ['last_modified_date', 'pixel_source_name','campaign_id', 'campaign_name', 'rule_group_name','field_diff'] + list(metric_cols)
        else:
            cols = ['last_modified_date','pixel_source_name','campaign_id', 'campaign_name', 'rule_group_name','field_old_value', 'field_new_value'] + list(metric_cols)
        
        return metrics_table[cols]
    
    else:
        return None



def prettify_plot(ax):
    ax.set_axis_bgcolor('white')
    ax.set_frame_on(False)
    ax.grid(False)
    return ax

def set_ylims_pretty(ax, data):
    ax.set_ylim([data.min() - 0.1 * abs(data.min()), 
                data.max() + 0.1 * abs(data.max()) ])
    return ax

## Only for time series data
def multi_line_plot(data, cols, fig_size, titles):

    if len(cols) == 1:
        ax = data[cols[0]].plot(style = "-o", title = titles[0], rot = 360, color = 'steelblue', figsize = fig_size)
        ax = set_ylims_pretty(ax, data[cols[0]])
        ax.set_xlabel("")
        fig = ax.get_figure()
        return fig, ax

    elif len(cols) > 1:
        fig, axes = plt.subplots(len(cols) ,1, figsize = fig_size)

        for k in range(len(cols)):

            ax = data[cols[k]].plot(style = "-o", ax = axes[k], title = titles[k], rot = 360, color = 'steelblue')
            ax = set_ylims_pretty(ax, data[cols[k]])
            ax.set_xlabel("")

        plt.tight_layout()
        return fig, axes

def multi_bar_plot(data, cols, fig_size, titles):

    if len(cols) > 1:

        fig, axes = plt.subplots(len(cols) ,1, figsize = fig_size)

        for k in range(len(cols)):

            ax = data[cols[k]].plot(kind = 'bar', ax = axes[k], title = titles[k], rot = 360, color = 'steelblue')
            ax.set_xticklabels(pd.Series(data.index).apply(lambda x: x.strftime('%b-%d') ))
            ax = set_ylims_pretty(ax, data[cols[k]])
            ax.set_xlabel("")

        plt.tight_layout()
        return fig, axes

    else:
        ax = data[cols[0]].plot(kind = 'bar', title = titles[0], rot = 360, color = 'steelblue')
        ax.set_xticklabels(pd.Series(data.index).apply(lambda x: x.strftime('%b-%d') ))
        ax = set_ylims_pretty(ax, data[cols[0]])
        ax.set_xlabel("")
        fig = ax.get_figure()
        return fig, ax





