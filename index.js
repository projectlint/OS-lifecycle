const all = require('./index.json')


function applyCodename(obj, lifecycle)
{
  const {codename} = lifecycle
  if(codename
  && (!obj[codename] || obj[codename].release < lifecycle.release))
    obj[codename] = lifecycle

  return obj
}

function generateConstants(all)
{
  const osFamily = {}

  for(const lifecycle of all)
  {
    const osFamilyName = lifecycle.name

    let family = osFamily[osFamilyName]
    if(!family) osFamily[osFamilyName] = family = {}

    family[lifecycle.version] = lifecycle

    applyCodename(family, lifecycle)

    if(!family.newest
    || (osFamilyName === 'Ubuntu'
        && family.newest.version.substr(0, 5) < lifecycle.version.substr(0, 5))
    || (osFamilyName !== 'Ubuntu'
        && family.newest.release < lifecycle.release))
      family.newest = lifecycle
  }

  const result = {all}

  for(const [name, family] of Object.entries(osFamily))
  {
    result[name] = family

    for(const lifecycle of Object.values(family))
      applyCodename(result, lifecycle)
  }

  return result
}

function filterMaintained({eol, release})
{
  return new Date(release) < this && this < new Date(eol)
}


module.exports = exports = function(now = new Date())
{
  return generateConstants(all.filter(filterMaintained, now))
}


Object.assign(exports, generateConstants(all))
