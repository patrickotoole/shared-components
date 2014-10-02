#! /usr/bin/python
#

from pandas import *
import pandas as pd
import sys
from link import lnk
import math

my_db = lnk.dbs.vluu_local

def get_date_from_yearweek(yearweek):
  sunday = '%d Sunday' % yearweek
  format = r'%X%V %W'
  date_info = my_db.select_dataframe("select STR_TO_DATE('%s', '%s')" % (sunday, format))
  return str(date_info.ix[0][0])

def get_pixel_name(pixel_id):
  pixel_info = my_db.select_dataframe('select pixel_display_name from advertiser_pixel where pixel_id = (%d)' % pixel_id)
  return pixel_info.ix[0][0]

def get_table(advertiser_id, target_cpa):
  try:
    num_advertiser=int(advertiser_id)
  except:
    print "pass one argument - advertiser ID"
    sys.exit(0)

  # fetch cost dataframe (imps, clicks, cost)
  # commented out yearweek()
  df_charges = my_db.select_dataframe('select yearweek(date_add(date,interval -4 hour)) as wk_no,sum(imps) as Impressions,sum(clicks) as Clicks,sum(media_cost) as Media_Cost,sum(media_cost*cpm_multiplier) as Charged_Client,cpm_multiplier from reporting.v4_reporting where external_advertiser_id =(%d) and active=1 and deleted=0 group by 1 order by 1 asc;' % num_advertiser)
  df_charges = df_charges.set_index('wk_no')

  # fill in 'charged_client' historical values if cpm_multiplier was null
  # for the most recent week, cpm_multiplier gets overwritten by average in "this_multiplier"
  for week_idx in range(len(df_charges)):
    old_multiplier = df_charges['cpm_multiplier'][df_charges.index[week_idx]]
    if old_multiplier == None or math.isnan(old_multiplier):
      df_charges['cpm_multiplier'][df_charges.index[week_idx]] = 1
      df_charges['charged_client'][df_charges.index[week_idx]] = df_charges['media_cost'][df_charges.index[week_idx]]

  # fetch conversion dataframe (pixel_ids with num_conversions)
  df_conversions = my_db.select_dataframe('select yearweek(date_add(conversion_time,interval -4 hour)) as wk_no,pixel_id,sum(case when is_valid=1 then 1 else 0 end) as num_conversions from reporting.v2_conversion_reporting where external_advertiser_id =(%d) and active=1 and deleted=0 group by 1,2 order by 1 asc;' % num_advertiser )

  # make a list of dataframes/weights containing corresponding to each distinct pixel_id (Signup and Purchase)
  dfs_convs = []
  weights_convs = []
  for pixel_id in set(df_conversions['pixel_id']):
    to_add = df_conversions[df_conversions['pixel_id'] == pixel_id].set_index('wk_no')
    new_name = get_pixel_name(pixel_id) + " conversions"
    to_add = to_add.rename(columns={'num_conversions': new_name })
    to_add = to_add.drop('pixel_id', axis=1)
    dfs_convs.append(to_add)

    # assign weights, hard-coded here
    # TODO: access the weight as "get_pixel_weight(pixel_id)" - which queries database
    if "Signup" in new_name:
      weights_convs.append(0.05)
    else:
      weights_convs.append(1)

  # NEW - merge with the charges info
  dfs_convs.insert(0, df_charges)
  df_full = pd.concat(dfs_convs, axis=1).fillna(0)
  # make sure that we're properly weighting by exactly 1
  if len(weights_convs) == 1:
    weights_convs[0] = 1

  # get a proxy for number of conversions (exact num if only one type of conversion)
  df_full['num_conversions'] = df_full.ix[:,5:].dot(weights_convs)

  # TEST - set num_conversions to 0
  # df_full['num_conversions'][df_full.index[-1]] = 0
  # TEST - set old cpm to something arbitrary
  # df_full['cpm_multiplier'][df_full.index[-1]] = 1.5

  # add CPA column - how much it costed rockerbox for each type of (proxied) conversion
  df_full['cpa'] = df_full['media_cost'] / df_full['num_conversions']

  # add CPA_charged column - analogous for cost to client
  df_full['cpa_charged'] = df_full['charged_client'] / df_full['num_conversions']

  # get a "target" cpa_charged - average of the past three CPA_chargeds
  # TODO - other ways to get target_cpa

  # if second parameter specified, then use that as the target CPA
  if target_cpa != -1:
    try:
      target_cpa_charged = float(target_cpa)
    except:
      print "need integer 2nd parameter"
      sys.exit(1)
  # otherwise, do the rolling average (up to 3)
  else:
    tail_length = 3

    # only one week's worth of data is available
    if len(df_full) == 1:
      print "no historical data to propose target CPA - please manually provide"
      sys.exit(0)

    # the historical data provided is too far in the past - force input
    if (df_full.index[-1] - df_full.index[-2]) > 4:
      print "historical data is too far in the past to propose target CPA - please manually provide"
      sys.exit(0)
    if len(df_full) < 4:
      tail_length = len(df_full) - 1

    target_cpa_charged = sum(df_full['cpa_charged'][(-1 - tail_length):-1]) / tail_length

  # proportion to hike up cpm_charged
  multiplier = target_cpa_charged / df_full['cpa'].irow(-1)

  # "fill in" correct cpa_charged
  df_full['cpa_charged'][df_full.index[-1]] = target_cpa_charged

  # "fill in" CPM and CPM_charged
  df_full['cpm'] = df_full['media_cost'] / df_full['impressions'] * 1000
  df_full['cpm_charged'] = df_full['cpa_charged'] / df_full['cpa'] * df_full['cpm']

  # "fill in" final charged_client

  # if number of conversions is 0, project charge_client according to specified rules
  our_multiplier = df_full['cpm_multiplier'][df_full.index[-1]]
  if our_multiplier == 0: # then this week's charge will just equal the media cost
    df_full['charged_client'][df_full.index[-1]] = df_full['media_cost'][df_full.index[-1]]
    df_full['cpm_charged'][df_full.index[-1]] = df_full['cpm'][df_full.index[-1]]
  elif df_full['num_conversions'][df_full.index[-1]] == 0:
    df_full['charged_client'][df_full.index[-1]] = our_multiplier * df_full['media_cost'][df_full.index[-1]]
    df_full['cpm_charged'][df_full.index[-1]] = our_multiplier * df_full['cpm'][df_full.index[-1]]
  else:
    df_full['charged_client'][df_full.index[-1]] = multiplier * df_full['media_cost'][df_full.index[-1]]

  # add a multiplier column (charged / cost)
  df_full['multiplier'] = df_full['cpm_charged'] / df_full['cpm']

  # get advertiser name
  advertiser_row = my_db.select_dataframe('select advertiser_name from advertiser where external_advertiser_id=(%d)' % num_advertiser)
  advertiser_name = advertiser_row.ix[0][0]

  # output
  # print "Advertiser:", advertiser_name, num_advertiser

  # arrange column order
  df_full = df_full.drop(['num_conversions', 'cpm_multiplier'], axis=1)
  cols = df_full.columns.tolist()
  new_cols = cols[0:4] + cols[-3:] + cols[4:-3]
  df_full = df_full[new_cols]
  # print df_full
  # print "multiplier:", df_full['multiplier'][df_full.index[-1]]

  # convert wk_no back to something to work with
  df_full['week_starting'] = df_full.index.map(get_date_from_yearweek)
  df_full = df_full.set_index('week_starting')
  return df_full

def get_table_single(advertiser_id):
  return get_table(advertiser_id, -1)

def get_current_multiplier_single(advertiser_id):
  week_df = get_table(advertiser_id, -1)
  return week_df['multiplier'][week_df.index[-1]]

def get_current_multiplier(advertiser_id, target_cpa):
  week_df = get_table(advertiser_id, target_cpa)
  return week_df['multiplier'][week_df.index[-1]]

def get_current_clientcharge(advertiser_id):
  week_df = get_table(advertiser_id, -1)
  return week_df['charged_client'][week_df.index[-1]]

def get_historical_charge(advertiser_id):
  # TODO - need to ensure that the current_week is excluded
  budget_info = my_db.select_dataframe('select sum(media_cost*cpm_multiplier) as charged_client from reporting.v4_reporting where external_advertiser_id=(%d) and active=1 and deleted=0;' % advertiser_id)
  return budget_info[0][0]

# get money used so far
def get_cumulative_clientcharge(advertiser_id):
  week_df = get_table(advertiser_id, -1)
  return sum(week_df['charged_client'])

# get the "most reasonable-looking budget" -> next budget cap to consider
def get_budget(advertiser_id, money_spent):
  budget_df = my_db.select_dataframe('select budget from insertion_order where external_advertiser_id = (%d);' % advertiser_id)
  cum_budget_df = budget_df.cumsum()
  for idx in range(len(cum_budget_df)):
    current_budget = cum_budget_df['budget'][idx]
    if (current_budget > money_spent):
      return (current_budget, budget_df['budget'][idx])

# wrapper
def get_dollars_remaining(advertiser_id):
  money_spent = get_cumulative_clientcharge(advertiser_id)
  return get_budget(advertiser_id, money_spent) - money_spent

# get days into campaign
def get_days_into_campaign(advertiser_id):
  diff_df = my_db.select_dataframe('select timestampdiff(DAY,actual_start_date,NOW()) as diff from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id)
  return diff_df.ix[0][0]

# get current start date
def get_current_start_date(advertiser_id):
  diff_df = my_db.select_dataframe('select actual_start_date from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id)
  return diff_df.ix[0][0]

# get end_date_proposed
def get_end_date_proposed(advertiser_id):
  diff_df = my_db.select_dataframe('select end_date_proposed from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id)
  return diff_df.ix[0][0]

# get proposed campaign length
def get_proposed_campaign_length(advertiser_id):
  length_df = my_db.select_dataframe('select timestampdiff(DAY,start_date_proposed, end_date_proposed) as diff from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL' % advertiser_id)
  return length_df.ix[0][0]

# get advertiser name
def get_advertiser_name(advertiser_id):
  advertiser_row = my_db.select_dataframe('select advertiser_name from advertiser where external_advertiser_id=(%d)' % advertiser_id)
  advertiser_name = advertiser_row.ix[0][0]
  return advertiser_name

def determine_pacing(row):
  ratio = row['expected_length'] / row['proposed_end_date_length']
  if ratio < 1.5:
    return "!"
  elif ratio < 3:
    return "!!"
  else:
    return "!!!"

# get comprehensive campaign information
def get_advertiser_info(advertiser_id):
  money_spent = get_cumulative_clientcharge(advertiser_id)
  budget_tuple = get_budget(advertiser_id, money_spent)
  current_budget = budget_tuple[1]
  current_remaining = budget_tuple[0] - money_spent
  current_spent = current_budget - current_remaining
  dollars_remaining = get_dollars_remaining(advertiser_id)
  days_into_campaign = get_days_into_campaign(advertiser_id)
  dollars_per_day = current_spent / days_into_campaign
  expected_campaign_length = current_budget / dollars_per_day
  proposed_campaign_length = get_proposed_campaign_length(advertiser_id)
  advertiser_name = get_advertiser_name(advertiser_id)
  current_start_date = get_current_start_date(advertiser_id)
  end_date_proposed = get_end_date_proposed(advertiser_id)

  map = { 'advertiser': [advertiser_name],
          'start_date': [current_start_date],
          'end_date': [end_date_proposed],
          'current_budget': [current_budget],
          'spent': [current_spent],
          'remaining': [current_remaining],
          # 'days_into_campaign': [days_into_campaign],
          'days_left': [int(expected_campaign_length) - days_into_campaign],
          '$_per_day': [dollars_per_day],
          'monthly_pacing': [30 * dollars_per_day],
          'expected_length': [expected_campaign_length],
          'expected_end_date': [DateOffset(days=int(expected_campaign_length)) + current_start_date],
           'proposed_end_date_length': [proposed_campaign_length]
          }
  advertiser_df = DataFrame(map)
  advertiser_df['pacing'] = advertiser_df.apply(determine_pacing, axis=1)
  return advertiser_df[['advertiser',
                       'start_date',
                       'end_date',
                       'proposed_end_date_length',
                       'expected_end_date',
                       'expected_length',
                       'days_left',
                       'current_budget',
                       'spent',
                       'remaining',
                       '$_per_day',
                       'monthly_pacing',
                       'pacing']]
  # return [current_budget, current_spent, current_remaining, days_into_campaign, dollars_per_day, expected_campaign_length, proposed_campaign_length]

def update_advertiser_targets(advertiser_id):
  # get the cpa target of the advertiser currently
  cpa_target = my_db.select_dataframe('select target_cpa from intraweek where external_advertiser_id = (%d)' % advertiser_id)
  target = cpa_target.ix[0][0]
  if target == None:
    new_target = -1
  else:
    new_target = target

  # get corresponding multiplier (and new target cpa, if applicable)
  ad_table = get_table(advertiser_id, new_target)
  multiplier = ad_table['multiplier'][ad_table.index[-1]]
  cpa_charged = ad_table['cpa_charged'][ad_table.index[-1]]

  # update table accordingly
  my_db.execute('update intraweek set deleted=0, cpm_multiplier=%f,target_cpa=%f where external_advertiser_id=%d;' % (multiplier, cpa_charged, advertiser_id))
  my_db.commit()

def get_compiled_pacing_reports():
  ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]
  pacing_reports = []
  for id in ids:
    pacing_reports.append(get_advertiser_info(id))

  compiled_pacing = pandas.concat(pacing_reports)

  return compiled_pacing

def get_all_advertiser_tables():
  ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]

  for id in ids:
    print get_advertiser_name(id), "---------------------------"
    this_table = get_table(id, -1)
    print get_table(id, -1).ix[-4:]
    print "total client cost (including new projections):", sum(this_table['charged_client'])

def get_advertiser_table(advertiser_id):
   return get_table(advertiser_id, -1).ix[-4:]

# sample usages below, will probably comment these out later
#if __name__ == "__main__":

  # print get_compiled_pacing_reports()

  # get_all_advertiser_tables()
