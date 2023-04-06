var db = require('../config/connection')
const bcrypt = require('bcrypt')

module.exports = {
    addNewUser: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            userDetails.password = await bcrypt.hash(userDetails.password, 10)
            db.get().collection('Users').insertOne(userDetails).then((data) => {
                userDetails._id = data.insertedId
                resolve(userDetails)
            })
        })

    },

    validateUser: (userCredentials) => {
        return new Promise(async (resolve, reject) => {
            let data = await db.get().collection('Users').findOne({ username: userCredentials.username })
            let response = {}
            if (data) {
                bcrypt.compare(userCredentials.password, data.password).then((status) => {
                    if (status) {
                        delete data.password
                        response.user = data
                        response.status = true
                        resolve(response)
                    }
                    else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    },

    imageUpload: (files, data) => {
        return new Promise(async (resolve, reject) => {
            let path = files.file[0]["path"]
            console.log(path)
            db.get().collection('Files').insertOne({
                path: path
            }).then((data) => {
                resolve({})
            })
        })

    },
    fetchImagePaths: () => {
        return new Promise(async (resolve, reject) => {
            let data = await db.get().collection('Files').find({}).toArray()
            let paths = []
            for (var i = 0; i < data.length; i++) {
                paths.push(data[i]["path"])
            }
            resolve({paths : paths})
        })

    },
}