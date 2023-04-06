var db = require('../config/connection')
var ObjectId = require('mongodb').ObjectId;
const { format, formatISO, parseISO, startOfDay, compareAsc } = require('date-fns');
const { resolve } = require('express-hbs/lib/resolver');
module.exports = {
    addNewCourse: (courseDetails, name, facultyId, phoneNumber, editorName, editorId) => {
        return new Promise(async (resolve, reject) => {
            courseDetails.courseName = courseDetails.courseName.toUpperCase()
            courseDetails.courseId = courseDetails.courseId.toUpperCase()
            courseDetails.facultyName = name.toUpperCase()
            courseDetails.editorName = editorName.toUpperCase()
            courseDetails.editorId = editorId.toUpperCase()
            courseDetails.degree = courseDetails.degree.toUpperCase()
            courseDetails.facultyId = facultyId
            courseDetails.facultyPhoneNumber = phoneNumber
            courseDetails.preProducerName = ""
            courseDetails.courseCreatedTime = timestamp()
            courseDetails.recordedDates = []
            courseDetails.preTopicsCompleted = {}
            courseDetails.postTopicsCompleted = {}
            courseDetails.individualStatus = {}
            courseDetails.statusDenied = {}
            courseDetails.files = {}
            courseDetails.deniedHistory = {}
            courseDetails.confirmedTimestamp = {}
            courseDetails.postTopicsHistory = {}
            courseDetails.preCompletedMinutes = 0
            courseDetails.preCompletedSeconds = 0
            courseDetails.postCompletedMinutes = 0
            courseDetails.postCompletedSeconds = 0
            courseDetails.totalCompletedRenderedMinutes = 0
            courseDetails.totalCompletedRenderedSeconds = 0
            courseDetails.status = "Production"
            let semester = parseInt(courseDetails.semester)
            let dbData = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            if (!dbData[0].semesters.includes(semester)) {
                let semesters = dbData[0].semesters
                semesters.push(semester)
                await db.get().collection('globalVariables').updateOne({ use: "semester" }, {
                    $set: {
                        semesters: semesters,
                        currentSemester: Math.max(...semesters)
                    }
                })
            }
            await db.get().collection('Forms').insertOne(courseDetails).then((data) => {
                resolve(courseDetails)
            })
        })
    },

    uniqueCourse: (courseDetails) => {
        return new Promise(async (resolve, reject) => {
            var tempData = await db.get().collection('Forms').findOne({ courseId: courseDetails.courseId })
            resolve(tempData)

        })
    },

    addPreProductionForm: (preFormDetails, facultyName) => {
        return new Promise(async (resolve, reject) => {
            let temp = await db.get().collection('Forms').find({ courseId: preFormDetails.courseInfo }).toArray()
            let d = new Date()
            var date = [d.getDate(), d.getMonth() + 1, d.getFullYear()].join("-")
            var n = temp[0].recordedDates
            let compMinutes = parseInt(temp[0].preCompletedMinutes) + parseInt(preFormDetails.minutesRecorded)
            let compSeconds = parseInt(temp[0].preCompletedSeconds) + parseInt(preFormDetails.secondsRecorded)
            var minutes = parseInt(compMinutes) + Math.floor((compSeconds) / 60);
            var seconds = (compSeconds) % 60
            topicsCompleted = temp[0].preTopicsCompleted
            let newTopics = preFormDetails.topicsIncluded
            newTopics = newTopics.split(" | ")
            let individualStatus = temp[0].individualStatus
            let statusDeniedKeys = Object.keys(temp[0].statusDenied)
            let paths = []
            for (var j = 0; j < preFormDetails.noOfVideosRecorded; j++) {
                var t = 'path-' + (j + 1)
                let rawPath = preFormDetails[t] + "      " + preFormDetails[t + "-mins"] + "m " + preFormDetails[t + "-sec"] + "s"
                paths[j] = rawPath
            }

            for (var i = 0; i < (newTopics.length - 1); i++) {
                topicsCompleted[newTopics[i]] = date
                individualStatus[newTopics[i]] = "editing"
                if (statusDeniedKeys.includes(newTopics[i])) {
                    individualStatus[newTopics[i]] = "denied"
                }
            }
            if (n.includes(date)) {
                let newPaths = temp[0][date]["paths"].concat(paths)
                let base = temp[0][date]
                let newPreMinutes = parseInt(base["minutesRecorded"]) + parseInt(preFormDetails.minutesRecorded)
                let newPreSeconds = parseInt(base["secondsRecorded"]) + parseInt(preFormDetails.secondsRecorded)
                newPreMinutes = newPreMinutes + Math.floor(newPreSeconds / 60)
                newPreSeconds = newPreSeconds % 60
                let nv = base["noOfVideosRecorded"]
                await db.get().collection('Forms').updateOne(
                    { courseId: preFormDetails.courseInfo },
                    {
                        $set: {
                            individualStatus: individualStatus,
                            preTopicsCompleted: topicsCompleted,
                            preCompletedMinutes: minutes,
                            preCompletedSeconds: seconds,
                            preProducerName: facultyName,
                            recordedDates: n,
                            [date]: {
                                minutesRecorded: newPreMinutes,
                                secondsRecorded: newPreSeconds,
                                noOfVideosRecorded: (parseInt(nv) + parseInt(preFormDetails.noOfVideosRecorded)),
                                preRemarks: preFormDetails.remarks,
                                preProductionLastEdited: timestamp(),
                                paths: newPaths
                            },
                        },
                    }).then((data) => {
                        resolve(preFormDetails)
                    })
            }
            else {
                n.push(date)
                await db.get().collection('Forms').updateOne(
                    { courseId: preFormDetails.courseInfo },
                    {
                        $set: {
                            individualStatus: individualStatus,
                            preTopicsCompleted: topicsCompleted,
                            preCompletedMinutes: minutes,
                            preCompletedSeconds: seconds,
                            preProducerName: facultyName,
                            recordedDates: n,
                            [date]: {
                                minutesRecorded: preFormDetails.minutesRecorded,
                                secondsRecorded: preFormDetails.secondsRecorded,
                                noOfVideosRecorded: preFormDetails.noOfVideosRecorded,
                                preRemarks: preFormDetails.remarks,
                                preProductionLastEdited: timestamp(),
                                paths: paths
                            },
                        },
                    }).then((data) => {
                        resolve(preFormDetails)
                    })
            }
        })

    },

    finalLinkUpdate: (details) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(details.courseInfo) }, { projection: { postCompletedSeconds: 1, postCompletedMinutes: 1, _id: 0, postTopicsCompleted: 1 } }).toArray()
            let alreadyTopicExist = tempData[0]["postTopicsCompleted"]
            let oldSeconds = parseInt(tempData[0]["postCompletedSeconds"])
            let oldMinutes = parseInt(tempData[0]["postCompletedMinutes"])
            let newSeconds = parseInt(details.durationSeconds)
            let newMinutes = parseInt(details.durationMinutes)
            if (alreadyTopicExist[details.topic] == null) {
                var quotient = parseInt(details.durationMinutes) + Math.floor((oldSeconds + newSeconds) / 60);
                var remainder = (oldSeconds + newSeconds) % 60
            }
            else {
                let tempArray = alreadyTopicExist[details.topic]["duration"].split(":")
                let deletionMinute = parseInt(tempArray[0])
                var deletionSeconds = parseInt(tempArray[1])
                var quotient = newMinutes - deletionMinute
                var remainder = newSeconds - deletionSeconds
                quotient = quotient + Math.floor((oldSeconds + remainder) / 60);
                remainder = (oldSeconds + remainder) % 60
                if (remainder < 0) {
                    remainder = 60 + remainder
                }
            }
            let duration = details.durationMinutes + ":" + details.durationSeconds
            let key = "postTopicsCompleted." + details.topic
            let key1 = "individualStatus." + details.topic
            console.log("remainder:  " + remainder)
            console.log("quotient: " + quotient)
            let newMinutes1 = quotient + parseInt(oldMinutes)
            await db.get().collection('Forms').updateOne(
                { _id: new ObjectId(details.courseInfo) }, {
                $set: {
                    postCompletedSeconds: remainder,
                    postCompletedMinutes: newMinutes1,
                    [key]: {
                        videoLink: details.videoLink,
                        postPath: details.postPath,
                        duration: duration,
                        timestamp: timestamp(),
                        remarks: details.postRemarks
                    },
                    [key1]: "pending"
                }


            }).then((data) => {
                resolve(data)
            })
        })
    },

    courses: () => {
        return new Promise(async (resolve, reject) => {
            let data = await db.get().collection('Forms').find({}, { projection: { courseId: 1, _id: 0, degree: 1, facultyName: 1, credits: 1, coursePlan: 1 } }).toArray()
            let tempData = []
            for (var j = 0; j < data.length; j++) {
                if (data[j]["coursePlan"] != null) {
                    tempData.push(data[j])
                }
            }
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].degree + "-" + tempData[i].courseId + "-" + tempData[i].facultyName + "-" + tempData[i].credits
                tempData[i] = { display: s, value: tempData[i].courseId }
            }
            resolve(tempData)
        })
    },

    preProductionFormInitialData: () => {
        return new Promise(async (resolve, reject) => {
            let data = await db.get().collection('Forms').find({}, { projection: { courseId: 1, _id: 0, degree: 1, facultyName: 1, credits: 1, coursePlan: 1, semester:1 } }).toArray()
            let tempData = []
            for (var j = 0; j < data.length; j++) {
                if (data[j]["coursePlan"] != null) {
                    tempData.push(data[j])
                }
            }
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].degree + "-" + tempData[i].courseId + "-" + tempData[i].facultyName + "-" + tempData[i].credits
                tempData[i] = { display: s, value: tempData[i].courseId,  semester: tempData[i].semester }
            }
            let semesters = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            resolve({courses: tempData, semesters: semesters[0]["semesters"] })
        })
    },

    postCourses: (name) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ editorName: name }).toArray()
            let data = tempData.map((x) => x)
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].degree + "-" + tempData[i].courseId + "-" + tempData[i].facultyName + "-" + tempData[i].credits
                tempData[i] = { display: s, value: tempData[i]._id }
            }
            resolve({ postCourses: tempData, data: data })
        })
    },

    faculties: () => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Users').find({ accountType: "3" }, { projection: { _id: 0, facultyName: 1, facultyId: 1, phoneNumber: 1 } }).sort({ facultyName: 1 }).toArray()
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].facultyName + " - " + tempData[i].facultyId
                let value = tempData[i].facultyName + "/" + tempData[i].facultyId + "/" + tempData[i].phoneNumber
                tempData[i] = { display: s, value: value }
            }
            resolve(tempData)
        })
    },

    editors: () => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Users').find({ accountType: "2" }, { projection: { _id: 0, facultyName: 1, facultyId: 1 } }).sort({ facultyName: 1 }).toArray()
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].facultyName + " - " + tempData[i].facultyId
                let value = tempData[i].facultyName + "/" + tempData[i].facultyId
                tempData[i] = { display: s, value: value }
            }
            resolve(tempData)
        })
    },

    recordedDatesFetch: (key) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(key) }, { projection: { recordedDates: 1, _id: 0, preTopicsCompleted: 1, statusDenied: 1 } }).toArray()
            resolve(tempData[0])
        })
    },

    postProductionCourseView: (key) => {
        return new Promise(async (resolve, reject) => {
            let Data = await db.get().collection('Forms').find({ _id: new ObjectId(key) }).toArray()
            resolve(Data[0])
        })
    },

    postProductionHistory: (key) => {
        return new Promise(async (resolve, reject) => {
            let Data = await db.get().collection('Forms').find({ _id: new ObjectId(key) }).toArray()
            resolve(Data[0])
        })
    },

    preCompletedTopics: (key) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(key) }, { projection: { preTopicsCompleted: 1, _id: 0, postTopicsCompleted: 1, statusDenied: 1 } }).toArray()
            var temp = tempData[0].preTopicsCompleted
            let postTopicsCompleted = Object.keys(tempData[0].postTopicsCompleted)
            let statusDenied = Object.keys(tempData[0].statusDenied)
            var compTopic = Object.keys(temp)
            let reqTopics = []
            for (var i = 0; i < compTopic.length; i++) {
                /*if (!postTopicsCompleted.includes(compTopic[i]) || statusDenied.includes(compTopic[i])) {
                    reqTopics.push(compTopic[i])
                }*/
                if (!postTopicsCompleted.includes(compTopic[i])) {
                    reqTopics.push(compTopic[i])
                }
            }
            resolve(reqTopics)
        })
    },

    facultyCourses: (name) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ facultyName: name }, { projection: { courseId: 1, degree: 1, facultyName: 1, credits: 1 } }).toArray()
            for (var i = 0; i < tempData.length; i++) {
                var s = tempData[i].degree + "-" + tempData[i].courseId + "-" + tempData[i].facultyName + "-" + tempData[i].credits
                tempData[i] = { display: s, value: tempData[i]._id }
            }
            console.log(tempData)
            resolve(tempData)
        })
    },

    fetchCoursePlan: (id) => {
        return new Promise(async (resolve, reject) => {
            let coursePlan = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { _id: 0, coursePlan: 1, files: 1 } }).toArray()
            resolve(coursePlan[0])
        })
    },

    fetchPreCoursePlan: (id) => {
        return new Promise(async (resolve, reject) => {
            let coursePlan = await db.get().collection('Forms').find({ courseId: id }, { projection: { _id: 0, coursePlan: 1, postTopicsCompleted: 1, individualStatus: 1 } }).toArray()
            resolve(coursePlan[0])
        })
    },

    fetchAdminCoursePlan: (id) => {
        return new Promise(async (resolve, reject) => {
            let coursePlan = await db.get().collection('Forms').find({ courseId: id }, { projection: { _id: 0, coursePlan: 1, postTopicsCompleted: 1, individualStatus: 1 } }).toArray()
            resolve(coursePlan[0])
        })
    },

    fetchPostCoursePlan: (id) => {
        return new Promise(async (resolve, reject) => {
            let coursePlan = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { _id: 0, coursePlan: 1, postTopicsCompleted: 1, individualStatus: 1 } }).toArray()
            resolve(coursePlan[0])
        })
    },

    fetchFilesForUpdatePage: (id) => {
        return new Promise(async (resolve, reject) => {
            let files = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { _id: 0, files: 1 } }).toArray()
            resolve(files[0])
        })
    },

    fetchFacultyConfirmationCoursePlan: (id) => {
        return new Promise(async (resolve, reject) => {
            let coursePlan = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { _id: 0, coursePlan: 1, postTopicsCompleted: 1, individualStatus: 1, confirmedTimestamp: 1, files: 1,courseName:1,courseId:1 } }).toArray()
            resolve(coursePlan[0])
        })
    },

    addCoursePlan: (data) => {
        return new Promise(async (resolve, reject) => {
            let id = data.id
            delete data.id
            delete data.key
            let individualStatus = {}
            let topics = Object.keys(data)

            individualStatus["intro"] = ""
            for (var i = 0; i < topics.length; i++) {
                individualStatus[topics[i]] = ""
            }

            await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                $set: {
                    coursePlan: data,
                    individualStatus: individualStatus
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },

    updateCoursePlan: (data) => {
        return new Promise(async (resolve, reject) => {
            let id = data.id
            let temp = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { _id: 0, individualStatus: 1 } }).toArray()
            let individualStatus = Object.keys(temp[0].individualStatus)
            delete data.id
            delete data.key
            let newValues = {}
            for (const key in data) {
                newValues["coursePlan." + key] = data[key]

                if (!individualStatus.includes(key)) {
                    newValues["individualStatus." + key] = ""
                }
            }

            await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                $set:
                    newValues
            }).then((response) => {
                resolve(response)
            })
        })
    },

    coursePlanFileUpload: (fileData, data) => {
        return new Promise(async (resolve, reject) => {
            let id = data.id
            let week = data.week
            let paths = {}
            for (const key in fileData) {
                paths["files." + week + "-" + key] = fileData[key][0]["path"]
            }
            await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                $set:
                    paths
            }).then((response) => {
                resolve(response)
            })
        })
    },

    deleteFilePathFromDb: (id, key) => {
        return new Promise(async (resolve, reject) => {
            let data = {}
            data["files." + key] = ""
            await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                $unset: data
            }).then((response) => {
                console.log(response)
                resolve(response)
            })
        })
    },

    fetchBookingShedule: (studio, day) => {
        return new Promise(async (resolve, reject) => {
            let temporaryShedules = await db.get().collection('temporaryShedules').find({}).toArray()
            for (var i = 0; i < temporaryShedules.length; i++) {
                let individualData = temporaryShedules[i]
                let sheduleRaw = individualData["timestamp"]
                let day = sheduleRaw.getUTCDate()
                let month = sheduleRaw.getUTCMonth()
                let year = sheduleRaw.getUTCFullYear()
                const date = new Date(Date.UTC(year, month, day))

                var myDate = new Date();
                var offset = myDate.getTimezoneOffset() * 60 * 1000;

                var withOffset = myDate.getTime();
                var withoutOffset = withOffset - offset;
                var newDateWithOutOffset = new Date(withoutOffset)
                let day1 = newDateWithOutOffset.getUTCDate()
                let month1 = newDateWithOutOffset.getUTCMonth()
                let year1 = newDateWithOutOffset.getUTCFullYear()
                var currentStartDate = new Date(Date.UTC(year1, month1, day1))

                let flag = compareAsc(currentStartDate, date)

                if (flag == 1) {
                    let key = "shedule" + "." + individualData.day + "." + individualData.timeSlot
                    let facultyDetail = individualData.facultyName + "-" + individualData.facultyId
                    await db.get().collection('shedule').updateOne({ studioName: individualData.studioName }, {
                        $set: {
                            [key]: facultyDetail
                        }
                    })
                    let deletion = await db.get().collection("temporaryShedules").deleteOne({ _id: new ObjectId(individualData._id) })
                }
            }
            let data = await db.get().collection('shedule').find({ studioName: studio }).toArray()
            let reqData = data[0]["shedule"][day]
            resolve(reqData)
        })
    },

    updateShedule: (studio, day, timeSlot, facultyId, facultyName) => {
        let key = "shedule" + "." + day + "." + timeSlot
        let facultyDetail = facultyName + "-" + facultyId
        return new Promise(async (resolve, reject) => {
            await db.get().collection('shedule').updateOne({ studioName: studio }, {
                $set: {
                    [key]: facultyDetail
                }
            }).then((response) => {
                resolve()
            })
        })
    },

    reserveSlot: (studio, day, timeSlot, reason, organization, userId, date) => {
        let key = "shedule" + "." + day + "." + timeSlot
        let reservationDetail = "RESERVED$" + reason + "$" + userId + "$" + organization + "$" + date
        try {
            return new Promise(async (resolve, reject) => {
                await db.get().collection('shedule').updateOne({ studioName: studio }, {
                    $set: {
                        [key]: reservationDetail
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
            })
        }
        catch (err) {
            console.log(err)
            resolve({ status: false })
        }
    },

    deleteShedule: (data, cancelledBy) => {
        let key = "shedule" + "." + data.day + "." + data.timeSlot
        return new Promise(async (resolve, reject) => {
            await db.get().collection('shedule').updateOne({ studioName: data.studio }, {
                $set: {
                    [key]: ""
                }
            })
            await db.get().collection('sheduleActivityLog').insertOne({
                studioName: data.detailStudio,
                day: data.detailDay,
                timeSlot: data.detailSlot,
                timestamp: timestamp(),
                reason: data.reason,
                facultyId: data.facultyId,
                facultyName: data.facultyName,
                cancelledBy: cancelledBy
            })
            if (data.cancelType == "temp") {
                await db.get().collection('temporaryShedules').insertOne({
                    studioName: data.studio,
                    day: data.day,
                    timeSlot: data.timeSlot,
                    timestamp: timestamp(),
                    facultyId: data.facultyId,
                    facultyName: data.facultyName
                }).then((e) => {
                    resolve()
                })
            }
            else {
                resolve()
            }
        })
    },

    deleteSlotReservation: (data, cancelledBy) => {
        try {
            let key = "shedule" + "." + data.day + "." + data.timeSlot
            return new Promise(async (resolve, reject) => {
                await db.get().collection('shedule').updateOne({ studioName: data.studio }, {
                    $set: {
                        [key]: ""
                    }
                })
                await db.get().collection('sheduleActivityLog').insertOne({
                    studioName: data.detailStudio,
                    day: data.detailDay,
                    timeSlot: data.detailSlot,
                    timestamp: timestamp(),
                    reason: data.reason,
                    organization: data.organization,
                    date: data.date,
                    remarks: data.remarks,
                    facultyId: "Null",
                    facultyName: "RESERVED",
                    reservedBy: data.reservedBy,
                    cancelledBy: cancelledBy
                }).then((e) => {
                    resolve({ status: true })
                })
            })
        }
        catch (err) {
            console.log(err)
            resolve({ status: false })
        }
    },

    fetchFacultyHomePageSheduleView: (id) => {
        return new Promise(async (resolve, reject) => {
            let temporaryShedules = await db.get().collection('temporaryShedules').find({}).toArray()
            for (var i = 0; i < temporaryShedules.length; i++) {
                let individualData = temporaryShedules[i]
                let sheduleRaw = individualData["timestamp"]
                let day = sheduleRaw.getUTCDate()
                let month = sheduleRaw.getUTCMonth()
                let year = sheduleRaw.getUTCFullYear()
                const date = new Date(Date.UTC(year, month, day))

                var myDate = new Date();
                var offset = myDate.getTimezoneOffset() * 60 * 1000;

                var withOffset = myDate.getTime();
                var withoutOffset = withOffset - offset;
                var newDateWithOutOffset = new Date(withoutOffset)
                let day1 = newDateWithOutOffset.getUTCDate()
                let month1 = newDateWithOutOffset.getUTCMonth()
                let year1 = newDateWithOutOffset.getUTCFullYear()
                var currentStartDate = new Date(Date.UTC(year1, month1, day1))

                let flag = compareAsc(currentStartDate, date)

                if (flag == 1) {
                    console.log("Changed")
                    let key = "shedule" + "." + individualData.day + "." + individualData.timeSlot
                    let facultyDetail = individualData.facultyName + "-" + individualData.facultyId
                    await db.get().collection('shedule').updateOne({ studioName: individualData.studioName }, {
                        $set: {
                            [key]: facultyDetail
                        }
                    })
                    let deletion = await db.get().collection("temporaryShedules").deleteOne({ _id: new ObjectId(individualData._id) })
                }
            }
            let data = await db.get().collection('shedule').find().toArray()
            let dataToSend = []
            let displayDays = ["", 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            let displayStudio = { "mainStudio": "Main Studio", "virtualStudio": "Virtual Studio", "vgbStudio": "VGB Studio" }
            let days = ["", 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            let timeSlots = ["", "9:00 AM - 10:15 AM (IST)", "10:15 AM - 11:30 AM (IST)", "11:45 AM - 1:00 PM (IST)", "2:00 PM - 3:15 PM (IST)", "3:15 PM - 4:30 PM (IST)", "4:45 PM - 6:00 PM (IST)"]
            let slots = ["", "slot1", "slot2", "slot3", "slot4", "slot5", "slot6"]
            for (const studio of data) {
                let data = {}
                let stdName = studio.studioName
                let shedule = studio.shedule
                for (var i = 1; i <= 7; i++) {
                    let dbData = shedule[days[i]]
                    for (var j = 1; j <= 6; j++) {
                        let tempSheduleId = dbData[slots[j]]
                        let sheduleId = tempSheduleId.split("-")
                        if (sheduleId[1] == id) {
                            data["studio"] = displayStudio[stdName]
                            data["day"] = displayDays[i]
                            data["slot"] = timeSlots[j]
                            data["value"] = stdName + "_" + days[i] + "_" + slots[j] + "_" + timeSlots[j]
                            dataToSend.push(data)
                            data = {}
                        }
                    }
                }
            }
            resolve(dataToSend)
        })
    },

    fetchAdminSheduleView: (studio) => {
        return new Promise(async (resolve, reject) => {
            let temporaryShedules = await db.get().collection('temporaryShedules').find({}).toArray()
            for (var i = 0; i < temporaryShedules.length; i++) {
                let individualData = temporaryShedules[i]
                let sheduleRaw = individualData["timestamp"]
                let day = sheduleRaw.getUTCDate()
                let month = sheduleRaw.getUTCMonth()
                let year = sheduleRaw.getUTCFullYear()
                const date = new Date(Date.UTC(year, month, day))

                var myDate = new Date();
                var offset = myDate.getTimezoneOffset() * 60 * 1000;

                var withOffset = myDate.getTime();
                var withoutOffset = withOffset - offset;
                var newDateWithOutOffset = new Date(withoutOffset)
                let day1 = newDateWithOutOffset.getUTCDate()
                let month1 = newDateWithOutOffset.getUTCMonth()
                let year1 = newDateWithOutOffset.getUTCFullYear()
                var currentStartDate = new Date(Date.UTC(year1, month1, day1))

                let flag = compareAsc(currentStartDate, date)

                if (flag == 1) {
                    console.log("Changed")
                    let key = "shedule" + "." + individualData.day + "." + individualData.timeSlot
                    let facultyDetail = individualData.facultyName + "-" + individualData.facultyId
                    await db.get().collection('shedule').updateOne({ studioName: individualData.studioName }, {
                        $set: {
                            [key]: facultyDetail
                        }
                    })
                    let deletion = await db.get().collection("temporaryShedules").deleteOne({ _id: new ObjectId(individualData._id) })
                }
            }
            let data = await db.get().collection('shedule').find({ studioName: studio }).toArray()
            resolve(data[0])
        })
    },

    fetchFacultySheduleView: (studio) => {
        return new Promise(async (resolve, reject) => {
            let temporaryShedules = await db.get().collection('temporaryShedules').find({}).toArray()
            for (var i = 0; i < temporaryShedules.length; i++) {
                let individualData = temporaryShedules[i]
                let sheduleRaw = individualData["timestamp"]
                let day = sheduleRaw.getUTCDate()
                let month = sheduleRaw.getUTCMonth()
                let year = sheduleRaw.getUTCFullYear()
                const date = new Date(Date.UTC(year, month, day))

                var myDate = new Date();
                var offset = myDate.getTimezoneOffset() * 60 * 1000;

                var withOffset = myDate.getTime();
                var withoutOffset = withOffset - offset;
                var newDateWithOutOffset = new Date(withoutOffset)
                let day1 = newDateWithOutOffset.getUTCDate()
                let month1 = newDateWithOutOffset.getUTCMonth()
                let year1 = newDateWithOutOffset.getUTCFullYear()
                var currentStartDate = new Date(Date.UTC(year1, month1, day1))

                let flag = compareAsc(currentStartDate, date)

                if (flag == 1) {
                    console.log("Changed")
                    let key = "shedule" + "." + individualData.day + "." + individualData.timeSlot
                    let facultyDetail = individualData.facultyName + "-" + individualData.facultyId
                    await db.get().collection('shedule').updateOne({ studioName: individualData.studioName }, {
                        $set: {
                            [key]: facultyDetail
                        }
                    })
                    let deletion = await db.get().collection("temporaryShedules").deleteOne({ _id: new ObjectId(individualData._id) })
                }
            }
            let data = await db.get().collection('shedule').find({ studioName: studio }).toArray()
            resolve(data[0])
        })
    },

    fetchPreSheduleView: (studio) => {
        return new Promise(async (resolve, reject) => {
            let temporaryShedules = await db.get().collection('temporaryShedules').find({}).toArray()
            for (var i = 0; i < temporaryShedules.length; i++) {
                let individualData = temporaryShedules[i]
                let sheduleRaw = individualData["timestamp"]
                let day = sheduleRaw.getUTCDate()
                let month = sheduleRaw.getUTCMonth()
                let year = sheduleRaw.getUTCFullYear()
                const date = new Date(Date.UTC(year, month, day))

                var myDate = new Date();
                var offset = myDate.getTimezoneOffset() * 60 * 1000;

                var withOffset = myDate.getTime();
                var withoutOffset = withOffset - offset;
                var newDateWithOutOffset = new Date(withoutOffset)
                let day1 = newDateWithOutOffset.getUTCDate()
                let month1 = newDateWithOutOffset.getUTCMonth()
                let year1 = newDateWithOutOffset.getUTCFullYear()
                var currentStartDate = new Date(Date.UTC(year1, month1, day1))

                let flag = compareAsc(currentStartDate, date)

                if (flag == 1) {
                    console.log("Changed")
                    let key = "shedule" + "." + individualData.day + "." + individualData.timeSlot
                    let facultyDetail = individualData.facultyName + "-" + individualData.facultyId
                    await db.get().collection('shedule').updateOne({ studioName: individualData.studioName }, {
                        $set: {
                            [key]: facultyDetail
                        }
                    })
                    let deletion = await db.get().collection("temporaryShedules").deleteOne({ _id: new ObjectId(individualData._id) })
                }
            }
            let data = await db.get().collection('shedule').find({ studioName: studio }).toArray()
            resolve(data[0])
        })
    },

    fetchEmail: (Id) => {
        return new Promise(async (resolve, reject) => {
            let courseData = await db.get().collection('Forms').find({ _id: new ObjectId(Id) }, { projection: { courseName: 1, facultyId: 1, _id: 0, courseId: 1, facultyName: 1 } }).toArray()
            let facultyId = courseData[0]["facultyId"]
            let facultyName = courseData[0]["facultyName"]
            let courseName = courseData[0]["courseName"]
            let courseId = courseData[0]["courseId"]
            let facultyData = await db.get().collection('Users').find({ facultyId: facultyId }, { projection: { email: 1, _id: 0 } }).toArray()
            let facultyEmail = facultyData[0]["email"]
            resolve({ facultyEmail: facultyEmail, courseName: courseName, courseId: courseId, facultyName: facultyName })
        })
    },

    fetchSlotCancellationEmail: (Id) => {
        return new Promise(async (resolve, reject) => {
            let courseData = await db.get().collection('Forms').find({ facultyId: Id }, { projection: { courseName: 1, degree: 1 } }).toArray()
            let courseName = ""
            let degree = ""
            if(courseData[0]){
                courseName = courseData[0]["courseName"]
                degree = courseData[0]["degree"]
            }
            else{
                courseName = "NIL"
                degree ="NIL"
            }
            let facultyData = await db.get().collection('Users').find({ facultyId: Id }, { projection: { email: 1, _id: 0 } }).toArray()
            let facultyEmail = facultyData[0]["email"]
            resolve({ facultyEmail: facultyEmail, degree: degree, courseName: courseName })
        })
    },

    fetchCredits: (id) => {
        return new Promise(async (resolve, reject) => {
            let courseData = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { credits: 1 } }).toArray()
            let credits = courseData[0]["credits"]
            resolve({ credits: credits })
        })
    },

    fetchfacultyDetails: (Id) => {
        return new Promise(async (resolve, reject) => {
            let facultyData = await db.get().collection('Users').find({ facultyId: Id }, { projection: { email: 1, _id: 0, phoneNumber: 1 } }).toArray()
            resolve({ facultyData: facultyData[0] })
        })
    },

    degreeList: () => {
        return new Promise(async (resolve, reject) => {
            let degreeList = []
            let degree = await db.get().collection('Forms').find({}, { projection: { _id: 0, degree: 1 } }).sort({ degree: 1 }).toArray()
            for (var j = 0; j < degree.length; j++) {
                if (degreeList.includes(degree[j]["degree"])) { }
                else {
                    degreeList.push(degree[j]["degree"])
                }
            }
            resolve({ degree: degreeList })
        })
    },

    adminReportsViewInitialData: () => {
        return new Promise(async (resolve, reject) => {
            let editors = await db.get().collection('Users').find({ accountType: "2" }, { projection: { _id: 0, facultyName: 1, facultyId: 1 } }).sort({ facultyName: 1 }).toArray()
            for (var i = 0; i < editors.length; i++) {
                var s = editors[i].facultyName + "-" + editors[i].facultyId
                editors[i] = { display: s, value: editors[i].facultyId }
            }

            let degreeList = []
            let degree = await db.get().collection('Forms').find({}, { projection: { _id: 0, degree: 1 } }).sort({ degree: 1 }).toArray()
            for (var j = 0; j < degree.length; j++) {
                if (degreeList.includes(degree[j]["degree"])) { }
                else {
                    degreeList.push(degree[j]["degree"])
                }
            }

            let courseList = await db.get().collection('Forms').find({}, { projection: { courseName: 1, _id: 1, degree: 1, facultyName: 1, credits: 1 } }).sort({ courseName: 1 }).toArray()
            for (var i = 0; i < courseList.length; i++) {
                var s = courseList[i].degree + "-" + courseList[i].courseName + "-" + courseList[i].facultyName + "-" + courseList[i].credits
                courseList[i] = { display: s, value: courseList[i]._id }
            }
            let semesters = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            resolve({ editors: editors, degree: degreeList, courses: courseList, semesters: semesters[0]["semesters"] })
        })
    },

    LMSReportsViewInitialData: () => {
        return new Promise(async (resolve, reject) => {
            let courseList = await db.get().collection('Forms').find({}, { projection: { courseName: 1, _id: 1, degree: 1, facultyName: 1, credits: 1, semester: 1, courseId:1 } }).sort({ courseName: 1 }).toArray()
            for (var i = 0; i < courseList.length; i++) {
                var s = courseList[i].degree + "-" + courseList[i].courseName + "-" + courseList[i].facultyName + "-" + courseList[i].credits
                courseList[i] = { display: s, value: courseList[i]._id, semester: courseList[i].semester, courseId: courseList[i].courseId }
            }
            let semesters = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            resolve({ courses: courseList, semesters: semesters[0]["semesters"] })
        })
    },

    reportsAccountInitialData: () => {
        return new Promise(async (resolve, reject) => {
            let editors = await db.get().collection('Users').find({ accountType: "2" }, { projection: { _id: 0, facultyName: 1, facultyId: 1 } }).sort({ facultyName: 1 }).toArray()
            for (var i = 0; i < editors.length; i++) {
                var s = editors[i].facultyName + "-" + editors[i].facultyId
                editors[i] = { display: s, value: editors[i].facultyId }
            }

            let degreeList = []
            let degree = await db.get().collection('Forms').find({}, { projection: { _id: 0, degree: 1 } }).sort({ degree: 1 }).toArray()
            for (var j = 0; j < degree.length; j++) {
                if (degreeList.includes(degree[j]["degree"])) { }
                else {
                    degreeList.push(degree[j]["degree"])
                }
            }

            let courseList = await db.get().collection('Forms').find({}, { projection: { courseName: 1, _id: 1, degree: 1, facultyName: 1, credits: 1 } }).sort({ courseName: 1 }).toArray()
            for (var i = 0; i < courseList.length; i++) {
                var s = courseList[i].degree + "-" + courseList[i].courseName + "-" + courseList[i].facultyName + "-" + courseList[i].credits
                courseList[i] = { display: s, value: courseList[i]._id }
            }
            let semesters = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            resolve({ editors: editors, degree: degreeList, courses: courseList, semesters: semesters[0]["semesters"] })
        })
    },

    coordinatorReportsViewInitialData: () => {
        return new Promise(async (resolve, reject) => {
            let semesters = await db.get().collection('globalVariables').find({ use: "semester" }).toArray()
            resolve({ semesters: semesters[0]["semesters"] })
        })
    },

    profileEditDataFetch: (id) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection('Users').findOne({ facultyId: id }).then((data) => {
                resolve(data)
            })
        })
    },

    courseEditDataFetch: (id) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection('Forms').findOne({ courseId: id }).then((data) => {
                resolve(data)
            })
        })
    },

    profileUpdate: (req) => {
        return new Promise(async (resolve, reject) => {
            if (req.subreq == "accountTypeOthers") {
                await db.get().collection('Users').updateOne({ facultyId: req.id }, {
                    $set: {
                        accountType: req.value
                    }
                }).then((response) => {
                    resolve(response)
                })
            }
            else if (req.subreq == "accountTypeCoordinator") {
                await db.get().collection('Users').updateOne({ facultyId: req.id }, {
                    $set: {
                        accountType: req.value,
                        degree : req.degree
                    }
                }).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    courseUpdate: (req) => {
        return new Promise(async (resolve, reject) => {
            if (req.subreq == "faculty") {
                await db.get().collection('Forms').updateOne({ courseId: req.courseId }, {
                    $set: {
                        facultyId: req.facultyId,
                        facultyName: req.facultyName
                    }
                }).then((response) => {
                    resolve(response)
                })
            }
            else if (req.subreq == "editor") {
                await db.get().collection('Forms').updateOne({ courseId: req.courseId }, {
                    $set: {
                        editorId: req.editorId,
                        editorName: req.editorName
                    }
                }).then((response) => {
                    resolve(response)
                })
            }
        })
    },

    preFormTopics: (id) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ courseId: id }, { projection: { coursePlan: 1, _id: 0, preTopicsCompleted: 1 } }).toArray()
            var coursePlan = tempData[0].coursePlan
            var keys = Object.keys(coursePlan)
            let completedKeys = Object.keys(tempData[0].preTopicsCompleted)
            var preTopics = []
            for (var j = 0; j < keys.length; j++) {
                if (coursePlan[keys[j]] != "" && (keys[j].split("-").length != 1) && !completedKeys.includes(keys[j])) {
                    preTopics.push(keys[j])
                }
            }
            if (!completedKeys.includes("intro")) {
                preTopics.push("intro")
            }
            resolve(preTopics)
        })
    },

    coursePlanFreeze: (id) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(id) }, { projection: { individualStatus: 1, _id: 0 } }).toArray()
            let topics = tempData[0].individualStatus
            let keys = Object.keys(topics)
            var confirmedTopics = []
            for (var i = 0; i < keys.length; i++) {
                if (topics[keys[i]] == "confirmed") {
                    confirmedTopics.push(keys[i])
                }
            }
            resolve(confirmedTopics)
        })
    },

    postProductionReshoot: (data) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(data.id) }).toArray()
            let postTopics = Object.keys(tempData[0]["postTopicsCompleted"])
            let recordedDates = tempData[0].recordedDates
            let preTopicsCompleted = tempData[0].preTopicsCompleted
            let keys = Object.keys(preTopicsCompleted)

            let topics = []
            for (var i = 0; i < keys.length; i++) {
                if (preTopicsCompleted[keys[i]] == data.date) {
                    topics.push(keys[i])
                    delete preTopicsCompleted[keys[i]]
                }
            }
            let flag = true
            let postExistTopics = []
            for (var i = 0; i < topics.length; i++) {
                if (postTopics.includes(topics[i])) {
                    flag = false
                    postExistTopics.push(topics[i])
                }
            }

            if (flag) {
                let newRecordedDates = []
                for (var i = 0; i < recordedDates.length; i++) {
                    if (recordedDates[i] != data.date) {
                        newRecordedDates.push(recordedDates[i])
                    }
                }

                let details = tempData[0][data.date]
                details["reshootAsked"] = timestamp()
                details.topics = topics
                details.reshootRemarks = data.remarks

                let minutes = parseInt(tempData[0]["preCompletedMinutes"]) - parseInt(details.minutesRecorded)
                let seconds = parseInt(tempData[0]["preCompletedSeconds"])
                if (details.secondsRecorded) {
                    seconds = parseInt(tempData[0]["preCompletedSeconds"]) - parseInt(details.secondsRecorded)
                    if (seconds < 0) {
                        minutes--
                        seconds = 60 + seconds
                    }
                }
                let updates = {
                    recordedDates: newRecordedDates,
                    preTopicsCompleted: preTopicsCompleted,
                    preCompletedMinutes: minutes,
                    preCompletedSeconds: seconds,
                    ["reshoots." + data.date]: details
                }

                for (var i = 0; i < topics.length; i++) {
                    updates["individualStatus." + topics[i]] = "reshoot"
                }

                await db.get().collection('Forms').updateOne({ _id: new ObjectId(data.id) }, {
                    $set: updates,

                    $unset: {
                        [data.date]: ""
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
            }
            else {
                let statusDenied = Object.keys(tempData[0].statusDenied)
                let deniedFlag = false
                for (var i = 0; i < postExistTopics.length; i++) {
                    if (statusDenied.includes(postExistTopics[i])) {
                        deniedFlag = true
                    }
                    else {
                        deniedFlag = false
                        break
                    }
                }
                resolve({ status: false, deniedStatus: deniedFlag })
            }
        })
    },

    postProductionDeniedTopicReshoot: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(data.id) }).toArray()
                let postTopics = Object.keys(tempData[0]["postTopicsCompleted"])
                let recordedDates = tempData[0].recordedDates
                let preTopicsCompleted = tempData[0].preTopicsCompleted
                let keys = Object.keys(preTopicsCompleted)

                let topics = []
                for (var i = 0; i < keys.length; i++) {
                    if (preTopicsCompleted[keys[i]] == data.date) {
                        topics.push(keys[i])
                        delete preTopicsCompleted[keys[i]]
                    }
                }
                let newRecordedDates = []
                for (var i = 0; i < recordedDates.length; i++) {
                    if (recordedDates[i] != data.date) {
                        newRecordedDates.push(recordedDates[i])
                    }
                }

                let details = tempData[0][data.date]
                details["reshootAsked"] = timestamp()
                details.topics = topics
                details.reshootRemarks = data.remarks

                let minutes = parseInt(tempData[0]["preCompletedMinutes"]) - parseInt(details.minutesRecorded)
                let seconds = parseInt(tempData[0]["preCompletedSeconds"])
                if (details.secondsRecorded) {
                    seconds = parseInt(tempData[0]["preCompletedSeconds"]) - parseInt(details.secondsRecorded)
                    if (seconds < 0) {
                        minutes--
                        seconds = 60 + seconds
                    }
                }
                let updates = {
                    recordedDates: newRecordedDates,
                    preTopicsCompleted: preTopicsCompleted,
                    preCompletedMinutes: minutes,
                    preCompletedSeconds: seconds,
                    ["reshoots." + data.date]: details
                }

                for (var i = 0; i < topics.length; i++) {
                    updates["individualStatus." + topics[i]] = "reshoot"
                }

                await db.get().collection('Forms').updateOne({ _id: new ObjectId(data.id) }, {
                    $set: updates,

                    $unset: {
                        [data.date]: ""
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
            }
            catch (err) {
                resolve({ status: "error" })
            }
        })
    },

    preProductionReshootView: (name) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ preProducerName: name }).toArray()
            let data = []
            for (var i = 0; i < tempData.length; i++) {
                let reshoots = Object.keys(tempData[i]["reshoots"])
                if (reshoots.length != 0) {
                    let temp = {}
                    temp.courseName = tempData[i].courseName
                    temp.courseId = tempData[i].courseId
                    temp.facultyName = tempData[i].facultyName
                    temp.id = tempData[i]["_id"]
                    data.push(temp)
                }
            }

            let display = []
            for (var j = 0; j < tempData.length; j++) {
                if (tempData[j]["coursePlan"] != null) {
                    display.push(tempData[j])
                }
            }
            for (var i = 0; i < display.length; i++) {
                var s = display[i].degree + "-" + display[i].courseId + "-" + display[i].facultyName + "-" + display[i].credits
                display[i] = { display: s, value: display[i]._id }
            }
            resolve({ display: display, data: data })
        })
    },

    preProductionReshootDetails: (id) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(id) }).toArray()
            let reshoots = tempData[0]["reshoots"]
            let keys = Object.keys(reshoots)
            let data = []
            for (var i = 0; i < keys.length; i++) {
                let temp = {}
                temp.recordedDate = keys[i]
                temp.paths = reshoots[keys[i]].paths
                temp.minutes = reshoots[keys[i]].minutesRecorded
                temp.seconds = reshoots[keys[i]].secondsRecorded
                temp.remarks = reshoots[keys[i]].reshootRemarks
                temp.noOfVideos = reshoots[keys[i]].noOfVideosRecorded
                temp.topics = reshoots[keys[i]].topics
                temp.id = tempData[0]["_id"]
                data.push(temp)

            }
            resolve(data)
        })
    },

    preProductionReshootResolve: (id, date) => {
        return new Promise(async (resolve, reject) => {
            let tempData = await db.get().collection('Forms').find({ _id: new ObjectId(id) }).toArray()
            let reshoots = tempData[0]["reshoots"][date]
            let topics = reshoots.topics
            let preTopics = Object.keys(tempData[0]["preTopicsCompleted"])
            let flag = true
            for (var i = 0; i < topics.length; i++) {
                if (!preTopics.includes(topics[i])) {
                    flag = false
                    break
                }
            }
            if (flag) {
                reshoots.resolvedOn = timestamp()
                await db.get().collection('Forms').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        ["reshootHistory." + date]: reshoots
                    },

                    $unset: {
                        ["reshoots." + date]: ""
                    }
                }).then((response) => {
                    resolve(true)
                })
            }
            else {
                resolve(false)
            }
        })
    },

    uploadExcelToDB: (importedData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let courseExist = await db.get().collection('Forms').find({ courseId: importedData.courseId }).toArray()
                if (courseExist.length == 0) {
                    await db.get().collection('Forms').insertOne(importedData).then((data) => {
                        resolve({ status: true })
                    })
                }
                else {
                    courseDetails = courseExist[0]

                    for (var i = 0; i < courseDetails.recordedDates.length; i++) {
                        if (!importedData.recordedDates.includes(courseDetails.recordedDates[i])) {
                            importedData.recordedDates.push(courseDetails.recordedDates[i])
                            importedData[courseDetails.recordedDates[i]] = courseDetails[courseDetails.recordedDates[i]]
                        }
                    }

                    let preTopicsCompletedKeys = Object.keys(courseDetails.preTopicsCompleted)
                    for (var i = 0; i < preTopicsCompletedKeys.length; i++) {
                        importedData.preTopicsCompleted[preTopicsCompletedKeys[i]] = courseDetails.preTopicsCompleted[preTopicsCompletedKeys[i]]
                    }

                    let postTopicsCompletedKeys = Object.keys(courseDetails.postTopicsCompleted)
                    for (var i = 0; i < postTopicsCompletedKeys.length; i++) {
                        importedData.postTopicsCompleted[postTopicsCompletedKeys[i]] = courseDetails.postTopicsCompleted[postTopicsCompletedKeys[i]]
                    }

                    let oldIndividualStatus = courseDetails.individualStatus
                    let individualStatusKeys = Object.keys(importedData.individualStatus)
                    for (var i = 0; i < individualStatusKeys.length; i++) {
                        oldIndividualStatus[individualStatusKeys[i]] = "confirmed"
                    }
                    importedData.individualStatus = oldIndividualStatus

                    importedData.postCompletedMinutes += parseInt(courseDetails.postCompletedMinutes)
                    importedData.postCompletedSeconds += parseInt(courseDetails.postCompletedSeconds)
                    importedData.postCompletedMinutes += Math.floor(importedData.postCompletedSeconds / 60)
                    importedData.postCompletedSeconds = importedData.postCompletedSeconds % 60

                    importedData.preCompletedMinutes += parseInt(courseDetails.preCompletedMinutes)
                    importedData.preCompletedSeconds += parseInt(courseDetails.preCompletedSeconds)
                    importedData.preCompletedMinutes += Math.floor(importedData.preCompletedSeconds / 60)
                    importedData.preCompletedSeconds = importedData.preCompletedSeconds % 60

                    importedData.totalCompletedRenderedMinutes += parseInt(courseDetails.totalCompletedRenderedMinutes)
                    importedData.totalCompletedRenderedSeconds += parseInt(courseDetails.totalCompletedRenderedSeconds)
                    importedData.totalCompletedRenderedMinutes += Math.floor(importedData.totalCompletedRenderedSeconds / 60)
                    importedData.totalCompletedRenderedSeconds = importedData.totalCompletedRenderedSeconds % 60

                    let oldCoursePlan = courseDetails.coursePlan
                    let newCoursePlan = importedData.coursePlan
                    let coursePlanKeys = Object.keys(oldCoursePlan)
                    for (var i = 0; i < coursePlanKeys.length; i++) {
                        if (oldCoursePlan[coursePlanKeys[i]] == "" && newCoursePlan[coursePlanKeys[i]] != "") {
                            oldCoursePlan[coursePlanKeys[i]] = newCoursePlan[coursePlanKeys[i]]
                        }
                    }

                    let confirmedTimestampKeys = Object.keys(courseDetails.confirmedTimestamp)
                    for (var i = 0; i < confirmedTimestampKeys.length; i++) {
                        importedData.confirmedTimestamp[confirmedTimestampKeys[i]] = courseDetails.confirmedTimestamp[confirmedTimestampKeys[i]]
                    }

                    importedData.coursePlan = oldCoursePlan
                    importedData.coursePlan.weeks = courseDetails.coursePlan.weeks
                    importedData.statusDenied = courseDetails.statusDenied
                    importedData.files = courseDetails.files
                    importedData.postTopicsHistory = courseDetails.postTopicsHistory
                    importedData.deniedHistory = courseDetails.deniedHistory
                    importedData.reshoots = courseDetails.reshoots
                    importedData.reshootHistory = courseDetails.reshootHistory
                    importedData.preProducerName = courseDetails.preProducerName
                    importedData.courseCreatedTime = courseDetails.courseCreatedTime

                    await db.get().collection('Forms').deleteOne({ _id: new ObjectId(courseDetails["_id"]) })
                    delete courseDetails["_id"]
                    await db.get().collection('deletedCourses').insertOne(courseDetails)
                    await db.get().collection('Forms').insertOne(importedData).then((data) => {
                        resolve({ status: true })
                    })
                }
            }
            catch (err) {
                console.log(err)
                resolve({ status: false })
            }
        })
    },

    //for easy purposes-------------------------------------------------to create shedule collection

    createDbShedule: () => {
        return new Promise(async (resolve, reject) => {
            let studios = ["mainStudio", "virtualStudio", "vgbStudio"]
            let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            let slots = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6"]
            let data = {}
            for (const studio of studios) {
                let temp = {}
                temp["studioName"] = studio
                let shedule = {}
                for (const day of days) {
                    let tslots = {}
                    for (const slot of slots) {
                        tslots[slot] = ""
                    }
                    shedule[day] = tslots
                }
                temp["shedule"] = shedule
                await db.get().collection('shedule').insertOne(temp);
            }
            resolve()
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







