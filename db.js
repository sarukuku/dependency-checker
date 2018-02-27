'use strict'

const argv = require('yargs').argv
const sqlite3 = require('sqlite3').verbose()
let db

exports.openOrCreate = async () => {
  return new Promise(resolve => {
    db = new sqlite3.Database('whois-cache.sqlite3', async () => {
      await initDatabase()
      resolve()
    })
  })
}

const initDatabase = async () => {
  return new Promise(resolve => {
    return db.run(`
      CREATE TABLE IF NOT EXISTS whois (
        domain TEXT PRIMARY KEY,
        registrantName TEXT,
        registrantOrganization TEXT,
        registrantCountry TEXT
      )
    `, () => {
      resolve()
    })
  })
}

exports.insertDomain = async whoisObj => {
  return new Promise(resolve => {
    let statement = db.prepare('REPLACE INTO whois VALUES (?,?,?,?)')

    statement.run(
      whoisObj.domain,
      whoisObj.registrantName,
      whoisObj.registrantOrganization,
      whoisObj.registrantCountry
    )

    statement.finalize(() => {
      resolve()
    })
  })
}

exports.readDomain = domain => {
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
