import numpy as np
import pandas as pd
import sklearn
import pydotplus

from sklearn import feature_selection as fs
from sklearn import tree
from sklearn.externals.six import StringIO
from sklearn.feature_extraction import DictVectorizer

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class Tree:
    def __init__(self, df, training_column_name, class_column_name, 
                 export_path=None, num_sample_days=7, sample_size=.001, 
                 make_branches=True, max_depth=10, min_samples=2, 
                 num_features=800, max_leaf_nodes = None):
        self.df = df
        self.num_sample_days = num_sample_days
        self.sample_size = sample_size
        self.training_column_name = training_column_name
        self.class_column_name = class_column_name

        # Model options
        self.max_depth = max_depth
        self.min_samples = min_samples
        self.num_features = num_features
        self.max_leaf_nodes = max_leaf_nodes
        self.export_path = export_path
        
        try:
            self.make_tree()
            self.good_leaves = self.get_good_leaves()
        except Exception as e:
            logging.error(e)

        if make_branches:
            self.branches = self.make_branches()
            logger.info(self.branches)

    def has_excludes(self, branch):
        for node in branch:
            if node["action"] == "exclude":
                return True
        return False

    def make_funnel_recs(self):
        recs = []
        branches = [self.get_rules(leaf) for leaf in self.good_leaves]

        df_copy = self.df.copy()

        for b in branches:
            while len(b) > 0:
                # If this is an include-only branch, add it to the recommendations
                if not self.has_excludes(b) and b not in recs:
                    includes = [action["domain"] for action in b]
                    df_copy["passes_rule"] = df_copy.apply(self.evaluate, axis=1, args=[includes,[]])
                    counts = df_copy.passes_rule.value_counts()
                    num_in_funnel = counts.loc[True]
                    recs.append({"actions":b, "num_in_funnel": num_in_funnel})
                    break
                # If it does contain excludes, drop the top-most node and try again
                b = b[:-1]
        
        final = []
        for rec in recs:
            urls = [action["domain"] for action in rec["actions"]]
            urls.reverse()
            to_add = {"actions": urls, "num_in_funnel": rec["num_in_funnel"]}
            if to_add not in final:
                final.append(to_add)

        return final

    def make_branches(self):
        branches = []

        for leaf in self.good_leaves:
            # Establish branch rules
            branch = {}

            rules = self.get_rules(leaf)
            branch["rules"] = [
                {
                    "action":rule["action"], 
                    "domain": rule["domain"]
                } for rule in rules]

            include,exclude = self.get_include_exclude(branch["rules"])

            df_copy = self.df.copy()
            df_copy["passes_rule"] = df_copy.apply(self.evaluate, axis=1, args=[include,exclude])

            # Only keep population data
            df_not_converted = df_copy[df_copy.converted == '0']
            df_converted = df_copy[df_copy.converted == '1']

            counts = df_not_converted.passes_rule.value_counts()
            converted_counts = df_converted.passes_rule.value_counts()

            imps_counts = df_not_converted[df_not_converted.passes_rule].num_imps.sum()

            # Number of converters who fall into this branch
            branch["num_converters"] = converted_counts.loc[True]

            # Number of users who fall into this branch
            branch["num_users"] = int(counts.loc[True] / self.sample_size + converted_counts[True])

            # Calculate estimated conversion rate for branch
            branch["conv_rate"] = branch["num_converters"] * 1.0 / branch["num_users"]

            branch["num_daily_users_weighted"] = int(counts.loc[True] / self.sample_size / self.num_sample_days)
            branch["num_daily_imps_weighted"] = int(imps_counts / self.sample_size / self.num_sample_days)
            branches.append(branch)

        return branches

    def make_tree(self):
        X = pd.DataFrame(self.df[self.training_column_name])
        y = self.df[self.class_column_name]

        df_dict = X.to_dict(outtype="records")
        df_dict = map(self.flatten_domains, df_dict)

        logger.info("Transforming dictionary to vectorized features...")
        v = DictVectorizer(sparse=True)
        X = v.fit_transform(df_dict)
        self.v = v

        logger.info("Performing feature selection...")
        logger.info("Found {} features".format(len(v.feature_names_)))

        # If our feature limit is greater than the actual number of features, 
        # change this setting to avoid raising an exception in sklearn
        if self.num_features > len(v.feature_names_):
            self.num_features = len(v.feature_names_)

        b = fs.SelectKBest(fs.chi2, k=self.num_features)
        X = b.fit_transform(X, y).toarray()

        logger.info("Determining sample weights...")
        weight_value = 1.0 * y.value_counts()['0'] / y.value_counts()['1']

        logger.info("Using weight = {}...".format(weight_value))

        sample_weight = np.array([weight_value if i == '1' else 1 for i in y])

        logger.info("Learning tree...")
        clf = tree.DecisionTreeClassifier( criterion="gini", 
                                           max_depth=self.max_depth, 
                                           min_samples_leaf=self.min_samples, 
                                           max_leaf_nodes=self.max_leaf_nodes)
        clf = clf.fit(X, y, sample_weight=sample_weight)

        self.clf = clf
        self.feature_names = np.array(v.feature_names_)[b.get_support()]

        if self.export_path:
            self.export_tree(self.export_path)

        logger.info("Done.")

    def export_tree(self, export_path):
        logger.info("Exporting tree...")
        dot_data = StringIO()
        tree.export_graphviz(self.clf, out_file=dot_data, feature_names=self.feature_names)
        graph = pydotplus.graph_from_dot_data(dot_data.getvalue().encode('utf-8'))
        graph.write_pdf(export_path)

    def get_good_leaves(self, threshold = 1):
        nodes = [i[0] for i in self.clf.tree_.value.tolist()]
        good = []

        for i in range(0, len(nodes)):
            node = nodes[i]
            if node == [0.0, 0.0]:
                continue
            elif node[0] == 0.0:
                continue
            elif (node[1] / node[0]) > threshold:
                good.append(i)
            else:
                pass

        return good

    def get_rules(self, ni):
        left = self.clf.tree_.children_left.tolist()
        right = self.clf.tree_.children_right.tolist()
        features = self.clf.tree_.feature

        def recurse(node, direction, rules):
            if features[node] != -2:
                rules.append({
                        "node_id": node, 
                        "domain": self.feature_names[features[node]], 
                        "action": direction
                        })
            if node in left:
                next_node = left.index(node)
                return recurse(next_node, "exclude", rules)
            elif node in right:
                next_node = right.index(node)
                return recurse(next_node, "include", rules)
            else:
                return rules

        return recurse(ni, None, [])

    def get_include_exclude(self, branch):
        include = [ rule["domain"] 
                    for rule in branch 
                    if rule["action"] == "include"]

        exclude = [ rule["domain"] 
                    for rule in branch 
                    if rule["action"] == "exclude"]

        return include, exclude

    def evaluate(self, user, include, exclude):
        # Make sure that the user hasn't been to any exluded domains
        for domain in user[self.training_column_name]:
            if domain in exclude:
                return False

        # Make sure that the user has been to all included domains
        for domain in include:
            if domain not in user[self.training_column_name]:
                return False

        return True

    def flatten_domains(self, d):
        # in-place version
        if isinstance(d.get(self.training_column_name), list):
            for i in d.pop(self.training_column_name):
                d['%s' % i.decode("ascii", "ignore")] = True
        return d
