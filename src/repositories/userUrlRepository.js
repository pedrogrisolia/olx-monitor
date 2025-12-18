const { db } = require('../database/database.js')
const $logger = require('../components/Logger.js')

const createUserUrl = async (userId, url, label = null) => {
    $logger.debug('userUrlRepository: createUserUrl')

    const query = `
        INSERT INTO user_urls( userId, url, label, isActive, created )
        VALUES( ?, ?, ?, ?, ? )
    `

    const now = new Date().toISOString()

    const values = [
        userId,
        url,
        label || null,
        1,
        now
    ]

    return new Promise(function (resolve, reject) {
        db.run(query, values, function (error) {
            if (error) {
                reject(error)
                return
            }
            resolve(this.lastID)
        })
    })
}

const getUserUrls = async (userId) => {
    $logger.debug('userUrlRepository: getUserUrls')

    const query = `SELECT * FROM user_urls WHERE userId = ? ORDER BY created DESC`
    const values = [userId]

    return new Promise(function (resolve, reject) {
        db.all(query, values, function (error, rows) {
            if (error) {
                reject(error)
                return
            }

            resolve(rows || [])
        })
    })
}

const getUserUrl = async (id) => {
    $logger.debug('userUrlRepository: getUserUrl')

    const query = `SELECT * FROM user_urls WHERE id = ?`
    const values = [id]

    return new Promise(function (resolve, reject) {
        db.get(query, values, function (error, row) {
            if (error) {
                reject(error)
                return
            }

            if (!row) {
                reject('No URL with this ID was found')
                return
            }

            resolve(row)
        })
    })
}

const getAllActiveUrls = async () => {
    $logger.debug('userUrlRepository: getAllActiveUrls')

    const query = `
        SELECT uu.id, uu.userId, uu.url, uu.label, u.id as chatId
        FROM user_urls uu
        JOIN users u ON uu.userId = u.id
        WHERE uu.isActive = 1
    `

    return new Promise(function (resolve, reject) {
        db.all(query, [], function (error, rows) {
            if (error) {
                reject(error)
                return
            }

            resolve(rows || [])
        })
    })
}

const deleteUserUrl = async (id, userId) => {
    $logger.debug('userUrlRepository: deleteUserUrl')

    const query = `DELETE FROM user_urls WHERE id = ? AND userId = ?`
    const values = [id, userId]

    return new Promise(function (resolve, reject) {
        db.run(query, values, function (error) {
            if (error) {
                reject(error)
                return
            }

            if (this.changes === 0) {
                reject('URL not found or you do not have permission to delete it')
                return
            }

            resolve(true)
        })
    })
}

const urlExistsForUser = async (userId, url) => {
    $logger.debug('userUrlRepository: urlExistsForUser')

    const query = `SELECT * FROM user_urls WHERE userId = ? AND url = ?`
    const values = [userId, url]

    return new Promise(function (resolve, reject) {
        db.get(query, values, function (error, row) {
            if (error) {
                reject(error)
                return
            }

            resolve(!!row)
        })
    })
}

module.exports = {
    createUserUrl,
    getUserUrls,
    getUserUrl,
    getAllActiveUrls,
    deleteUserUrl,
    urlExistsForUser
}
