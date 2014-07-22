from lib.helpers import URL
class DomainLookup(object):
    """
    DomainLookup parses domain from the referrer.
    """

    def get(self,referrer):
        """
        Look up and format information associated with referrer

        Args:
          referrer (string): referrer to parse

        Returns:
          dict: contains the parsed domain
        """
        return {
            "domain":URL.parse_domain(referrer)
        }
