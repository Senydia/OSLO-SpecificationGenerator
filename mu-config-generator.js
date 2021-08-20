const fs = require('fs')
const StringBuilder = require('string-builder')
const pluralize = require('pluralize')
const jsonfile = require('jsonfile')
const camelCase = require('camelcase')
const program = require('commander')

program
  .version('1.0.0')
  .usage('node mu-config-generator.js merges translation Json with original jsonld')
  .option('-i, --input <path>', 'input file (a jsonld file)')
  .option('-l, --language <languagecode>', 'wished language (languagecode)')
  .option('-o, --outputdirectory <path to directory>', 'output directory (directory path)')
  .option('-s, --stringtype <boolean>', 'a variable to define if the properties are a language-string (true) or a normal string (false + default) (boolean)')
  .option('-e, --externals <boolean>', 'a variable to define if the external classes and properties should be included into the configuartion or not (per default false) (boolean)')

program.on('--help', function () {
  console.log('')
  console.log('Examples:')
  console.log('  $ mu-config-generator --help')
  console.log('  $ mu-config-generator -i <input> -o <output> -l <language>')
  console.log('  $ mu-config-generator -i <input> -o <output> -l <language> -s <stringtype>')
  console.log('  $ mu-config-generator -i <input> -o <output> -l <language> -s <stringtype> -e <externals>')
  process.exitCode = 1
})

program.parse(process.argv)
const options = program.opts()

const stringtype = specify_string(options.stringtype)
console.log(stringtype)

create_config(options.input, options.outputdirectory, options.language, options.externals)
console.log('done')

function specify_string (bool) {
  switch (bool) {
    case 'true':
    case true:
      return ':language-string'
    default:
      return ':string'
  }
}

function create_config (input_filename, outputdirectory, language, externals) {
  console.log('start reading')
  jsonfile.readFile(input_filename)
    .then(
      function (input) {
        if (fs.existsSync(outputdirectory)) {
          console.log('start processing')

          input = mergeExternals(input, externals)
          write_domainlisp(outputdirectory, input, language)
          write_repositorylisp(outputdirectory)
        } else {
          console.log('The destined repository does not exist. Aborting.')
          process.exitCode = 1
        }
      })
    .catch(error => { console.error(error); process.exitCode = 1 })
}

function mergeExternals (input, externals) {
  if (externals === true || externals === 'true') {
    const classesArray = []
    const propertyArray = []
    input.classes.forEach(element => {
      classesArray.push(element)
    })
    input.externals.forEach(element => {
      classesArray.push(element)
    })
    input.properties.forEach(element => {
      propertyArray.push(element)
    })
    input.externalproperties.forEach(element => {
      propertyArray.push(element)
    })
    input.classes = classesArray
    input.properties = propertyArray
  }
  return input
}

function write_repositorylisp (outputdir) {
  const reposBuilder = new StringBuilder()
  reposBuilder.append('(in-package :mu-cl-resources)').appendLine()
  reposBuilder.append(';; NOTE').appendLine()
  reposBuilder.append(';; docker-compose stop; docker-compose rm; docker-compose up').appendLine()
  reposBuilder.append(';; after altering this file.').appendLine().appendLine()
  reposBuilder.append(";; Describe the prefixes which you'll use in the domain file here.").appendLine()
  reposBuilder.append(';; This is a short-form which allows you to write, for example,').appendLine()
  reposBuilder.append(';; (s-url "http://purl.org/dc/terms/title")').appendLine()
  reposBuilder.append(';; as (s-prefix "dct:title")').appendLine()
  reposBuilder.append(' (add-prefix "sh" "http://www.w3.org/ns/shacl#")').appendLine()
  fs.writeFile(getFilename(outputdir, 'repository.lisp'), reposBuilder.toString(), function (err, data) {
    if (err) {
      return console.log(err)
    }
    console.log('Data saved to: ' + getFilename(outputdir, 'repository.lisp'))
  })
}

function write_domainlisp (outputdir, input, language) {
  let domainBuilder = initialize_domain_builder()
  for (let i = 0; i < input.classes.length; i++) {
    const currClass = input.classes[i]
    domainBuilder = start_class(domainBuilder, currClass, language, input)
    domainBuilder = check_domain(domainBuilder, currClass, input.properties, input.classes, language)
    domainBuilder = check_range(domainBuilder, currClass, input.properties, input.classes, language)
    domainBuilder = end_class(domainBuilder, currClass, language)
  }
  fs.writeFile(getFilename(outputdir, 'domain.lisp'), domainBuilder.toString(), function (err, data) {
    if (err) {
      return console.log(err)
    }
    console.log('Data saved to: ' + getFilename(outputdir, 'domain.lisp'))
  })
}

function check_range (domainBuilder, currClass, properties, classes, language) {
  for (let p = 0; p < properties.length; p++) {
    const property = properties[p]
    if (property.range !== undefined) {
      for (let i = 0; i < property.range.length; i++) {
        const range = property.range[i]
        if (range.uri === currClass['@id']) {
          domainBuilder = write_range(domainBuilder, classes, property.domain, property['@id'], language)
        }
      }
    }
  }
  return domainBuilder
}

function write_range (domainBuilder, classes, domainArray, id, language) {
  for (let i = 0; i < domainArray.length; i++) {
    const domain = get_equivalent_class(classes, domainArray[i].uri)
    if (domain != null) {
      domainBuilder.append('   :has-many `((' + get_label(domain, language) + ' :via ,(s-url "' + id + '")').appendLine()
      domainBuilder.append('                        :inverse t').appendLine()
      const name = pluralize.plural(get_label(domain, language))
      domainBuilder.append('                        :as "' + name + '"))').appendLine()
    }
  }
  return domainBuilder
}

function check_domain (domainBuilder, currClass, properties, classes, language) {
  for (let p = 0; p < properties.length; p++) {
    const property = properties[p]
    for (let i = 0; i < property.domain.length; i++) {
      const domain = property.domain[i]
      if (domain.uri === currClass['@id']) {
        domainBuilder = write_domain(domainBuilder, classes, property.range, property['@id'], language)
      }
    }
  }
  return domainBuilder
}

function write_domain (domainBuilder, classes, rangeArray, id, language) {
  for (let i = 0; i < rangeArray.length; i++) {
    const range = get_equivalent_class(classes, rangeArray[i].uri)
    if (range != null) {
      domainBuilder.append('   :has-one `((' + get_label(range, language) + ' :via ,(s-url "' + id + '")').appendLine()
      domainBuilder.append('                        :as "' + get_label(range, language) + '"))').appendLine()
    }
  }
  return domainBuilder
}

function get_equivalent_class (inputArray, currId) {
  for (let i = 0; i < inputArray.length; i++) {
    if (inputArray[i]['@id'] === currId) {
      return inputArray[i]
    }
  }
  return null
}

function initialize_domain_builder () {
  const domainBuilder = new StringBuilder()
  domainBuilder.append('(in-package :mu-cl-resources)').appendLine()
  domainBuilder.append(';; NOTE').appendLine()
  domainBuilder.append(';; docker-compose stop; docker-compose rm; docker-compose up').appendLine()
  domainBuilder.append(';; after altering this file.').appendLine().appendLine()
  return domainBuilder
}

function start_class (domainBuilder, currClass, language, input) {
  domainBuilder.append('(define-resource ' + get_label(currClass, language) + ' ()').appendLine()
  domainBuilder.append('   :class (s-url "' + currClass['@id'] + '")').appendLine()
  // If you want any of the properties to be language-tagged you'll have to set their options to true
  domainBuilder = write_properties(domainBuilder, currClass, input, language)
  return domainBuilder
}

function write_properties (domainBuilder, currClass, input, language) {
  const dict = get_properties(currClass, input, language)
  if (dict.length > 0) {
    domainBuilder.append('   :properties `((')
    for (let i = 0; i < dict.length; i++) {
      const item = dict[i]
      const id = item.key
      const name = (item.value).replace(' ', '')
      if (i !== 0) {
        domainBuilder.appendLine()
        domainBuilder.append('                 (')
      }
      domainBuilder.append(':' + name + ' ' + stringtype + ' ,(s-url "' + id + '"))')
    }
    domainBuilder.append(')').appendLine()
  }
  return domainBuilder
}

function get_properties (currClass, input, language) {
  const properties = input.properties
  let propdict = []
  for (let p = 0; p < properties.length; p++) {
    const property = properties[p]
    for (let i = 0; i < property.domain.length; i++) {
      const domain = property.domain[i]
      if (domain.uri === currClass['@id']) {
        propdict = get_literal_props(property, propdict, language)
      }
    }
  }
  return propdict
}

function get_literal_props (property, propdict, language) {
  const range = property.range
  for (let i = 0; i < range.length; i++) {
    const item = range[i]
    if (is_literal(item.uri)) {
      let label = get_label(property, language)
      label = lowerCaseFirstLetter(label)
      propdict.push({
        key: property['@id'],
        value: label
      })
    }
  }
  return propdict
}

function is_literal (id) {
  const literals = ['http://www.w3.org/2001/XMLSchema#', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'https://www.w3.org/TR/xmlschema11-2/#']

  for (let i = 0; i < literals.length; i++) {
    const literal = literals[i]
    if (id.includes(literal)) {
      return true
    }
  }
  return false
}

function end_class (domainBuilder, currClass, language) {
  const name = pluralize.plural(get_label(currClass, language))
  domainBuilder.append(':resource-base (s-url "' + currClass['@id'] + '")').appendLine()
  domainBuilder.append(':on-path "' + name + '")').appendLine().appendLine()
  return domainBuilder
}

function get_label (obj, language) {
  if (obj.label !== undefined && obj.label[language] !== undefined) {
    let camelCased = toCamelCase(obj.label[language])
    camelCased = camelCased.toLowerCase()
    return capitalizeFirstLetter(camelCased)
  } else {
    console.log('No label for specified language in object: ' + obj['@id'] + ' usind EA-Name instead: ' + obj.extra['EA-Name'])
    return obj.extra['EA-Name']
  }
}

function toCamelCase (str) {
  str = camelCase(str)
  str = str.replace(/\s\(source\)/g, '(source)').replace(/\s\(target\)/g, '(target)')
  return str
};

function capitalizeFirstLetter (string) {
  const capitalized = string.charAt(0).toUpperCase() + string.slice(1)
  return capitalized
}

function lowerCaseFirstLetter (string) {
  const capitalized = string.charAt(0).toLowerCase() + string.slice(1)
  return capitalized
}

function getFilename (directory, file) {
  if (directory.charAt(directory.length - 1) === '/' || directory.charAt(directory.length - 1) === '\\') {
    return directory + file
  } else {
    return (directory + '/' + file)
  }
}
