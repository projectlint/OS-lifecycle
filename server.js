#!/usr/bin/env node

const {readFile, writeFile} = require('fs').promises
const {join} = require('path')

const {load} = require('cheerio')
const {AbstractToJson: {fetchUrl}} = require('pagetojson')
const {gt, inc, lte} = require('semver')
const {convert} = require('tabletojson')

const package = require('./package.json')


function date2version(value)
{
  return value.split('-').map(function(value)
  {
    return parseInt(value)
  }).join('.')
}


function scrap({url, name, idField, scrapDate, scrapTable})
{
  const filePath = join(__dirname, 'data', `${name}.json`)

  return Promise.all([
    fetchUrl(url),
    readFile(filePath).then(JSON.parse, onReadDataFailure)
  ])
  .then(function([html, data])
  {
    const date = scrapDate(load(html))
    const version = date2version(date)

    if(data.date && lte(version, date2version(data.date))) return

    const options = {useFirstRowForHeadings: true}

    for(const tableData of scrapTable(convert(html, options)))
    {
      const index = data.data.findIndex(function(item)
      {
        return item[idField] === tableData[idField]
      })

      if(index < 0)
        data.data.push(tableData)
      else
        Object.assign(data.data[index], tableData)
    }

    data.url = url
    data.date = date

    return writeJsonFile(filePath, data)
    .then(function()
    {
      data.version = version

      return data
    })
  })
}

function onReadDataFailure(error)
{
  if(error.code !== 'ENOENT') throw error

  return {data: []}
}

function onReadIndexFailure(error)
{
  if(error.code !== 'ENOENT') throw error

  return []
}

function writeJsonFile(filePath, data)
{
  return writeFile(filePath, JSON.stringify(data, null, 2))
}


const strategies =
[
  require('./strategies/os-lifecycle'),
  require('./strategies/Ubuntu'),
  // require('./strategies/Windows')
]

Promise.all([
  Promise.all(strategies.map(scrap)),
  readFile('index.json').then(JSON.parse, onReadIndexFailure)
])
.then(function([results, indexJson])
{
  if(!results.some(Boolean)) return

  // Remove lifecycles from `OS lifecycles` processed by other strategies
  const [osLifecycles] = results
  if(osLifecycles)
    osLifecycles.data = osLifecycles.data.filter(function(lifecycle)
    {
      return lifecycle['OS Family'] !== 'Ubuntu Linux'
    })

  const oldVersion = package.version

  const version = results.reduce(function(acum, result, index)
  {
    if(!result) return acum

    const {data, version} = result

    for(const lifecycle of data.map(strategies[index].normalize))
    {
      const index = indexJson.findIndex(function({name, version})
      {
        return name === lifecycle.name && version === lifecycle.version
      })

      if(index < 0)
        indexJson.push(lifecycle)
      else
        Object.assign(indexJson[index], lifecycle)
    }

    if(gt(version, acum)) acum = version

    return acum
  }, oldVersion)

  function writePackageJson()
  {
    if(lte(version, oldVersion)) version = inc(oldVersion, 'prerelease')

    package.version = version

    return writeJsonFile('package.json', package)
  }

  return Promise.all([
    writeJsonFile('index.json', indexJson),
    writePackageJson()
  ])
})
