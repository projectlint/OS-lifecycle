const {Tabletojson: {convert}} = require('tabletojson')


const REGEXP_ARCH = /^([ \S]+?)\s+(\d+)-bit$/
const REGEXP_CODENAME = /^([ \S]+?)\s+"([ \S]*)"$/
const REGEXP_RFC_2822_DATE =
  /^(?<day>\d{1,2})?\s*(?<month>[A-Z][a-z]{2})?\s*(?<year>\d{4})$/


function parseDate(date)
{
  date = REGEXP_RFC_2822_DATE.exec(date)

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


exports.idField = 'Operating System'
exports.name = 'OS lifecycle'
exports.url = 'https://computing.cs.cmu.edu/desktop/os-lifecycle.html'

exports.normalize = function(lifecycle)
{
  let operatingSystem = lifecycle['Operating System']
  .replace(/\s*upgrade note$/, '')

  let matches = operatingSystem.match(REGEXP_ARCH)
  if(matches && matches.length === 3)
    operatingSystem = matches[1]

  let codename
  matches = operatingSystem.match(REGEXP_CODENAME)
  if(matches && matches.length === 3)
  {
    operatingSystem = matches[1]
    codename = matches[2]
  }

  let [name, version, version2, version3] = lifecycle['Operating System']
  .split('\n')[0].split(' ')

  switch(name)
  {
    case 'macOS':
      codename = version2 ? `${version} ${version2}` : version
      version = lifecycle['Latest Update or Service Pack']
    break

    case 'OS':
      codename = version3 ? `${version2} ${version3}` : version2
      name = 'macOS'
      version = lifecycle['Latest Update or Service Pack']
    break

    case 'Windows':
    {
      switch(version)
      {
        case '8':
          version = ''
        break

        case '10':
          version = `${version}.`
        break

        case 'Server':
          name = lifecycle['OS Family']

          version = version2 === '2016' ? version2 : `${version2} `
        break

        default:
          version = `${version} `
        break
      }

      version += lifecycle['Latest Update or Service Pack']
    }
    break
  }

  // Apple does not publish official EOL dates, but typically provides security
  // updates for the current release of macOS, as well as the previous two
  // releases.
  const latestVendorEolDate = lifecycle['Latest Vendor EOL Date'].split('\n')[0]
  .replace(/^~/, '').replace(/see note$/, '')

  return {
    codename,
    eol: parseDate(latestVendorEolDate),
    name,
    release: parseDate(lifecycle['Vendor Release Date']),
    version
  }
}

exports.scrapDate = function($)
{
  return parseDate($('p.sidedate').text().trim().replace(/^As of: /, ''))
}

exports.scrapTable = function(html)
{
  const options = {useFirstRowForHeadings: true}

  return convert(html, options)[1].slice(1)
}
