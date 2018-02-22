# Third-Party Dependency Checker
A command line tool that checks your web page's dependencies, what percentage of them are cross-origin or cross-domain and who's in control of them.

## How to use
Basic test.
```
npm run start -- --url=https://example.com/
```

Wait 5000 ms after initial page load to give the page time f.ex. to lazyload scripts, styles and media.
```
npm run start -- --url=https://example.com/ --wait=5000
```

Print long output (query organizational data for cross-origins or cross-domains with native `whois` depending on the --ignore-subdomains flag).
```
npm run start -- --url=https://example.com/ -l
```

Ignore subdomains when doing the cross-origin comparison (basically the test becomes cross-domain comparison instead of cross-origin).
```
npm run start -- --url=https://example.com/ --ignore-subdomains
```

Consider other domains as same-origin or same-domain (=trusted). This helps f.ex. in cases where you know that the organization that owns the domain the test is run for also owns other domains that you don't want to appear as cross-origin or cross-domain to the dependency checker. This helps in narrowing the results down to the actual third-party organizations more easily.
```
npm run start -- --url=https://example.com/ --consider-trusted=www.other-domain.com --consider-trusted=another-domain.net
```

All of the flags above can be combined freely.