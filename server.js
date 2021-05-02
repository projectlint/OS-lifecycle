#!/usr/bin/env node

const {readFile, writeFile} = require('fs').promises
const {join} = require('path')

const request = require('request')
const {gt, inc, lte} = require('semver')

const package = require('./package.json')


function date2version(value)
{
  return value.split('-').map(function(value)
  {
    return parseInt(value)
  }).join('.')
}

function fetchUrl(url, options) {
  return new Promise(function(resolve, reject)
  {
    request(url, options, function(error, response, body) {
      if (error) return reject(error);

      resolve({body, response});
    });
  });
}

function scrap({url, name, idField, scrap})
{
  if(!Array.isArray(idField)) idField = [idField]

  function findRow(item)
  {
    return idField.every(idField => item[idField] === this[idField])
  }

  const filePath = join(__dirname, 'data', `${name}.json`)

  return Promise.all([
    fetchUrl(url),
    readFile(filePath).then(JSON.parse, onReadDataFailure)
  ])
  .then(async function([response, data])
  {
    const {date, table} = await scrap(response)
    const version = date2version(date)

    if(data.date && lte(version, date2version(data.date))) return

    for(const row of table)
    {
      const index = data.data.findIndex(findRow, row)

      if(index < 0)
        data.data.push(row)
      else
        Object.assign(data.data[index], row)
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
  require('./strategies/distro-info-data/debian'),
  require('./strategies/distro-info-data/ubuntu'),
  require('./strategies/Ubuntu'),
  // require('./strategies/Windows')
]

Promise.all([
  readFile('index.json').then(JSON.parse, onReadIndexFailure),
  ...strategies.map(scrap),
])
.then(function([indexJson, ...results])
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

  let version = results.reduce(function(acum, result, index)
  {
    if(!result) return acum

    const {data, version} = result

    for(const lifecycle of data.map(strategies[index].normalize))
    {
      const index = indexJson.findIndex(function({codename, name, version})
      {
        return name === lifecycle.name
        && ((version && version === lifecycle.version)
          || codename === lifecycle.codename)
      })

      if(index < 0)
        indexJson.push(lifecycle)
      else
      {
        const oldLifecycle = indexJson[index]
        const eol = lifecycle.eol.length < oldLifecycle.eol.length
                  ? oldLifecycle.eol
                  : lifecycle.eol

        Object.assign(oldLifecycle, lifecycle, {eol})
      }
    }

    if(gt(version, acum)) acum = version

    return acum
  }, oldVersion)

  function writePackageJson()
  {
    if(lte(version, oldVersion)) version = inc(oldVersion, 'prerelease')

    if(process.argv[2] === '--print') process.stdout.write(version)

    package.version = version

    return writeJsonFile('package.json', package)
  }

  return Promise.all([
    writeJsonFile('index.json', indexJson),
    writePackageJson()
  ])
})
