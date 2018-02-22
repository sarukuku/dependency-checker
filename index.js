'use strict'

const utils = require('./utils.js')
const argv = require('yargs').argv
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const iPadPro = devices['iPad Pro landscape'];

(async () => {
  if (!argv.url) {
    console.log('You\'ll need to pass a URL.')
    return
  }

  console.time('Test duration')
  console.log('Starting the test...')
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
  console.log('Loading page...')
  /**
   * TODO: Check if the page was redirected f.ex.
   * from hs.fi to www.hs.fi and update the domain
   * we're comparing the loaded resources to.
   */
  await page.goto(argv.url)

  // Wait for given amount in ms
  if (argv.wait) {
    console.log(`Waiting for ${argv.wait}ms...`)
    await page.waitFor(argv.wait)
  }

  console.log('Closing the page...')
  await browser.close()

  // If -l (=long) is set --> Collect whois data
  if (argv.l) {
    console.log('Collecting whois data for cross-domains...')
    let collectedWhoisData = []
    for (let key in assets) {
      if (assets.hasOwnProperty(key)) {
        console.log(`Collecting whois data of ${key} sources...`)
        for (let urlObj of assets[key].urls) {
          let rootDomain = utils.getRootDomain(urlObj.url)

          // Fetch whois data only for cross-domains
          if (urlObj.crossOrigin && !collectedWhoisData[rootDomain]) {
            collectedWhoisData[rootDomain] = await utils.getOwnerData(rootDomain)
          }

          if (urlObj.crossOrigin) {
            urlObj.ownerData = collectedWhoisData[rootDomain]
          }
        }
      }
    }
  }

  // Log counts per resource type
  console.log('Printing results...')
  await utils.sleep(2000)
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
    Registrant Name: ${urlObj.ownerData.registrantName}
    Registrant Organization: ${urlObj.ownerData.registrantOrganization}
    Registrant Country: ${urlObj.ownerData.registrantCountry}`)
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
#####################################################

Done!`)
  console.timeEnd('Test duration')
})()
