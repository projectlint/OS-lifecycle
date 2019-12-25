const all = require('./index.json')


function applyNameCodename(obj, lifecycle)
{
  obj[lifecycle['Operating System']] = lifecycle

  const {codename} = lifecycle
  if(codename) obj[codename] = lifecycle

  return obj
}

function generateConstants(all)
{
  const osFamily = {}

  for(const lifecycle of all)
  {
    const osFamilyName = lifecycle['OS Family']

    let family = osFamily[osFamilyName]
    if(!family) osFamily[osFamilyName] = family = {}

    applyNameCodename(family, lifecycle)

    if(!family.newest
    || family.newest['Vendor Release Date'] < lifecycle['Vendor Release Date'])
      family.newest = lifecycle
  }

  const result = {all}

  for(const [name, family] of Object.entries(osFamily))
  {
    result[name] = family

    for(const lifecycle of Object.values(family))
      applyNameCodename(result, lifecycle)
  }

  return result
}

function filterMaintained(lifecycle)
{
  return this > lifecycle['Vendor Release Date']
  && this < lifecycle['Latest Vendor EOL Date']
}


module.exports = exports = function(now = new Date())
{
  return generateConstants(all.filter(filterMaintained, now))
}


Object.assign(exports, generateConstants(all))
