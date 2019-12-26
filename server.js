#!/usr/bin/env node

const {writeFile} = require('fs').promises

const {load} = require('cheerio')
const moment = require('moment-timezone')
const {AbstractToJson: {fetchUrl}} = require('pagetojson')
const release = require('release-it')
const {lte} = require('semver')
const {convert} = require('tabletojson')

const {version} = require('./package.json')


const REGEXP_ARCH = /^([ \S]+?)\s+(\d+)-bit$/
const REGEXP_CODENAME = /^([ \S]+?)\s+"([ \S]*)"$/


function cleanData(lifecycle)
{
  lifecycle['Operating System'] = lifecycle['Operating System']
  .replace(/\s*upgrade note$/, '')

  let matches = lifecycle['Operating System'].match(REGEXP_ARCH)
  if(matches && matches.length === 3)
  {
    lifecycle['Operating System'] = matches[1]
    lifecycle['bits'            ] = matches[2]
  }

  matches = lifecycle['Operating System'].match(REGEXP_CODENAME)
  if(matches && matches.length === 3)
  {
    lifecycle['Operating System'] = matches[1]
    lifecycle['codename'        ] = matches[2]
  }

  // Apple does not publish official EOL dates, but typically provides security
  // updates for the current release of macOS, as well as the previous two
  // releases.
  const latestVendorEolDate = lifecycle['Latest Vendor EOL Date']
  .replace(/^~/, '').replace(/see note$/, '')

  lifecycle['Vendor Release Date'   ] = parseDate(lifecycle['Vendor Release Date' ])
  lifecycle['Start of SCS Support'  ] = parseDate(lifecycle['Start of SCS Support'])
  lifecycle['End of SCS Support'    ] = parseDate(lifecycle['End of SCS Support'  ])
  lifecycle['Latest Vendor EOL Date'] = parseDate(latestVendorEolDate)

  return lifecycle
}

function parseDate(date)
{
  console.log(date, moment(date), moment(date).format('Y.M.D'))
  return moment(date, 'America/New_York')
}


fetchUrl('https://computing.cs.cmu.edu/desktop/os-lifecycle.html')
.then(function(html)
{
  const increment = parseDate(moment(load(html)('p.sidedate').text().trim()
  .replace(/^As of: /, ''))).format('Y.M.D')

  if(lte(increment, version)) return

  const lifecycles = convert(html, {useFirstRowForHeadings: true})[1].slice(1)

  const cleanedData = lifecycles.map(cleanData)

  writeFile('index.json', JSON.stringify(cleanedData, null, 2))

  const options =
  {
    ci: true,
    git:
    {
      requireCleanWorkingDir: false
    },
    increment
  }

  return release(options)
})
