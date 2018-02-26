'use strict'

const argv = require('yargs').argv
const sqlite3 = require('sqlite3').verbose()
let db

exports.openOrCreate = function () {
  db = new sqlite3.Database('whois-cache.sqlite3', initDatabase)
}

const initDatabase = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS whois (
      domain TEXT PRIMARY KEY,
      registrantName TEXT,
      registrantOrganization TEXT,
      registrantCountry TEXT
    )
  `)
}

exports.insertDomain = (whoisObj) => {
  db.run(`
    REPLACE INTO whois VALUES (
      '${whoisObj.domain}',
      '${whoisObj.registrantName}',
      '${whoisObj.registrantOrganization}',
      '${whoisObj.registrantCountry}'
    )
  `)
}

exports.readDomain = (domain) => {
  return new Promise(resolve => {
    db.get(`SELECT * FROM whois WHERE domain = '${domain}'`, (err, row) => {
      if (err) {
        !argv.silent && console.error(err.message)
      }

      resolve(row)
    })
  })
}

exports.close = () => {
  db.close()
}
