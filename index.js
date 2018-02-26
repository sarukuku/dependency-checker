'use strict'

const utils = require('./utils.js')
const whoisDb = require('./db.js')
const argv = require('yargs').argv
const async = require('async')
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const iPadPro = devices['iPad Pro landscape'];

(async () => {
  if (!argv.url) {
    !argv.silent && console.log('You\'ll need to pass a URL.')
    return
  }

  // Open on init whois sqlite3 database.
  !argv.silent && console.log('Opening / initializing whois cache database...')
  whoisDb.openOrCreate()

  !argv.silent && console.time('Test duration')
  !argv.silent && console.log('Starting the test...')
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.emulate(iPadPro)

  let compareToOrigins = [(argv.ignoreSubdomains) ? utils.getRootDomain(argv.url) : utils.getDomain(argv.url)]
  // Push other trusted domain to the compareToOrigins array.
  if (argv.considerTrusted && argv.considerTrusted.length > 0) {
    if (!Array.isArray(argv.considerTrusted)) {
      argv.considerTrusted = [argv.considerTrusted]
    }

    argv.considerTrusted.forEach(domain => {
      compareToOrigins.push((argv.ignoreSubdomains) ? utils.getRootDomain(domain) : utils.getDomain(domain))
    })
  }

  let assets = []
  await page.setRequestInterception(true)
  page.on('request', request => {
    let requestOrigin = (argv.ignoreSubdomains) ? utils.getRootDomain(request.url()) : utils.getDomain(request.url())

    if (assets[request.resourceType()]) {
      assets[request.resourceType()].totalCount += 1
      if (compareToOrigins.includes(requestOrigin)) {
        assets[request.resourceType()].sameOriginCount += 1
      } else {
        assets[request.resourceType()].crossOriginCount += 1
      }
      assets[request.resourceType()].urls.push({
        url: request.url(),
        crossOrigin: !(compareToOrigins.includes(requestOrigin))
      })
    } else {
      assets[request.resourceType()] = {}
      assets[request.resourceType()].totalCount = 1
      if (compareToOrigins.includes(requestOrigin)) {
        assets[request.resourceType()].sameOriginCount = 1
        assets[request.resourceType()].crossOriginCount = 0
      } else {
        assets[request.resourceType()].crossOriginCount = 1
        assets[request.resourceType()].sameOriginCount = 0
      }
      assets[request.resourceType()].urls = [{
        url: request.url(),
        crossOrigin: !(compareToOrigins.includes(requestOrigin))
      }]
    }

    request.continue()
  })

  // Navigate to page
  !argv.silent && console.log('Loading page...')
  /**
   * TODO: Check if the page was redirected f.ex.
   * from hs.fi to www.hs.fi and update the domain
   * we're comparing the loaded resources to.
   */
  await page.goto(argv.url)

  // Wait for given amount in ms
  if (argv.wait) {
    !argv.silent && console.log(`Waiting for ${argv.wait}ms...`)
    await page.waitFor(argv.wait)
  }

  !argv.silent && console.log('Closing the page...')
  await browser.close()

  // If -l (=long) is set --> Collect whois data
  if (argv.l) {
    !argv.silent && console.log('Collecting whois data for cross-domains...')
    let collectedWhoisData = []
    for (let key in assets) {
      if (assets.hasOwnProperty(key)) {
        !argv.silent && console.log(`Collecting whois data of ${key} sources...`)
        await new Promise(resolve => {
          // Limit concurrent whois requests to 30
          async.mapLimit(assets[key].urls, 30, async (urlObj) => {
            let rootDomain = utils.getRootDomain(urlObj.url)

            // Fetch whois data only for cross-origins
            if (urlObj.crossOrigin && !utils.whoisDataValid(collectedWhoisData[rootDomain])) {
              let whoisData = await utils.getOwnerData(rootDomain)
              if (utils.whoisDataValid(whoisData)) {
                collectedWhoisData[rootDomain] = whoisData
              }
            }

            if (urlObj.crossOrigin) {
              urlObj.ownerData = collectedWhoisData[rootDomain]
            }
          }, (err, results) => {
            if (err) {
              !argv.silent && console.log(err)
            }
            resolve()
          })
        })
      }
    }
  }

  // Close the database as we don't need it anymore.
  whoisDb.close()

  // Log counts per resource type
  !argv.silent && console.log('Printing results...')
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
  URL: ${utils.truncate.apply(urlObj.url, [100, false])}
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
  !argv.silent && console.log('All done!')
  !argv.silent && console.timeEnd('Test duration')
})()
