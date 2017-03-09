from specgen import read_mcf, pretty_print, render_template, get_charstring, get_supported_schemas

from specgen import voc_to_spec

from specgen.extractvoc import convert
from specgen.extractap import convert_csv

import tempfile
import os
import codecs
import unittest

import lxml.etree as ET

THISDIR = os.path.dirname(os.path.realpath(__file__))

def msg(test_id, test_description):
    """convenience function to print out test id and desc"""
    return '%s: %s' % (test_id, test_description)

class SpecGenTest(unittest.TestCase):
    """Test suite for package specgen"""

    def setUp(self):
        """setup test fixtures, etc."""

        print(msg(self.id(), self.shortDescription()))

    def tearDown(self):
        """return to pristine state"""

        pass

    def test_rdf_lossless(self):
        """Test RDF2VOC_HTML"""

        test_files = [
            './locn.ttl',
            './export.ttl'
        ]

        for t in test_files:
            # RDF -{1}> XML
            rdf = get_abspath(t)
            result = convert(rdf)
            _, fp = tempfile.mkstemp()

            with codecs.open(fp, 'w', encoding='utf-8') as f:
                f.write(u'%s' % result)
            f.close()

            # {1}
            xml = render_template(fp, schema='vocabulary')

            _, xp = tempfile.mkstemp()
            f = open(xp, 'wb')
            xml.write(f)
            f.close()
            dom = ET.parse(os.path.realpath(xp))
            print(ET.tostring(dom, pretty_print=True))
            print(os.path.realpath(xp))


    def test_csv_lossless(self):
        """Test CSV2AP_HTML"""

        test_files = [
            './export_org.csv'
        ]

        for t in test_files:
            # CSV -{1}> XML
            csv = get_abspath(t)
            result = convert_csv(csv)
            _, fp = tempfile.mkstemp()

            with codecs.open(fp, 'w', encoding='utf-8') as f:
                f.write(u'%s' % result)
            f.close()

            # {1}
            xml = render_template(fp, schema='ap')

            _, xp = tempfile.mkstemp()
            f = open(xp, 'wb')
            xml.write(f)
            f.close()
            dom = ET.parse(os.path.realpath(xp))
            print(ET.tostring(dom, pretty_print=True))
            print(os.path.realpath(xp))


def get_abspath(filepath):
    """helper function absolute file access"""

    return os.path.join(THISDIR, filepath)


if __name__ == '__main__':
    unittest.main()
