const {Tabletojson: {convert}} = require('tabletojson')


const REGEXP_DATE =
  /(?<month>[A-Z][a-z]{2,})(?:\s+(?<day>\d{1,2}))?,?\s+(?<year>\d{4})$/


function parseDate(date)
{
  date = REGEXP_DATE.exec(date)

  const {day, month, year} = date.groups

  let result = year

  switch (month)
  {
    case 'January'  : result += '-01'; break
    case 'February' : result += '-02'; break
    case 'March'    : result += '-03'; break
    case 'April'    : result += '-04'; break
    case 'May'      : result += '-05'; break
    case 'June'     : result += '-06'; break
    case 'July'     : result += '-07'; break
    case 'August'   : result += '-08'; break
    case 'September': result += '-09'; break
    case 'October'  : result += '-10'; break
    case 'November' : result += '-11'; break
    case 'December' : result += '-12'; break

    default: return result
  }

  if(day) return result + `-${day.padStart(2, '0')}`

  return result
}


exports.idField = 'Version'
exports.name = 'Ubuntu'
exports.url = 'https://wiki.ubuntu.com/Releases'

exports.normalize = function(lifecycle)
{
  const [name, version, lts] = lifecycle['Version'].split(' ')

  return {
    codename: lifecycle['Code name'],
    eol: parseDate(lifecycle['End of Standard Support']),
    lts: lts === 'LTS' || undefined,
    name,
    release: parseDate(lifecycle['Release']),
    version
  }
}

exports.scrapDate = function($)
{
  return $('p#pageinfo').text().match(/\d{4}-\d{2}-\d{2}/)[0]
}

exports.scrapTable = function(html)
{
  const options = {useFirstRowForHeadings: true}

  return convert(html, options)[1].slice(1)
}
