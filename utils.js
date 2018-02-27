'use strict'

const { spawn } = require('child_process')
const argv = require('yargs').argv
const URL = require('url-parse')
const parseDomain = require('parse-domain')
const async = require('async')
const whoisDb = require('./db.js')

function getWhoisData (domain) {
  return new Promise(resolve => {
    // Spawn a new process.
    let collectedData = ''
    const whois = spawn('whois', [ domain ], {shell: '/bin/bash'})

    // Collect results to a variable.
    whois.stdout.on('data', data => {
      collectedData += data.toString()
    })

    // Reolve when the process exits.
    whois.on('close', exitCode => {
      clearTimeout(timerId)
      resolve(collectedData)
    })

    // Limit the child process execution time to 5 seconds.
    const timerId = setTimeout(() => {
      whois.kill()
      resolve(collectedData)
    }, 5000)
  })
}

function extractOwnerData (whoisData, domain) {
  // Pick only the lines we're interested in
  let lines = whoisData.split('\n').filter(line => {
    if (
      line.includes('Registrant Name') ||
      line.includes('Registrant Organization') ||
      line.includes('Registrant Country')
    ) {
      return true
    }
  })

  // Parse the data on the lines to objects
  let whoisObj = {}
  whoisObj.domain = domain
  whoisObj.registrantName = ''
  whoisObj.registrantOrganization = ''
  whoisObj.registrantCountry = ''

  lines.forEach(line => {
    let t = line.split(':')
    if (t.length > 1) {
      t.shift()
    }
    t = t.join('').trim()

    if (line.includes('Registrant Name')) {
      whoisObj.registrantName = t
    } else if (line.includes('Registrant Organization')) {
      whoisObj.registrantOrganization = t
    } else if (line.includes('Registrant Country')) {
      whoisObj.registrantCountry = t
    }
  })

  return whoisObj
}

function extractFiOwnerData (whoisData, domain) {
  // Pick only the lines we're interested in
  let lines = whoisData.split('\n').filter(line => {
    if (
      line.includes('name...............:') ||
      line.includes('country............:')
    ) {
      return true
    }
  })

  // Parse the data on the lines to objects
  let whoisObj = {}
  whoisObj.domain = domain
  whoisObj.registrantName = ''
  whoisObj.registrantOrganization = ''
  whoisObj.registrantCountry = ''

  lines.forEach(line => {
    let t = line.split(':')
    if (t.length > 1) {
      t.shift()
    }
    t = t.join('').trim()

    if (line.includes('name...............:')) {
      whoisObj.registrantName = t
    } else if (line.includes('country............:')) {
      whoisObj.registrantCountry = t
    }
  })

  return whoisObj
}

function extractJpOwnerData (whoisData, domain) {
  // Pick only the lines we're interested in
  let lines = whoisData.split('\n').filter(line => {
    if (
      line.includes('[Registrant]') ||
      line.includes('[Name]')
    ) {
      return true
    }
  })

  // Parse the data on the lines to objects
  let whoisObj = {}
  whoisObj.domain = domain
  whoisObj.registrantName = ''
  whoisObj.registrantOrganization = ''
  whoisObj.registrantCountry = ''

  lines.forEach(line => {
    let t = line.split(']')
    if (t.length > 1) {
      t.shift()
    }
    t = t.join('').trim()

    if (line.includes('[Registrant]')) {
      whoisObj.registrantOrganization = t
    } else if (line.includes('[Name]')) {
      whoisObj.registrantName = t
    }
  })

  return whoisObj
}

exports.getOwnerData = async function (domain) {
  /**
   * Check the local whois database for the
   * data before running a new whois query
   */
  let data = await whoisDb.readDomain(domain)
  if (data) {
    return data
  }

  data = await getWhoisData(domain)
  if (domain.endsWith('.fi')) {
    data = extractFiOwnerData(data, domain)
  } else if (domain.endsWith('.jp')) {
    data = extractJpOwnerData(data, domain)
  } else {
    data = extractOwnerData(data, domain)
  }

  // Save whois data to DB only if it's valid
  if (exports.whoisDataValid(data)) {
    await whoisDb.insertDomain(data)
  }

  return data
}

exports.truncate = function (n, useWordBoundary) {
  if (this.length <= n) { return this }
  var subString = this.substr(0, n - 1)
  return (useWordBoundary
     ? subString.substr(0, subString.lastIndexOf(' '))
     : subString) + '...'
}

exports.sleep = function (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

exports.getRootDomain = function (url) {
  const domainObj = parseDomain(url)

  /**
   * parseDomain returns null if given only a root
   * domain like example.com instead of www.example.com
   */
  if (!domainObj) {
    return ''
  }

  return `${domainObj.domain}.${domainObj.tld}`
}

exports.getDomain = function (url) {
  return new URL(url).origin
}

exports.whoisDataValid = function (whoisObj) {
  if (
    whoisObj && (
      whoisObj.registrantName ||
      whoisObj.registrantOrganization ||
      whoisObj.registrantCountry
    )
  ) {
    return true
  }

  return false
}

exports.printResultsToConsole = data => {
  for (let key in data.resources) {
    if (data.resources.hasOwnProperty(key)) {
      console.log(`
Resource type: ${key}
Total: ${data.resources[key].totalCount}
Same origin: ${data.resources[key].sameOriginCount}
Cross-origin: ${data.resources[key].crossOriginCount}
Cross-origin percentage: ${data.resources[key].crossOriginPercentage}%`)
      if (argv.l && data.resources[key].crossOriginCount) {
        console.log(`Cross origin resources:`)
        data.resources[key].requests.forEach(requestObj => {
          if (requestObj.crossOrigin) {
            console.log(`
  URL: ${exports.truncate.apply(requestObj.url, [100, false])}
  Owner data:
    Registrant Name: ${(requestObj.whoisData && requestObj.whoisData.registrantName) ? requestObj.whoisData.registrantName : ''}
    Registrant Organization: ${(requestObj.whoisData && requestObj.whoisData.registrantOrganization) ? requestObj.whoisData.registrantOrganization : ''}
    Registrant Country: ${(requestObj.whoisData && requestObj.whoisData.registrantCountry) ? requestObj.whoisData.registrantCountry : ''}`)
          }
        })
      }
    }
  }
  console.log(`
#####################################################
Total requests: ${data.totalRequests}
Total ${argv.ignoreSubdomains ? 'same root domain' : 'same domain'} requests: ${data.totalSameOriginRequests}
Total ${argv.ignoreSubdomains ? 'cross-domain' : 'cross-origin'} requests: ${data.totalCrossOriginRequests}
Total ${argv.ignoreSubdomains ? 'cross-domain' : 'cross-origin'} percentage: ${data.crossOriginPercentage}%
#####################################################`)
}

exports.printResultsAsJson = data => {
  console.log(JSON.stringify(data))
}

exports.analyzeData = (data, compareToOrigins) => {
  // Add new properties to data
  data.totalRequests = 0
  data.totalSameOriginRequests = 0
  data.totalCrossOriginRequests = 0
  data.crossOriginPercentage = null

  // For each resource type
  for (let resourceType in data.resources) {
    // Add new properties to resource type
    data.resources[resourceType].totalCount = 0
    data.resources[resourceType].sameOriginCount = 0
    data.resources[resourceType].crossOriginCount = 0
    data.resources[resourceType].crossOriginPercentage = null

    // Loop over all requests on it
    data.resources[resourceType].requests.forEach(request => {
      let requestOrigin = (argv.ignoreSubdomains) ? exports.getRootDomain(request.url) : exports.getDomain(request.url)

      // Total count for single resource type
      data.resources[resourceType].totalCount += 1

      // Total counts for same-origin and cross-origin for single resource type
      if (compareToOrigins.includes(requestOrigin)) {
        data.resources[resourceType].sameOriginCount += 1
      } else {
        data.resources[resourceType].crossOriginCount += 1
      }

      // Mark each request as either cross-origin or not
      request.crossOrigin = !(compareToOrigins.includes(requestOrigin))
    })

    // Calculate cross-origin percentage per resource type
    data.resources[resourceType].crossOriginPercentage = parseFloat(
      (data.resources[resourceType].crossOriginCount / data.resources[resourceType].totalCount * 100).toFixed(2)
    )

    // Count totals for all resources
    data.totalRequests += data.resources[resourceType].totalCount
    data.totalSameOriginRequests += data.resources[resourceType].sameOriginCount
    data.totalCrossOriginRequests += data.resources[resourceType].crossOriginCount
  }

  // Calculate cross-origin percentage for whole data
  data.crossOriginPercentage = parseFloat(
    (data.totalCrossOriginRequests / data.totalRequests * 100).toFixed(2)
  )

  return data
}

exports.log = message => {
  !argv.silent && console.log(message)
}

exports.startTime = id => {
  !argv.silent && console.time(id)
}

exports.endTime = id => {
  !argv.silent && console.timeEnd(id)
}

exports.collectWhoisData = async data => {
  let collectedWhoisData = []
  for (let key in data.resources) {
    exports.log(`Collecting whois data of ${key} sources...`)
    await new Promise(resolve => {
      // Limit concurrent whois queries to 30
      async.mapLimit(data.resources[key].requests, 30, async (requestObj) => {
        let rootDomain = exports.getRootDomain(requestObj.url)

        // Fetch whois data only for cross-origins
        if (requestObj.crossOrigin && !exports.whoisDataValid(collectedWhoisData[rootDomain])) {
          let whoisData = await exports.getOwnerData(rootDomain)
          if (exports.whoisDataValid(whoisData)) {
            collectedWhoisData[rootDomain] = whoisData
          }
        }

        if (requestObj.crossOrigin) {
          requestObj.whoisData = collectedWhoisData[rootDomain]
        }
      }, (err, results) => {
        if (err) {
          exports.log(err)
        }
        resolve()
      })
    })
  }

  return data
}
