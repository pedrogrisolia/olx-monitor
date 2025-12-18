const { db } = require('../database/database.js')
const $logger = require('../components/Logger.js')

const createUser = async (user) => {
    $logger.debug('userRepository: createUser')

    const query = `
        INSERT INTO users( id, username, firstName, lastName, created )
        VALUES( ?, ?, ?, ?, ? )
    `

    const now = new Date().toISOString()

    const values = [
        user.id,
        user.username || null,
        user.firstName || null,
        user.lastName || null,
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

const getUser = async (id) => {
    $logger.debug('userRepository: getUser')

    const query = `SELECT * FROM users WHERE id = ?`
    const values = [id]

    return new Promise(function (resolve, reject) {
        db.get(query, values, function (error, row) {
            if (error) {
                reject(error)
                return
            }

            if (!row) {
                reject('No user with this ID was found')
                return
            }

            resolve(row)
        })
    })
}

const getAllUsers = async () => {
    $logger.debug('userRepository: getAllUsers')

    const query = `SELECT * FROM users`

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

const userExists = async (id) => {
    $logger.debug('userRepository: userExists')

    try {
        await getUser(id)
        return true
    } catch (error) {
        return false
    }
}

module.exports = {
    createUser,
    getUser,
    getAllUsers,
    userExists
}
