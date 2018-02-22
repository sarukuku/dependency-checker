'use strict'

const { spawn } = require('child_process')
const URL = require('url-parse')
const parseDomain = require('parse-domain')

function getWhoisData (domain) {
  return new Promise(resolve => {
    const whois = spawn('whois', [ '-R', domain ])
    whois.stdout.on('data', data => {
      resolve(data.toString())
    })
  })
}

function extractOwnerData (whoisData) {
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

function extractFiOwnerData (whoisData) {
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

exports.getOwnerData = async function (domain) {
  let data = await getWhoisData(domain)
  if (domain.endsWith('.fi')) {
    return extractFiOwnerData(data)
  } else {
    return extractOwnerData(data)
  }
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
