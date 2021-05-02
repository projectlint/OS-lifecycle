const parse = require('csv-parse/lib/sync')


function parseData(data)
{
  return parse(data, {columns: true, relax_column_count: true})
}

function parseDate(date)
{
  date = new Date(date)

  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}


exports.idField = 'series'
exports.name = 'distro-info-data/debian'
exports.url = 'https://debian.pages.debian.net/distro-info-data/debian.csv'

exports.normalize = function({version, ...lifecycle})
{
  if(version === '') version = undefined

  return {...lifecycle, name: 'Debian', version}
}

exports.scrap = function({body, response: {headers}})
{
  return {
    date: parseDate(headers['last-modified']),
    table: parseData(body)
  }
}
