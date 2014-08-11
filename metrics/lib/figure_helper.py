# import pandas as pd
import vincent
# from mpltools import style
from matplotlib import rcParams
rcParams.update({'figure.autolayout': True})

# style.use('ggplot')

def pie(s, export_path="./", html=True, name="pie", legend=None):
	fig = vincent.Pie(s, width=2000)
	if legend:
		fig.legend(legend)
	else:
		fig.legend()
	fig.colors(brew='Set3')
	if html:
		fig.to_json(export_path+name+'.json', html_out=True, html_path=export_path+name+'.html')
	else:
		fig.to_json(export_path+name+'.json')