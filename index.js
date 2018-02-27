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
    utils.log('You\'ll need to pass a URL.')
    return
  }

  // Open on init whois sqlite3 database.
  utils.log('Opening / initializing whois cache database...')
  whoisDb.openOrCreate()

  utils.startTime('Test duration')
  utils.log('Starting the test...')
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.emulate(iPadPro)

  // Initialize the object that will hold all data
  let data = { resources: {} }
  await page.setRequestInterception(true)
  page.on('request', request => {
    // Save request data and group the requests by type.
    if (data.resources[request.resourceType()]) {
      data.resources[request.resourceType()].requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      })
    } else {
      data.resources[request.resourceType()] = {}
      data.resources[request.resourceType()].requests = [{
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      }]
    }

    // Allow the request to continue.
    request.continue()
  })

  // Navigate to page
  utils.log('Loading page...')
  await page.goto(argv.url)

  // Wait for given amount in ms
  if (argv.wait) {
    utils.log(`Waiting for ${argv.wait}ms...`)
    await page.waitFor(argv.wait)
  }

  // Grab the URL we ended up in (due to possible redirects)
  const finalUrl = await page.url()
  utils.log(`URL given as a parameter: ${argv.url} Document downloaded from URL: ${finalUrl}`)

  // Close the page
  utils.log('Closing the page...')
  await browser.close()

  // Figure out the compare to origins
  let compareToUrl = (argv.followRedirects) ? finalUrl : argv.url
  let compareToOrigins = [(argv.ignoreSubdomains) ? utils.getRootDomain(compareToUrl) : utils.getDomain(compareToUrl)]

  // Push other trusted domains to the compareToOrigins array (if any).
  if (argv.considerTrusted && argv.considerTrusted.length > 0) {
    // Make it an array even if there's only one value passed.
    if (!Array.isArray(argv.considerTrusted)) {
      argv.considerTrusted = [argv.considerTrusted]
    }
    // Handle all domains in the array.
    argv.considerTrusted.forEach(domain => {
      compareToOrigins.push((argv.ignoreSubdomains) ? utils.getRootDomain(domain) : utils.getDomain(domain))
    })
  }

  // Analyze (=enrich) the gathered data a bit.
  data = utils.analyzeData(data, compareToOrigins)

  // If -l (=long) is set --> Collect whois data
  if (argv.l) {
    utils.log('Collecting whois data for cross-domains...')
    let collectedWhoisData = []
    for (let key in data.resources) {
      if (data.resources.hasOwnProperty(key)) {
        utils.log(`Collecting whois data of ${key} sources...`)
        await new Promise(resolve => {
          // Limit concurrent whois data.resources to 30
          async.mapLimit(data.resources[key].requests, 30, async (urlObj) => {
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
              utils.log(err)
            }
            resolve()
          })
        })
      }
    }
  }

  // Close the database as we don't need it anymore.
  whoisDb.close()

  // Print results to stdout based on selected output.
  utils.log('Printing results...')
  if (argv.output === 'json') {
    utils.printResultsAsJson(data)
  } else {
    utils.printResultsToConsole(data)
  }

  // End the test.
  utils.log('All done!')
  utils.endTime('Test duration')
})()
