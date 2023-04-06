var db = require('../config/connection')
var ObjectId = require('mongodb').ObjectId;
module.exports = {
    displayReport: (semester) => {
        return new Promise(async (resolve, reject) => {
            if(semester==""){
                let data = await db.get().collection('Forms').find({}).toArray()
                resolve(data)
            }
            else{
                semester = parseInt(semester)
                let data = await db.get().collection('Forms').find({semester:semester}).toArray()
                resolve(data)
            }
        })
    },

    displayCoordinatorReport: (semester,degree) => {
        return new Promise(async (resolve, reject) => {
            if(semester==""){
                let data = await db.get().collection('Forms').find({degree:degree}).toArray()
                resolve(data)
            }
            else{
                semester = parseInt(semester)
                let data = await db.get().collection('Forms').find({semester:semester,degree:degree}).toArray()
                resolve(data)
            }
        })
    },

    displayAdminHomeReport: () => {
        return new Promise(async (resolve, reject) => {
            let semesterQuerry = await db.get().collection('globalVariables').find({use:"semester"}).toArray()
            let semester = semesterQuerry[0]["currentSemester"]
            let data = await db.get().collection('Forms').find({semester:semester}).toArray()
            resolve(data)
        })
    },

    displayDetailReport: (id) => {
        return new Promise(async (resolve, reject) => {
            let reqCourse = await db.get().collection('Forms').findOne({ _id: new ObjectId(id) })
            let facultyEmail =  await db.get().collection('Users').findOne({ facultyId: reqCourse.facultyId })
            reqCourse["facultyEmail"] = facultyEmail.email
            resolve(reqCourse)
        })
    },

    displayFacultyCourse: (data) => {
        return new Promise(async (resolve, reject) => {
            let facultyCourses = await db.get().collection('Forms').find({ facultyId: data }).toArray()
            resolve(facultyCourses)
        })
    },

    displayCoordinatorCourse: (degree) => {
        return new Promise(async (resolve, reject) => {
            let coordinatorCourses = await db.get().collection('Forms').find({ degree: degree }).toArray()
            resolve(coordinatorCourses)
        })
    },

    displayFacultyConfirmationPending: (id) => {
        return new Promise(async (resolve, reject) => {
            let tempCourses = await db.get().collection('Forms').find({ facultyId: id }).toArray()
            pendingCourses = []
            for (var i = 0; i < tempCourses.length; i++) {
                let temp = tempCourses[i]["individualStatus"]
                let keys = Object.keys(temp)
                for (var j = 0; j < keys.length; j++) {
                    if (temp[keys[j]] == "pending") {
                        pendingCourses.push(tempCourses[i])
                        break
                    }
                }
            }
            let courses = await db.get().collection('Forms').find({ facultyId: id }).toArray()
            resolve({ pendingCourses: pendingCourses, rawCourses: courses })
        })
    },

    updateStatus: (data) => {
        if (data.confirm == 'true') {
            let temp = "individualStatus." + data.key
            let confirmedTimestamp = "confirmedTimestamp." + data.key
            return new Promise(async (resolve, reject) => {
                let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(data.id) }, { projection: { totalCompletedRenderedSeconds: 1, _id: 0 } }).toArray()
                let oldSeconds = parseInt(tempData[0]["totalCompletedRenderedSeconds"])
                let newSeconds = parseInt(data.sec)
                var quotient = Math.floor((oldSeconds + newSeconds) / 60);
                var remainder = (oldSeconds + newSeconds) % 60
                let flag = await db.get().collection('Forms').updateOne({ _id: new ObjectId(data.id) }, {
                    $set: {
                        totalCompletedRenderedSeconds: remainder,
                        [temp]: "confirmed",
                        [confirmedTimestamp]: timestamp()
                    },
                    $inc: {
                        totalCompletedRenderedMinutes: parseInt(data.mins) + quotient,
                    }
                })
                resolve(flag)
            })
        } else {
            let status = "individualStatus." + data.key
            let key = "statusDenied." + data.key
            let insertionData = {
                "feedback": data.feedback,
                "cuts": data.cuts,
                "edits": data.edits,
                "timestamp": timestamp()
            }
            return new Promise(async (resolve, reject) => {
                let flag = await db.get().collection('Forms').updateOne({ _id: new ObjectId(data.id) }, {
                    $set: {
                        [status]: "denied",
                        [key]: insertionData
                    }
                })
                resolve(flag)
            })
        }

    },

    updateDeniedResolveStatus: (id, key,details) => {
        let temp = "individualStatus." + key
        let temp1 = "statusDenied." + key
        let postDetailsPath = "postTopicsCompleted." + key 
        details["timestamp"] = timestamp()
        return new Promise(async (resolve, reject) => {
            let course = await db.get().collection('Forms').find({ _id: new ObjectId(id) }).toArray()
            let roughCut = course[0]["postTopicsCompleted"][key]

            let currentDBPostMin = parseInt(course[0]["postCompletedMinutes"])
            let currentDBPostSec = parseInt(course[0]["postCompletedSeconds"])
            let roughCutMin = parseInt(roughCut["duration"].split(":")[0])
            let roughCutSec = parseInt(roughCut["duration"].split(":")[1])
            let newMin = parseInt(details["duration"].split(":")[0])
            let newSec = parseInt(details["duration"].split(":")[1])
            let diffMin = newMin - roughCutMin
            let diffSec = newSec - roughCutSec
            let newDBPostMin = currentDBPostMin + diffMin
            let newDBPostSec = currentDBPostSec + diffSec
            if(newDBPostSec < 0){
                newDBPostMin--
                newDBPostSec = 60 + newDBPostSec
            }

            let generalPostTopicsHistoryPath = "postTopicsHistory." + key
            let postTopicHistory = course[0]["postTopicsHistory"][key]
            if(postTopicHistory){
                let cutCount = postTopicHistory["count"]
                cutCount++
                let postTopicsHistoryPath = generalPostTopicsHistoryPath + "." + cutCount
                let postTopicsRoughCountHistoryPath = generalPostTopicsHistoryPath + ".count"
                let set = await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        postCompletedMinutes : newDBPostMin,
                        postCompletedSeconds : newDBPostSec, 
                        [temp]: "pending",
                        [postDetailsPath]: details,
                        [postTopicsHistoryPath]: roughCut,
                        [postTopicsRoughCountHistoryPath]: cutCount
                    }
                })
            }
            else{
                let data = {1:roughCut, count:1}
                let set = await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        postCompletedMinutes : newDBPostMin,
                        postCompletedSeconds : newDBPostSec, 
                        [temp]: "pending",
                        [postDetailsPath]: details,
                        [generalPostTopicsHistoryPath]: data
                    }
                })
            }
            let alreadyHistoryExist = course[0]["deniedHistory"][key]
            if (alreadyHistoryExist) {
                let count = parseInt(alreadyHistoryExist["count"])
                count++
                let deniedHistoryPath = "deniedHistory." + key + "." + count
                let deniedNewCountPath = "deniedHistory." + key + ".count"
                let deniedDetails = course[0]["statusDenied"][key]
                deniedDetails["resolvedOn"] = timestamp()
                let unset = await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        [deniedHistoryPath]: deniedDetails,
                        [deniedNewCountPath] : count
                    },
                    $unset: {
                        [temp1]: ""
                    }
                })
                resolve()
            }
            else{
                let deniedHistoryPath = "deniedHistory." + key + ".1"
                let deniedNewCountPath = "deniedHistory." + key + ".count"
                let deniedDetails = course[0]["statusDenied"][key]
                deniedDetails["resolvedOn"] = timestamp()
                let unset = await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        [deniedHistoryPath]: deniedDetails,
                        [deniedNewCountPath] : 1
                    },
                    $unset: {
                        [temp1]: ""
                    }
                })
                resolve()
            }
        })
    },

    displayPreProductionHomeReport: (data) => {
        return new Promise(async (resolve, reject) => {
            let semesterQuerry = await db.get().collection('globalVariables').find({use:"semester"}).toArray()
            let semester = semesterQuerry[0]["currentSemester"]
            let preProducerCourses = await db.get().collection('Forms').find({semester:semester}).toArray()
            resolve(preProducerCourses)
        })
    },

    displayPostProductionHomeReport: (data) => {
        return new Promise(async (resolve, reject) => {
            let postProducerCourses = await db.get().collection('Forms').find({ editorName: data }).toArray()
            resolve(postProducerCourses)
        })
    },

    displayPostProductionHomeNewUploadsReport: (data) => {
        return new Promise(async (resolve, reject) => {
            let postProducerCourses = await db.get().collection('Forms').find({ editorName: data }).toArray()
            resolve(postProducerCourses)
        })
    },

    displayPreProducerStatusReport: (data) => {
        return new Promise(async (resolve, reject) => {
            let preProducerStatusCourses = await db.get().collection('Forms').find({ preProducerName: data.facultyName, status: "Pre Production" }, { projection: { courseName: 1, degree: 1, facultyName: 1, credits: 1 } }).toArray()
            for (var i = 0; i < preProducerStatusCourses.length; i++) {
                var s = preProducerStatusCourses[i].degree + "-" + preProducerStatusCourses[i].courseName + "-" + preProducerStatusCourses[i].facultyName + "-" + preProducerStatusCourses[i].credits
                preProducerStatusCourses[i] = { display: s, id: preProducerStatusCourses[i]._id }
            }
            resolve(preProducerStatusCourses)
        })
    },
    updatePreCourseStatus: (data) => {
        return new Promise(async (resolve, reject) => {
            let flag = await db.get().collection('Forms').updateOne({ _id: new ObjectId(data) }, {
                $set: {
                    status: "Post Production"
                }
            })
            resolve(flag)
        })
    },

    displayPostProducerStatusReport: (data) => {
        return new Promise(async (resolve, reject) => {
            let postProducerStatusCourses = await db.get().collection('Forms').find({ editorName: data, status: "Post Production" }, { projection: { courseName: 1, degree: 1, facultyName: 1, credits: 1 } }).toArray()
            for (var i = 0; i < postProducerStatusCourses.length; i++) {
                var s = postProducerStatusCourses[i].degree + "-" + postProducerStatusCourses[i].courseName + "-" + postProducerStatusCourses[i].facultyName + "-" + postProducerStatusCourses[i].credits
                postProducerStatusCourses[i] = { display: s, id: postProducerStatusCourses[i]._id }
            }
            resolve(postProducerStatusCourses)
        })
    },
    updatePostCourseStatus: (data) => {
        return new Promise(async (resolve, reject) => {
            let flag = await db.get().collection('Forms').updateOne({ _id: new ObjectId(data) }, {
                $set: {
                    status: "Pending Confirmation"
                }
            })
            resolve(flag)
        })
    },

    adminRepotsViewCourseList: () => {
        return new Promise(async (resolve, reject) => {
            let courseList = await db.get().collection('Forms').find({}, { projection: { courseName: 1, _id: 1, degree: 1, facultyName: 1, credits: 1 } }).toArray()
            for (var i = 0; i < courseList.length; i++) {
                var s = courseList[i].degree + "-" + courseList[i].courseName + "-" + courseList[i].facultyName + "-" + courseList[i].credits
                courseList[i] = { display: s, value: courseList[i]._id }
            }
            console.log(courseList)
            resolve(courseList)
        })
    },
}
/*function timestamp() {
    var currentTime = new Date();
    let sample = currentTime.setMinutes(currentTime.getMinutes() + 330);
    return new Date(sample)
}*/
function timestamp() {
    return new Date()
}
