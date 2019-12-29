#!/usr/bin/env node

const {writeFile} = require('fs').promises

const {load} = require('cheerio')
const {AbstractToJson: {fetchUrl}} = require('pagetojson')
const release = require('release-it')
const {lte} = require('semver')
const {convert} = require('tabletojson')

const {version} = require('./package.json')


const REGEXP_ARCH = /^([ \S]+?)\s+(\d+)-bit$/
const REGEXP_CODENAME = /^([ \S]+?)\s+"([ \S]*)"$/
const REGEXP_RFC_2822_DATE =
  /^(?<day>\d{1,2})?\s*(?<month>[A-Z][a-z]{2})?\s*(?<year>\d{4})$/


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
  date = REGEXP_RFC_2822_DATE.exec(date)
  if(date === null) return

  const {day, month, year} = date.groups

  let result = year

  switch (month)
  {
    case 'Jan': result += '-01'; break
    case 'Feb': result += '-02'; break
    case 'Mar': result += '-03'; break
    case 'Apr': result += '-04'; break
    case 'May': result += '-05'; break
    case 'Jun': result += '-06'; break
    case 'Jul': result += '-07'; break
    case 'Aug': result += '-08'; break
    case 'Sep': result += '-09'; break
    case 'Oct': result += '-10'; break
    case 'Nov': result += '-11'; break
    case 'Dec': result += '-12'; break

    default: return result
  }

  if(day) return result + `-${day.padStart(2, '0')}`

  return result
}


fetchUrl('https://computing.cs.cmu.edu/desktop/os-lifecycle.html')
.then(function(html)
{
  const date = load(html)('p.sidedate').text().trim().replace(/^As of: /, '')
  const increment = parseDate(date).replace(/-/g, '.')

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
