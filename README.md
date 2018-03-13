# Third-Party Dependency Checker
A command line tool that checks your web page's dependencies, what percentage of them are cross-origin or cross-domain and who's in control of them.

## How to install
Clone or download the repository and run `yarn` in it.

## Dependencies
The app has been tested on macOS High Sierra and Ubuntu 17.10. It has the followind dependencies:
- availability of `/bin/bash`
- availability of `yarn` command on `/bin/bash`
- availability of `whois`command on `/bin/bash` 
- node version >= 9.3.0
- a good network connection

If you're running this on Ubuntu puppeteer requires a few dependencies. More of them can be read from [here](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md).

## How to use
Basic test.
```
yarn start --url=https://example.com/
```

Follow redirects. By default the URL you give will be used in the cross-origin or cross-domain comparisons as is. A lot of domains have redirects in place that look f.ex. like this `http://example.com` -> `https://www.example.com`. This means that all resources the page donwloads from `www.example.com` are considered cross-origin as you told to compare exactly to `example.com`. By setting the `--follow-redirects` flag the comparison URL will be automatically updated to the URL the initial document was downloaded from.
```
yarn start --url=https://example.com/ --follow-redirects
```

Wait 5000 ms after initial page load to give the page time f.ex. to lazyload scripts, styles and media.
```
yarn start --url=https://example.com/ --wait=5000
```

Print long output (query organizational data for cross-origins or cross-domains with native `whois` depending on the --ignore-subdomains flag).
```
yarn start --url=https://example.com/ -l
```

Ignore subdomains when doing the cross-origin comparison (basically the test becomes cross-domain comparison instead of cross-origin).
```
yarn start --url=https://example.com/ --ignore-subdomains
```

Consider other domains as same-origin or same-domain (=trusted). This helps f.ex. in cases where you know that the organization that owns the domain the test is run for also owns other domains that you don't want to appear as cross-origin or cross-domain to the dependency checker. This helps in narrowing the results down to the actual third-party organizations more easily.
```
yarn start --url=https://example.com/ --consider-trusted=www.other-domain.com --consider-trusted=another-domain.net
```

Silent or quiet mode. Don't show progress or error messages. Makes Third-Party Dependency Checker mute. It will still output the data you ask for, potentially even to the terminal/stdout unless you redirect it.

As the commands are run with `yarn` to achieve a "total silent" mode you'll need to make `yarn` silent too. That can be done like this `yarn --silent`. 
```
yarn start --silent
```

Set the data output format. Available formats are print to console (which is the default) and JSON string that can be turned on by setting the `--output` handle value to `json`.
```
yarn start --output=json
```

All of the flags above can be combined freely.

## Example output of basic test
```
$ npm run start -- --url=https://bond-agency.com/ -l

> @ start /dependency-checker
> node index.js "--url=https://bond-agency.com/" "-l"

Starting the test...
Loading page...
Closing the page...
Collecting whois data for cross-domains...
Collecting whois data of document sources...
Collecting whois data of stylesheet sources...
Collecting whois data of script sources...
Collecting whois data of image sources...
Collecting whois data of font sources...
Printing results...

Resource type: document
Total: 1
Same origin: 1
Cross-origin: 0
Cross-origin percentage: 0.00%

Resource type: stylesheet
Total: 3
Same origin: 3
Cross-origin: 0
Cross-origin percentage: 0.00%

Resource type: script
Total: 7
Same origin: 4
Cross-origin: 3
Cross-origin percentage: 42.86%
Cross origin resources:

  URL: https://code.jquery.com/jquery-2.2.0.min.js
  Owner data:
    Registrant Name:
    Registrant Organization:
    Registrant Country:

  URL: https://www.googletagmanager.com/gtm.js?id=GTM-5M8X4L8
  Owner data:
    Registrant Name: DNS Admin
    Registrant Organization: Google Inc.
    Registrant Country: US

  URL: https://www.google-analytics.com/analytics.js
  Owner data:
    Registrant Name: Domain Administrator
    Registrant Organization: Google LLC
    Registrant Country: US

Resource type: image
Total: 19
Same origin: 17
Cross-origin: 2
Cross-origin percentage: 10.53%
Cross origin resources:

  URL: https://www.google-analytics.com/r/collect?v=1&_v=j66&a=336758200&t=pageview&_s=1&dl=https%3A%2F%2F...
  Owner data:
    Registrant Name: Domain Administrator
    Registrant Organization: Google LLC
    Registrant Country: US

  URL: https://stats.g.doubleclick.net/r/collect?v=1&aip=1&t=dc&_r=3&tid=UA-23096829-1&cid=1531247133.1519...
  Owner data:
    Registrant Name:
    Registrant Organization:
    Registrant Country:

Resource type: font
Total: 4
Same origin: 4
Cross-origin: 0
Cross-origin percentage: 0.00%

#####################################################
Total requests: 34
Total same domain requests: 29
Total cross-origin requests: 5
Total cross-origin percentage: 14.71%
#####################################################

Done!
Test duration: 30677.906ms
```

## Example JSON output of basic test
The actual output isn't pretty printed but here it is for better readability.

Command:
```bash
yarn --silent start --url=https://bond-agency.com/ -l --silent --output=json
```

Output:
```json
{
  "requests": {
    "document": {
      "totalCount": 1,
      "sameOriginCount": 1,
      "crossOriginCount": 0,
      "urls": [
        {
          "url": "https:\/\/bond-agency.com\/",
          "crossOrigin": false
        }
      ],
      "crossOriginPercentage": "0.00"
    },
    "stylesheet": {
      "totalCount": 3,
      "sameOriginCount": 3,
      "crossOriginCount": 0,
      "urls": [
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/plugins\/google-captcha\/css\/gglcptch.css",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/css\/style.css",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/fonts\/fonts.css",
          "crossOrigin": false
        }
      ],
      "crossOriginPercentage": "0.00"
    },
    "script": {
      "totalCount": 7,
      "sameOriginCount": 4,
      "crossOriginCount": 3,
      "urls": [
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/js\/libs\/min\/modernizr-3.3.1-min.js",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/js\/libs\/jquery-fallback.js",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/js\/dist\/plugins.js",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/js\/dist\/main.js",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/code.jquery.com\/jquery-2.2.0.min.js",
          "crossOrigin": true,
          "ownerData": {
            "domain": "jquery.com",
            "registrantName": "Kris Borchers",
            "registrantOrganization": "JS Foundation",
            "registrantCountry": "US"
          }
        },
        {
          "url": "https:\/\/www.googletagmanager.com\/gtm.js?id=GTM-5M8X4L8",
          "crossOrigin": true,
          "ownerData": {
            "domain": "googletagmanager.com",
            "registrantName": "DNS Admin",
            "registrantOrganization": "Google Inc.",
            "registrantCountry": "US"
          }
        },
        {
          "url": "https:\/\/www.google-analytics.com\/analytics.js",
          "crossOrigin": true,
          "ownerData": {
            "domain": "google-analytics.com",
            "registrantName": "Domain Administrator",
            "registrantOrganization": "Google LLC",
            "registrantCountry": "US"
          }
        }
      ],
      "crossOriginPercentage": "42.86"
    },
    "image": {
      "totalCount": 12,
      "sameOriginCount": 10,
      "crossOriginCount": 2,
      "urls": [
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2017\/10\/914f07bc-bond_loupedeck_main-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2018\/02\/8cf80790-dm_02-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2017\/10\/961107d8-m_001b_mini-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2018\/02\/944807c0-dm_03-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2018\/02\/8d44079a-woolmark_01-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2018\/01\/8dc007a5-flow_case_vertical-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2018\/01\/954107b3-kape_book_photo_03-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2017\/11\/8ebe0797-bond-helsinki_senior-creative-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2017\/10\/8e7c07aa-m_001c-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/uploads\/2016\/12\/eero_aarnio_originals_bond-480x300.jpg",
          "crossOrigin": false
        },
        {
          "url": "https:\/\/www.google-analytics.com\/r\/collect?v=1&_v=j66&a=147661730&t=pageview&_s=1&dl=https%3A%2F%2Fbond-agency.com%2F&ul=en-us&de=UTF-8&dt=BOND&sd=24-bit&sr=1366x1024&vp=1366x1024&je=0&_u=YEBAAAAB~&jid=1106132092&gjid=1444640964&cid=752906807.1519662423&tid=UA-23096829-1&_gid=1990809932.1519662423&_r=1&gtm=G2l5M8X4L8&z=1398644255",
          "crossOrigin": true,
          "ownerData": {
            "domain": "google-analytics.com",
            "registrantName": "Domain Administrator",
            "registrantOrganization": "Google LLC",
            "registrantCountry": "US"
          }
        },
        {
          "url": "https:\/\/stats.g.doubleclick.net\/r\/collect?v=1&aip=1&t=dc&_r=3&tid=UA-23096829-1&cid=752906807.1519662423&jid=1106132092&_gid=1990809932.1519662423&gjid=1444640964&_v=j66&z=1398644255",
          "crossOrigin": true,
          "ownerData": {
            "domain": "doubleclick.net",
            "registrantName": "DNS Admin",
            "registrantOrganization": "Google Inc.",
            "registrantCountry": "US"
          }
        }
      ],
      "crossOriginPercentage": "16.67"
    },
    "font": {
      "totalCount": 1,
      "sameOriginCount": 1,
      "crossOriginCount": 0,
      "urls": [
        {
          "url": "https:\/\/bond-agency.com\/wp-content\/themes\/bond\/library\/fonts\/bond-icons\/fonts\/icomoon.woff?-95ud60",
          "crossOrigin": false
        }
      ],
      "crossOriginPercentage": "0.00"
    }
  },
  "totalRequests": 24,
  "totalSameOriginRequests": 19,
  "totalCrossOriginRequests": 5,
  "crossOriginPercentage": "20.83"
}
```

## Miscellaneous notes

The app caches succesfully parsed whois query results in a persistent sqlite3 database. To clear the cache simply delete the file named `whois-cache.sqlite3` from the repository root.