#!/usr/bin/env node

const {writeFile} = require('fs').promises

const {load} = require('cheerio')
const {AbstractToJson: {fetchUrl}} = require('pagetojson')
const {convert} = require('tabletojson')


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

  lifecycle['Vendor Release Date'   ] = new Date(lifecycle['Vendor Release Date' ])
  lifecycle['Start of SCS Support'  ] = new Date(lifecycle['Start of SCS Support'])
  lifecycle['End of SCS Support'    ] = new Date(lifecycle['End of SCS Support'  ])
  lifecycle['Latest Vendor EOL Date'] = new Date(latestVendorEolDate)

  return lifecycle
}


fetchUrl('https://computing.cs.cmu.edu/desktop/os-lifecycle.html')
.then(function(html)
{
  return convert(html, {useFirstRowForHeadings: true})
  .then(function(lifecycles)
  {
    return JSON.stringify(lifecycles[1].slice(1).map(cleanData), null, 2)
  })
  .then(writeFile.bind(null, 'index.json'))
})
