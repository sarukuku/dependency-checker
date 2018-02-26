# Third-Party Dependency Checker
A command line tool that checks your web page's dependencies, what percentage of them are cross-origin or cross-domain and who's in control of them.

## How to install
Clone or download the repository and run `yarn` in it.

## Dependencies
The app has been tested only on a macOS High Sierra and has the followind dependencies:
- availability of `/bin/bash`
- availability of `yarn` command on `/bin/bash`
- availability of `whois`command on `/bin/bash` 
- node version >= 9.3.0
- a good network connection

## How to use
Basic test.
```
yarn start --url=https://example.com/
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
```
yarn start --silent
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

## Miscellaneous notes

The app caches succesfully parsed whois query results in a persistent sqlite3 database. To clear the cache simply delete the file named `whois-cache.sqlite3` from the repository root.