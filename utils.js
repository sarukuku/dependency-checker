'use strict'

const { spawn } = require('child_process')
const argv = require('yargs').argv
const URL = require('url-parse')
const parseDomain = require('parse-domain')
const whoisDb = require('./db.js')

function getWhoisData (domain) {
  return new Promise(resolve => {
    // Spawn a new process.
    let collectedData = ''
    const whois = spawn('whois', [ '-R', domain ], {shell: '/bin/bash'})

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
    whoisDb.insertDomain(data)
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

exports.printResultsToConsole = assets => {
  let totalRequests = 0
  let totalSameOriginRequests = 0
  let totalCrossOriginRequests = 0
  for (let key in assets) {
    if (assets.hasOwnProperty(key)) {
      totalRequests += assets[key].totalCount
      totalSameOriginRequests += assets[key].sameOriginCount
      totalCrossOriginRequests += assets[key].crossOriginCount
      console.log(`
Resource type: ${key}
Total: ${assets[key].totalCount}
Same origin: ${assets[key].sameOriginCount}
Cross-origin: ${assets[key].crossOriginCount}
Cross-origin percentage: ${(assets[key].crossOriginCount / assets[key].totalCount * 100).toFixed(2)}%`)
      if (argv.l && assets[key].crossOriginCount) {
        console.log(`Cross origin resources:`)
        assets[key].urls.forEach(urlObj => {
          if (urlObj.crossOrigin) {
            console.log(`
  URL: ${exports.truncate.apply(urlObj.url, [100, false])}
  Owner data:
    Registrant Name: ${(urlObj.ownerData && urlObj.ownerData.registrantName) ? urlObj.ownerData.registrantName : ''}
    Registrant Organization: ${(urlObj.ownerData && urlObj.ownerData.registrantOrganization) ? urlObj.ownerData.registrantOrganization : ''}
    Registrant Country: ${(urlObj.ownerData && urlObj.ownerData.registrantCountry) ? urlObj.ownerData.registrantCountry : ''}`)
          }
        })
      }
    }
  }
  console.log(`
#####################################################
Total requests: ${totalRequests}
Total ${argv.ignoreSubdomains ? 'same root domain' : 'same domain'} requests: ${totalSameOriginRequests}
Total ${argv.ignoreSubdomains ? 'cross-domain' : 'cross-origin'} requests: ${totalCrossOriginRequests}
Total ${argv.ignoreSubdomains ? 'cross-domain' : 'cross-origin'} percentage: ${(totalCrossOriginRequests / totalRequests * 100).toFixed(2)}%
#####################################################`)
}

exports.printResultsAsJson = assets => {
  let data = {
    requests: {},
    totalRequests: 0,
    totalSameOriginRequests: 0,
    totalCrossOriginRequests: 0,
    crossOriginPercentage: null
  }

  for (let key in assets) {
    data.totalRequests += assets[key].totalCount
    data.totalSameOriginRequests += assets[key].sameOriginCount
    data.totalCrossOriginRequests += assets[key].crossOriginCount
    assets[key].crossOriginPercentage = (assets[key].crossOriginCount / assets[key].totalCount * 100).toFixed(2)
    data.requests[key] = assets[key]
  }

  data.crossOriginPercentage = (data.totalCrossOriginRequests / data.totalRequests * 100).toFixed(2)

  console.log(JSON.stringify(data))
}
