const parse = require('csv-parse/lib/sync')
const {AbstractToJson: {fetchUrl}} = require('pagetojson')


const url = 'https://salsa.debian.org/debian/distro-info-data/-/blob/master/ubuntu.csv'


function parseData(data)
{
  return parse(data, {columns: true, relax_column_count: true})
}


exports.idField = 'series'
exports.name = 'distro-info-data/ubuntu'
exports.url = url

exports.normalize = function({version, ...lifecycle})
{
  let lts
  [version, lts] = version.split(' ')

  return {...lifecycle, lts: lts === 'LTS' || undefined, name: 'Ubuntu', version}
}

exports.scrapDate = function($)
{
  return $('time').attr('datetime')
}

exports.scrapTable = function()
{
  return fetchUrl(url.replace('blob', 'raw'))
  .then(parseData)
}
