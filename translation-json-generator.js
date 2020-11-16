// const fs = require('fs')
const jsonfile = require('jsonfile')
// const jsonld = require('jsonld')
const Set = require('collections/set')
const Map = require('collections/map')
const camelCase = require('camelcase')

var program = require('commander')

// delete domain & label?
program
  .version('0.8.0')
  .usage('node specgen-translation-json-generator.js creates a translatable json based on a jsonld and a chosen prime and goallanguage')
  .option('-i, --input <path>', 'input file (a jsonld file)')
  .option('-o, --output <path>', 'output file (a json file)')
  .option('-m, --primeLanguage <language>', 'prime language to translate to a different one (a string)')
  .option('-g, --goalLanguage <language>', 'goal language to translate into (a string)')

program.on('--help', function () {
  console.log('')
  console.log('Examples:')
  console.log('  $ specgen-context --help')
  console.log('  $ specgen-context -i <input> -m <primeLanguage> -g <goalLanugage> -o <outputfile>')
})

program.parse(process.argv)
const forceDomain = !!program.forceDomain

transform_json_ld_file_to_translatable_json(program.input, program.primeLanguage, program.goalLanguage, program.output)
console.log('done')

/* ---- end of the program --- */

function transform_json_ld_file_to_translatable_json(filename, primeLanguage, goalLanguage, outputfile) {
  console.log('Prime Language: ' + primeLanguage)
  console.log('Goal Language: ' + goalLanguage)
  console.log('start reading')
  jsonfile.readFile(filename)
    .then(
      function (obj) {
        console.log('start processing')

        if (primeLanguage != goalLanguage) {
          var myJson = get_shortened_json(obj, primeLanguage, goalLanguage)
        } else {
          console.log("WARNING The entered language values are the same!")
          var myJson = get_shortened_json_for_equal_language(obj, primeLanguage)
        }

        //var output_filename = get_outputFilename (filename, goalLanguage)
        jsonfile.writeFile(outputfile, myJson)
          .then(res => {
            console.log('Write complete')
            console.log('the file was saved to: ' + outputfile)
          })
          .catch(error => { console.error(error); process.exitCode = 1 })
      }
    )
    .catch(error => { console.error(error); process.exitCode = 1 })
}

//reading/writing the relevant values
function get_shortened_json(input, primeLanguage, goalLanguage) {
  var json = new Object()
  var classArray = new Array(Object)
  var propertyArray = new Array(Object)

  for (i = 0; i < input.classes.length; i++) {
    classArray[i] = create_shortened_class(input.classes[i], primeLanguage, goalLanguage)
  }

  for (i = 0; i < input.properties.length; i++) {
    propertyArray[i] = create_shortened_property(input.properties[i], primeLanguage, goalLanguage)
  }

  json['baseURI'] = input['baseURI']
  json.classes = classArray
  json.properties = propertyArray
  return json
}

function get_shortened_json_for_equal_language(input, language) {
  var json = new Object()
  var classArray = new Array(Object)
  var propertyArray = new Array(Object)

  for (i = 0; i < input.classes.length; i++) {
    classArray[i] = create_shortened_class_one_language(input.classes[i], language)
  }

  for (i = 0; i < input.properties.length; i++) {
    propertyArray[i] = create_shortened_property_one_language(input.properties[i], language)
  }

  json['baseURI'] = input['baseURI']
  json.classes = classArray
  json.properties = propertyArray
  return json
}

//checks mandatory values: name, label, definintion, description & adds the id
function create_shortened_class_one_language(classObject, language) {
  var shortClass = new Object()
  shortClass['@id'] = classObject['@id']
  shortClass = get_one_langue_value(shortClass, classObject, "name", language)
  shortClass = get_one_langue_value(shortClass, classObject, "label", language)
  shortClass = get_one_langue_value(shortClass, classObject, "definition", language)
  shortClass = get_one_langue_value(shortClass, classObject, "description", language)

  return shortClass
}

//adds 'usage' to the necessary values
function create_shortened_property_one_language(propertiesObject, language) {
  shortProperty = create_shortened_class_one_language(propertiesObject, language)
  shortProperty = get_one_langue_value(shortProperty, propertiesObject, "usage", language)

  return shortProperty
}

function get_one_langue_value(shortClass, classObject, attribute, language) {
  if (!(classObject[attribute] === undefined)) {
    shortClass[attribute] = classObject[attribute]
    shortClass[attribute][language] = classObject[attribute][language]
  }
  return shortClass
}

//checks mandatory values: name, label, definintion, description & adds the id
function create_shortened_class(classObject, prime, goal) {
  var shortClass = new Object()
  shortClass['@id'] = classObject['@id']
  shortClass = get_attribute(shortClass, classObject, "name", prime, goal)
  shortClass = get_attribute(shortClass, classObject, "label", prime, goal)
  shortClass = get_attribute(shortClass, classObject, "definition", prime, goal)
  shortClass = get_attribute(shortClass, classObject, "description", prime, goal)

  return shortClass
}

//adds 'usage' to the necessary values
function create_shortened_property(propertiesObject, prime, goal) {
  shortProperty = create_shortened_class(propertiesObject, prime, goal)
  shortProperty = get_attribute(shortProperty, propertiesObject, "usage", prime, goal)

  return shortProperty
}

function get_attribute(shortObject, originalObject, attribute, prime, goal) {
  if (!(originalObject[attribute] === undefined)) {
    shortObject[attribute] = originalObject[attribute]
    shortObject[attribute][prime] = getValue(originalObject[attribute], prime)
    shortObject[attribute][goal] = 'Enter your translation here'
  }
  return shortObject
}

function getValue(object, prime) {
  if (!(object === undefined) && !(object[prime] === undefined)) {
    return object[prime]
  }
  return ""
}

/* REPLACED BY GET_ATTRIBUTE
function get_definition(shortClass, classObject, prime, goal) {
  if (!(classObject.definition === undefined)) {
    shortClass.definition = classObject.definition
    shortClass.definition[prime] = getValue(classObject.definition, prime)
    shortClass.definition[goal] = 'Enter your translation here'
  }
  return shortClass
}

function get_description(shortClass, classObject, prime, goal) {
  if (!(classObject.description === undefined)) {
    shortClass.description = classObject.description
    shortClass.description[prime] = getValue(classObject.description, prime)
    shortClass.description[goal] = 'Enter your translation here'
  }
  return shortClass
}

function get_label(shortClass, classObject, prime, goal) {
  if (!(classObject.label === undefined)) {
    shortClass.label = classObject.label
    shortClass.label[prime] = getValue(classObject.label, prime)
    shortClass.label[goal] = 'Enter your translation here'
  }
  return shortClass
}

function get_Name(shortClass, classObject, prime, goal) {
  if (!(classObject.name === undefined)) {
    shortClass.name = classObject.name
    shortClass.name[prime] = getValue(classObject.name, prime)
    shortClass.name[goal] = 'Enter your translation here'
  }
  return shortClass

}

function get_usage(shortProperty, propObject, prime, goal) {
  if (!(propObject.usage === undefined)) {
    shortProperty.usage = propObject.usage
    shortProperty.usage[prime] = getValue(propObject.usage, prime)
    shortProperty.usage[goal] = 'Enter your translation here'
  }
  return shortProperty
}
*/