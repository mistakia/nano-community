import fs from 'fs'
import csv from 'csv-parser'

const read_csv = (filepath, options = {}) =>
  new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filepath)
      .pipe(csv(options))
      .on('data', (data) => results.push(data))
      .on('error', (error) => resolve(error))
      .on('end', () => resolve(results))
  })

export default read_csv
