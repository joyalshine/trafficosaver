var express = require('express');
var router = express.Router();
var newUserHelper = require('../Helpers/newUserHelper')
var formAddHelper = require('../Helpers/formAddHelper')
var reportDisplayHelpers = require('../Helpers/reportDisplayHelpers');
const { response } = require('express');
var fs = require('fs');
const url = require('url');
const multer = require("multer");
require('dotenv').config()
const uuid = require("uuid").v4
const XLSX = require('xlsx')



router.get('/', function (req, res, next) {
  let loggedIn = req.session.loggedIn
  res.render('users/index', { loggedIn })
});

router.get('/about', function (req, res, next) {
  let loggedIn = req.session.loggedIn
  res.render('users/about', { loggedIn })
});

router.get('/contact', function (req, res, next) {
  let loggedIn = req.session.loggedIn
  res.render('users/contact', { loggedIn })
});

router.get('/upload', function (req, res, next) {
  let loggedIn = req.session.loggedIn
  res.render('users/blog', { loggedIn })
});

router.get('/search', function (req, res, next) {
  let loggedIn = req.session.loggedIn
  newUserHelper.fetchImagePaths().then((response) => {
    let paths = response.paths
    res.render('users/causes', { loggedIn,paths })
  })
});

router.get('/login', function (req, res, next) {
  if (!(req.session.loggedIn)) {
    res.render('users/login', {})
  }
  else {
    res.redirect("/")
  }
});

router.post('/login', function (req, res) {
  newUserHelper.validateUser(req.body).then((response) => {
    let userInfo = response.user
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = userInfo
      req.session.showLoginPopUp = "1"
      res.redirect('/')
    } else {
      res.redirect('/login')
    };
  })
});

router.get('/signup', function (req, res, next) {
  res.render('users/signup', {})
});
router.post('/signup', function (req, res, next) {
  newUserHelper.addNewUser(req.body).then((response) => {
    console.log(response)
    res.redirect('/login')
  })
});

router.get('/logout', function (req, res, next) {
  req.session.destroy()
  res.redirect('/')
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Files")
  },
  filename: (req, file, cb) => {
    let user = req.session.user
    let rawFileType = file.mimetype.split("/")
    let fileType = ""
    if (rawFileType[1] == "image/jpeg") {
      fileType = ".jpg"
    }
    else if (rawFileType[1] == "image/png") {
      fileType = ".png"
    }
    else { fileType = "." + file.originalname.split(".")[1] }
    cb(null, uuid() + "--" + Date.now() + fileType)
  },
})

var upload = multer({
  storage: storage,

  fileFilter: (req, file, cb) => {
    var filetypes = /image\/jpeg|image\/png/;
    var mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    }
    else {
      cb(new Error("File type not supported"), false)
    }
  },

  limits: { fileSize: 6000000 }
})



const multiupload = upload.fields([
  { name: "file", maxCount: 1 }
])

router.post('/file-upload', multiupload, (req, res, err) => {
  newUserHelper.imageUpload(req.files, req.body).then((response) => {
    res.redirect('/upload')
  })
})


// router.get('/', function (req, res, next) {
//   if (!(req.session.loggedIn) || status) {
//     res.render('index', { status, logoutMessage });
//     logoutMessage = false
//     status = false
//   } else {
//     if (req.session.user.accountType == 0) {
//       res.redirect('/admin-home')
//     } else if (req.session.user.accountType == 1) {
//       res.redirect('/pre-shedule-view')
//     } else if (req.session.user.accountType == 2) {
//       res.redirect('/post-production-home')
//     } else if (req.session.user.accountType == 3) {
//       res.redirect('/faculty-home')
//     }
//     else if (req.session.user.accountType == 4) {
//       res.redirect('/lms-home')
//     }
//     else if (req.session.user.accountType == 5) {
//       res.redirect('/coordinator-home')
//     }
//     else if (req.session.user.accountType == 6) {
//       res.redirect('/reports')
//     }
//     else{}
//   }
// });

// router.post('/', function (req, res) {
//   newUserHelper.validateUser(req.body).then((response) => {
//     let userInfo = response.user
//     if (response.status) {
//       req.session.loggedIn = true
//       req.session.user = userInfo
//       req.session.showLoginPopUp = "1"
//       if (response.user.accountType == 0) {
//         res.redirect('/admin-home')
//       } else if (response.user.accountType == 1) {
//         res.redirect('/pre-shedule-view')
//       } else if (response.user.accountType == 2) {
//         res.redirect('/post-production-home')
//       } else if (response.user.accountType == 3) {
//         req.session.pendingNotification = "0"
//         res.redirect('/faculty-home')
//       }
//       else if (req.session.user.accountType == 4) {
//         res.redirect('/lms-home')
//       }
//       else if (req.session.user.accountType == 5) {
//         res.redirect('/coordinator-home')
//       }
//       else if (req.session.user.accountType == 6) {
//         res.redirect('/reports')
//       }
//       else { }
//     } else {
//       status = true
//       res.redirect('/')
//     };
//   })
// });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "Files")
//   },
//   filename: (req, file, cb) => {
//     let user = req.session.user
//     let rawFileType = file.mimetype.split("/")
//     let fileType = ""
//     if (rawFileType[1] == "vnd.openxmlformats-officedocument.wordprocessingml.document") {
//       fileType = ".docx"
//     }
//     else if (rawFileType[1] == "vnd.openxmlformats-officedocument.presentationml.presentation") {
//       fileType = ".pptx"
//     }
//     else if (rawFileType[1] == "pdf") {
//       fileType = ".pdf"
//     }
//     else if (rawFileType[1] == "zip" || rawFileType[1] == "x-zip-compressed" || rawFileType[1] == "x-zip" ) {
//       fileType = ".zip"
//     }
//     else if (rawFileType[1] == "text" || rawFileType[1] == "plain" ) {
//       fileType = ".txt"
//     }
//     else{fileType = "." +  file.originalname.split(".")[1]}
//     cb(null, uuid() + "--" + Date.now() + "-" + user.facultyId + fileType)
//   },
// })

// var upload = multer({
//   storage: storage,

//   fileFilter: (req, file, cb) => {
//     var filetypes = /vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.openxmlformats-officedocument.presentationml.presentation|pdf|zip|x-zip-compressed|x-zip|octet-stream|text\/plain/;
//     var mimetype = filetypes.test(file.mimetype);
//     if (mimetype) {
//       cb(null, true);
//     }
//     else {
//       cb(new Error("File type not supported"), false)
//     }
//   },

//   limits: { fileSize: 6000000 }
// })

// var status = false
// var courseExist = false
// var courseNotExist = false
// var reportData = {}
// let displayReportStatus = false
// let logoutMessage = false
// let userExist = "2"

// router.get('/', function (req, res, next) {
//   if (!(req.session.loggedIn) || status) {
//     res.render('index', { status, logoutMessage });
//     logoutMessage = false
//     status = false
//   } else {
//     if (req.session.user.accountType == 0) {
//       res.redirect('/admin-home')
//     } else if (req.session.user.accountType == 1) {
//       res.redirect('/pre-shedule-view')
//     } else if (req.session.user.accountType == 2) {
//       res.redirect('/post-production-home')
//     } else if (req.session.user.accountType == 3) {
//       res.redirect('/faculty-home')
//     }
//     else if (req.session.user.accountType == 4) {
//       res.redirect('/lms-home')
//     }
//     else if (req.session.user.accountType == 5) {
//       res.redirect('/coordinator-home')
//     }
//     else if (req.session.user.accountType == 6) {
//       res.redirect('/reports')
//     }
//     else{}
//   }
// });

// router.post('/', function (req, res) {
//   newUserHelper.validateUser(req.body).then((response) => {
//     let userInfo = response.user
//     if (response.status) {
//       req.session.loggedIn = true
//       req.session.user = userInfo
//       req.session.showLoginPopUp = "1"
//       if (response.user.accountType == 0) {
//         res.redirect('/admin-home')
//       } else if (response.user.accountType == 1) {
//         res.redirect('/pre-shedule-view')
//       } else if (response.user.accountType == 2) {
//         res.redirect('/post-production-home')
//       } else if (response.user.accountType == 3) {
//         req.session.pendingNotification = "0"
//         res.redirect('/faculty-home')
//       }
//       else if (req.session.user.accountType == 4) {
//         res.redirect('/lms-home')
//       }
//       else if (req.session.user.accountType == 5) {
//         res.redirect('/coordinator-home')
//       }
//       else if (req.session.user.accountType == 6) {
//         res.redirect('/reports')
//       }
//       else { }
//     } else {
//       status = true
//       res.redirect('/')
//     };
//   })
// });

// router.get('/reports', loadUser, function (req, res) {
//   let user = req.session.user
//   let justLoggedIn = req.session.showLoginPopUp
//   formAddHelper.reportsAccountInitialData().then((response) => {
//     let editorsList = response.editors
//     let degreeList = response.degree
//     let courseList = response.courses
//     let semesters = response.semesters.sort()
//     res.render('users/reportsAccountPage', { user, editorsList, degreeList, courseList, semesters, justLoggedIn })
//   })
// });

// router.post('/reports', loadUser, function (req, res) {
//   reportDisplayHelpers.displayReport(req.body.semester).then((data) => {
//     res.send(data)
//   })
// });

// router.get('/password-reset', function (req, res) {
//   res.render('userRegister/passwordReset', {})
// });

// router.post('/password-reset', function (req, res) {
//   if (req.body.flag == "3") {
//     newUserHelper.passwordUpdate(req.body.id, req.body.password).then((response) => {
//       res.send({ status: "changed" })
//     })
//   }
//   else if (req.body.flag == "2") {
//     let sentOTP = req.session.otpSent
//     let inputOTP = parseInt(req.body.otp)
//     if (sentOTP == inputOTP) {
//       res.send("1")
//     }
//     else {
//       res.send("0")
//     }
//   }
//   else {
//     newUserHelper.passwordResetDataFetch(req.body.id).then((facultyData) => {
//       if (facultyData) {
//         let dbEmail = facultyData.email
//         if (dbEmail == req.body.email) {

//           var otp = Math.floor(1000 + Math.random() * 9000);

//           req.session.otpSent = otp

//           const htmlText = `
//           <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
//             <div style="margin:50px auto;width:70%;padding:20px 0">
//               <div style="border-bottom:1px solid #eee">
//                 <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">VITOL</a>
//               </div>
//               <p style="font-size:1.1em">Hi, ${facultyData.facultyName}</p>
//               <p>This is a auto generated Email. Use the following OTP to reset your Password. OTP is valid for 5 minutes. If you didn't request this, you can ignore this email or let us know.</p>
//               <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
//               <p style="font-size:0.9em;">Regards,<br />VITOL</p>
//               <hr style="border:none;border-top:1px solid #eee" />
//               <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
//               </div>
//             </div>
//           </div>`

//           var mailOptions = {
//             from: '"VITOL" <noreply.vitol@vit.ac.in>',
//             to: dbEmail,
//             subject: 'Password Reset',
//             html: htmlText
//           };

//           transporter.sendMail(mailOptions, function (error, info) {
//             if (error) {
//               console.log(error);
//             } else {
//               console.log('Email sent: ' + info.response);
//             }
//           })
//           res.send("1")
//         }
//         else {
//           res.send("0")
//         }
//       }
//       else {
//         res.send("0")
//       }
//     })
//   }
// });

// router.post('/password-reset-successfull', function (req, res) {
//   res.redirect('/')
// });

// router.get('/coordinator-home', loadUser, function (req, res) {
//   if (req.session.loggedIn) {
//     let user = req.session.user
//     let justLoggedIn = req.session.showLoginPopUp
//     let degree = user.degree
//     req.session.showLoginPopUp = "2"
//     reportDisplayHelpers.displayCoordinatorCourse(degree).then((data) => {
//       for (let i = 0; i < data.length; i++) {
//         if (data[i].status == "Production") {
//           data[i].underProduction = true
//           data[i].completed = false
//         } else {
//           data[i].underProduction = false
//           data[i].completed = true
//         }
//       }
//       res.render('users/coordinatorsHome', { user, data, justLoggedIn })
//     })
//   }
//   else {
//     res.redirect('/')
//   }
// });

// router.post('/coordinator-home', loadUser, async function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayCoordinatorCourse(user.degree).then((data) => {
//     res.send(data)
//   })
// });

// router.get('/coordinator-course-plan', loadUser, async function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayCoordinatorCourse(user.degree).then((data) => {
//     for (var i = 0; i < data.length; i++) {
//       var s = data[i].courseId + " - " + data[i].courseName + " - " + data[i].facultyName
//       data[i] = { display: s, value: data[i]._id }
//     }
//     res.render("users/coordinatorCoursePlan", { user, data })
//   })
// });

// router.post('/coordinator-course-plan', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.fetchFacultyConfirmationCoursePlan(req.body.key).then((data) => {
//     res.send({ fetchedData: data })
//   })

// })

// router.get('/admin-password-change', loadUser, function (req, res) {
//   let user = req.session.user
//   res.render('admin/adminPasswordChange', { user });
// });

// router.post('/admin-password-change', loadUser, function (req, res) {
//   if (req.body.flag == "2") {
//     newUserHelper.passwordUpdate(req.body.id, req.body.password).then((response) => {
//       res.send("1")
//     })
//   }
//   else {
//     newUserHelper.passwordResetDataFetch(req.body.id).then((facultyData) => {
//       if (facultyData) {
//         res.send({ status: "1", name: facultyData.facultyName })
//       }
//       else {
//         res.send({ status: "0" })
//       }
//     })
//   }
// });

// router.post('/admin-database-management', loadUser, function (req, res) {
//   if (req.body.reqfor == "profileFetch") {
//     formAddHelper.profileEditDataFetch(req.body.id).then((response) => {
//       if (response) {
//         res.send({ status: "true", data: response })
//       }
//       else {
//         res.send({ status: "false" })
//       }
//     })
//   }
//   else if (req.body.reqfor == "courseFetch") {
//     formAddHelper.courseEditDataFetch(req.body.id).then((response) => {
//       if (response) {
//         res.send({ status: "true", data: response })
//       }
//       else {
//         res.send({ status: "false" })
//       }
//     })
//   }
//   else if (req.body.reqfor == "profileUpdate") {
//     formAddHelper.profileUpdate(req.body).then((response) => {
//       res.send({ status: "true", data: response })
//     })
//   }
//   else if (req.body.reqfor == "facultyListFetch") {
//     formAddHelper.faculties().then((response) => {
//       res.send({ status: "true", data: response })
//     })
//   }
//   else if (req.body.reqfor == "EditorListFetch") {
//     formAddHelper.editors().then((response) => {
//       res.send({ status: "true", data: response })
//     })
//   }
//   else if (req.body.reqfor == "courseUpdate") {
//     formAddHelper.courseUpdate(req.body).then((response) => {
//       res.send({})
//     })
//   }
// })

// router.get('/admin-home', loadUser, function (req, res) {
//   let user = req.session.user
//   let justLoggedIn = req.session.showLoginPopUp
//   req.session.showLoginPopUp = "2"
//   reportDisplayHelpers.displayAdminHomeReport().then((courses) => {
//     res.render('admin/adminHome', { user, courses, justLoggedIn })
//   })
// });
// function loadUser(req, res, next) {
//   if (req.session.loggedIn) {
//     next();
//   } else {                              
//     res.render("errorHandling");
//   }
// };

// router.get('/pre-production-home', loadUser, function (req, res) {
//   let user = req.session.user
//   let userName = req.session.user.facultyName
//   let justLoggedIn = req.session.showLoginPopUp
//   req.session.showLoginPopUp = "2"
//   reportDisplayHelpers.displayPreProductionHomeReport(userName).then((preProducerCourses) => {
//     for (let i = 0; i < preProducerCourses.length; i++) {
//       if (preProducerCourses[i].status == "Production") {
//         preProducerCourses[i].underProduction = true
//         preProducerCourses[i].completed = false
//       } else {
//         preProducerCourses[i].underProduction = false
//         preProducerCourses[i].completed = true
//       }
//     }
//     res.render('users/preProductionHome', { user, preProducerCourses, justLoggedIn })
//   })
// });

// router.get('/lms-home-original', loadUser, function (req, res) {
//   let user = req.session.user
//   let userName = req.session.user.facultyName
//   let justLoggedIn = req.session.showLoginPopUp
//   req.session.showLoginPopUp = "2"
//   reportDisplayHelpers.displayPreProductionHomeReport(userName).then((preProducerCourses) => {
//     for (let i = 0; i < preProducerCourses.length; i++) {
//       if (preProducerCourses[i].status == "Production") {
//         preProducerCourses[i].underProduction = true
//         preProducerCourses[i].completed = false
//       } else {
//         preProducerCourses[i].underProduction = false
//         preProducerCourses[i].completed = true
//       }
//     }
//     res.render('users/lmsHomeOriginal', { user, preProducerCourses, justLoggedIn })
//   })
// });

// router.get('/post-production-home', loadUser, function (req, res) {
//   let user = req.session.user
//   let userName = req.session.user.facultyName
//   let justLoggedIn = req.session.showLoginPopUp
//   req.session.showLoginPopUp = "2"
//   reportDisplayHelpers.displayPostProductionHomeReport(userName).then((postProducerCourses) => {
//     for (let i = 0; i < postProducerCourses.length; i++) {
//       if (postProducerCourses[i].status == "Production") {
//         postProducerCourses[i].underProduction = true
//         postProducerCourses[i].completed = false
//       } else {
//         postProducerCourses[i].underProduction = false
//         postProducerCourses[i].completed = true
//       }
//     }
//     res.render('users/postProductionHome', { postProducerCourses, justLoggedIn, user })
//   })
// });

// router.post('/post-production-home', loadUser, function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayPostProductionHomeNewUploadsReport(user.facultyName).then((data) => {
//     let newUploads = []
//     for (let i = 0; i < data.length; i++) {
//       let courseData = {}
//       let preCompletedTopics = Object.keys(data[i]["preTopicsCompleted"])
//       let postCompletedTopics = Object.keys(data[i]["postTopicsCompleted"])
//       let incompleteteTopics = []
//       for (var j = 0; j < preCompletedTopics.length; j++) {
//         if (!postCompletedTopics.includes(preCompletedTopics[j])) {
//           incompleteteTopics.push(preCompletedTopics[j])
//         }
//       }
//       if (incompleteteTopics.length != 0) {
//         courseData.courseName = data[i]["courseName"]
//         courseData.facultyName = data[i]["facultyName"]
//         courseData.incompleteteTopics = incompleteteTopics
//         newUploads.push(courseData)
//       }
//     }
//     res.send(newUploads)
//   })
// });

// router.get('/faculty-home', loadUser, async function (req, res) {
//   if (req.session.loggedIn) {
//     let user = req.session.user
//     let justLoggedIn = req.session.showLoginPopUp
//     req.session.showLoginPopUp = "2"
//     reportDisplayHelpers.displayFacultyCourse(user.facultyId).then((data) => {
//       for (let i = 0; i < data.length; i++) {
//         if (data[i].status == "Production") {
//           data[i].underProduction = true
//           data[i].completed = false
//         } else {
//           data[i].underProduction = false
//           data[i].completed = true
//         }
//       }
//       res.render('users/facultyHome', { user, data, justLoggedIn })
//     })
//   }
//   else {
//     res.redirect('/')
//   }
// });

// router.post('/faculty-home', loadUser, async function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayFacultyCourse(user.facultyId).then((data) => {
//     res.send(data)
//   })
// });

// router.post('/faculty-pending-notification', loadUser, function (req, res) {
//   let user = req.session.user
//   if (req.session.pendingNotification == "0") {
//     reportDisplayHelpers.displayFacultyConfirmationPending(user.facultyId).then((data) => {
//       let pendingCourses = data.pendingCourses
//       let notificationFlag = 0
//       if (pendingCourses.length != 0) {
//         notificationFlag = 1
//       }
//       req.session.pendingNotification = "1"
//       res.send({ notificationFlag: notificationFlag });
//     })
//   }
// });

// router.get('/faculty-confirmation', loadUser, function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayFacultyConfirmationPending(user.facultyId).then((data) => {
//     let courses = data.rawCourses
//     let pendingCourses = data.pendingCourses
//     for (var i = 0; i < courses.length; i++) {
//       var s = courses[i].degree + "-" + courses[i].courseId + "-" + courses[i].facultyName + "-" + courses[i].credits
//       courses[i] = { display: s, value: courses[i]._id }
//     }
//     res.render('users/facultyConfirmation', { user, pendingCourses, courses });
//   })
// });

// router.post('/faculty-confirmation', loadUser, function (req, res) {
//   let user = req.session.user
//   if (req.body.flag === "false") {
//     formAddHelper.fetchFacultyConfirmationCoursePlan(req.body.key).then((data) => {
//       res.send({ fetchedData: data })
//     })
//   }
//   else {
//     let W = req.body.W
//     let topic = req.body.topic
//     let link = req.body.link
//     let duration = req.body.duration
//     let id = req.body.id
//     let remarks = req.body.remarks
//     res.render('users/confirmationPage', { user, W, topic, link, duration, id, remarks })
//   }
// })

// router.post('/confirmation-page', loadUser, function (req, res) {
//   reportDisplayHelpers.updateStatus(req.body).then((data) => {
//     console.log(data)
//     res.redirect('/faculty-confirmation')
//   })
// })

// router.get('/newUser', function (req, res) {
//   res.render('userRegister/newUser', { userExist });
//   userExist = "2"
// });

// router.post('/newUser', (req, res) => {
//   newUserHelper.uniqueUser(req.body).then((response) => {
//     if (response) {
//       userExist = "1"
//       res.redirect("/newUser")
//     } else {
//       console.log(req.body)
//       newUserHelper.addNewUser(req.body).then((response) => {
//         req.session.loggedIn = true
//         req.session.user = response
//         req.session.showLoginPopUp = "1"
//         if (response.accountType == 1) {
//           res.redirect('/pre-production-home')
//         } else if (response.accountType == 2) {
//           res.redirect('/post-production-home')
//         } else if (response.accountType == 3) {
//           res.redirect('/faculty-home')
//         }
//         else if (response.accountType == 4) {
//           res.redirect('/lms-home')   //-----------------------------------------------------------------
//         }
//         else {
//           res.redirect('/coordinator-home')
//         }
//       })

//     }
//   })

// });

// router.get('/lms-home', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.LMSReportsViewInitialData().then((response) => {
//     let courses = response.courses
//     let semesters = response.semesters
//     res.render('users/lmsHome', { user, courses, semesters })
//   })
// });

// router.post('/lms-home', loadUser, function (req, res) {
//   formAddHelper.LMSReportsViewInitialData().then((response) => {
//     let courses = response.courses
//     res.send({ courses: courses })
//   })
// });

// router.post('/lms-session-plan', loadUser, function (req, res) {
//   formAddHelper.fetchFacultyConfirmationCoursePlan(req.body.key).then((data) => {
//     res.send({ fetchedData: data })
//   })
// })

// router.get('/lms-status', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.adminReportsViewInitialData().then((response) => {
//     let courses = response.courses
//     res.render('users/lmsStatus', { user, courses })
//   })
// });

// router.post('/faculty-video-play', loadUser, function (req, res) {
//   let user = req.session.user
//   let url = req.body.url
//   res.render('users/facultyVideoView', { user, url });
// });




// router.get('/logout', (req, res) => {
//   req.session.destroy()
//   logoutMessage = true
//   res.redirect('/')
// });

// router.get('/pre-production-form', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.preProductionFormInitialData().then((data) => {
//     let courseList = data.courses
//     let semesters = data.semesters
//     res.render('users/preProductionForm', { user, courseList, semesters })
//   })
// });

// router.post('/pre-production-form', loadUser, function (req, res) {
//   let user = req.session.user
//   if (req.body.flag == "fetch") {
//     formAddHelper.preFormTopics(req.body.key).then((topics) => {
//       res.send({ topics: topics })
//     })
//   }
//   else if(req.body.flag == "courseList") {
//     formAddHelper.preProductionFormInitialData().then((response) => {
//       let courseList = response.courses
//       res.send({ courses : courseList })
//     })
//   }
//   else {
//     formAddHelper.addPreProductionForm(req.body, user.facultyName).then((response) => {
//       res.redirect('/pre-production-form')
//     })
//   }
// });

// router.get('/pre-shedule-view', loadUser, (req, res) => {
//   let user = req.session.user
//   res.render('users/preSheduleView', { user })
// });

// router.post('/pre-shedule-view', loadUser, function (req, res) {
//   formAddHelper.fetchPreSheduleView(req.body.studioName).then((response) => {
//     res.send({ response })
//   })
// });

// router.post('/fetch-faculty-details', loadUser, function (req, res) {
//   formAddHelper.fetchfacultyDetails(req.body.id).then((response) => {
//     res.send({ response })
//   })
// });

// router.get('/pre-course-plan', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.courses().then((courseList) => {
//     res.render('users/preCoursePlan', { user, courseList })
//   })
// });

// router.post('/pre-course-plan', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.fetchPreCoursePlan(req.body.courseId).then((response) => {
//     res.send(response)
//   })
// });

// router.get('/post-course-plan', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.postCourses(user.facultyName).then((response) => {
//     let courseList = response.postCourses
//     res.render('users/postCoursePlan', { user, courseList })
//   })
// });

// router.post('/post-course-plan', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.fetchPostCoursePlan(req.body.courseId).then((response) => {
//     res.send(response)
//   })
// });

// router.get('/employee-profile', loadUser, function (req, res) {
//   let user = req.session.user
//   res.render('users/employeeProfile', { user })
// });

// router.get('/post-production-course-view', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.postCourses(user.facultyName).then((response) => {
//     let courses = response.postCourses
//     let data = response.data
//     let deniedCourses = []
//     for (var i = 0; i < data.length; i++) {
//       let individualStatus = data[i].statusDenied
//       if (JSON.stringify(individualStatus) === '{}') { }
//       else {
//         deniedCourses.push(data[i])
//       }
//     }
//     res.render('users/postProductionCourseView', { user, courses, deniedCourses })
//   })
// });

// router.post('/post-production-course-view', loadUser, function (req, res) {
//   let user = req.session.user
//   if (req.body.flag == "1") {
//     formAddHelper.postProductionCourseView(req.body.key).then((data) => {
//       res.send({ data: data })
//     })
//   }
//   else if (req.body.flag == "2") {
//     formAddHelper.recordedDatesFetch(req.body.key).then((response) => {
//       res.send({ recordedDates: response.recordedDates, statusDenied: response.statusDenied, preTopicsCompleted: response.preTopicsCompleted })
//     })
//   }
//   else {
//     reportDisplayHelpers.updateDeniedResolveStatus(req.body.id, req.body.key, req.body.details).then((response) => {
//       res.send({})
//     })
//   }
// });

// router.post('/post-production-form-fetch', loadUser, function (req, res) {
//   formAddHelper.preCompletedTopics(req.body.key).then((response) => {
//     res.send({ completedTopics: response })
//   })
// });

// router.get('/post-production-form', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.postCourses(user.facultyName).then((responses) => {
//     let postCourses = responses.postCourses
//     res.render('users/postProductionUpdationForm', { user, postCourses })
//   })
// });

// router.get('/post-production-history', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.postCourses(user.facultyName).then((responses) => {
//     let postCourses = responses.postCourses
//     res.render('users/postProductionHistory', { user, postCourses })
//   })
// });

// router.post('/post-production-history', loadUser, function (req, res) {
//   formAddHelper.postProductionHistory(req.body.key).then((data) => {
//     res.send({ data: data })
//   })
// });

// router.post('/post-production-resolve-page-transfer', loadUser, function (req, res) {
//   res.redirect("/post-production-form")
// });
// //-----------------------------------------------------------------------------------------------------------
// router.post('/post-production-form', loadUser, function (req, res) {
//   if (req.body.sentEmail == "sent") {
//     formAddHelper.fetchEmail(req.body.courseInfo).then(async (response) => {
//       let email = response.facultyEmail
//       let courseName = response.courseName
//       let courseId = response.courseId
//       let name = response.facultyName

//       const htmlText = `
//       <p style="font-size:1.1em">Respected, ${name}</p>
//       <p>A new video has been uploaded and is awaiting your Confirmation. Please Confirm/Deny within 3 Days</p>
//       <h4> Course Name: ${courseName}</h4>
//       <h4> Course Code: ${courseId}</h4>
//       <h4> Topic: ${req.body.topic}</h4>
//       <h4> Link: ${req.body.videoLink}</h4>
//       <h4> Duration: ${req.body.durationMinutes}m ${req.body.durationSeconds}s</h4>
//       <p style="font-size:1.1em;">Regards,<br />VITOL</p>`

//       var mailOptions = {
//         from: '"VITOL" <noreply.vitol@vit.ac.in>',
//         to: email,
//         subject: 'New Video Uploaded',
//         html: htmlText
//       };

//       await transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//           console.log(error);
//         } else {
//           console.log('Email sent: ' + info.response);
//         }
//       })
//       formAddHelper.finalLinkUpdate(req.body).then((temp) => {
//         res.redirect('/post-production-form')
//       })
//     })
//   }
//   else {
//     formAddHelper.finalLinkUpdate(req.body).then((temp) => {
//       res.redirect('/post-production-form')
//     })
//   }
// });

// router.get('/course-add-form', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.faculties().then((facultyList) => {
//     formAddHelper.editors().then((editorsList) => {
//       res.render('admin/courseAdd', { user, courseExist, courseNotExist, facultyList, editorsList })
//       courseExist = false
//       courseNotExist = false
//     })
//   })
// });
// router.post('/course-add-form', loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.uniqueCourse(req.body).then((response1) => {
//     if (response1) {
//       courseExist = true
//       courseNotExist == false
//       res.redirect('/course-add-form')
//     } else {
//       let data = req.body.facultyName.split("/")
//       let editorData = req.body.editorName.split("/")
//       let phoneNumber = data[2]
//       let facultyId = data[1]
//       let facultyName = data[0]
//       let editorName = editorData[0]
//       let editorId = editorData[1]
//       delete req.body.facultyName
//       formAddHelper.addNewCourse(req.body, facultyName, facultyId, phoneNumber, editorName, editorId).then((response) => {
//         courseNotExist = true
//         courseExist = false
//         res.redirect('/course-add-form')
//       })
//     }
//   })

// });


// router.get('/faculty-course-plan', loadUser, function (req, res) {
//   let passedVariable = req.query.default
//   let defaultId = req.query.id
//   let displayDefault
//   if (passedVariable === "true") {
//     displayDefault = true
//   }
//   else {
//     displayDefault = false
//   }
//   let user = req.session.user
//   formAddHelper.facultyCourses(user.facultyName).then((courses) => {
//     res.render('users/facultyCoursePlan', { user, courses, displayDefault, defaultId })
//   })
// });

// router.post('/faculty-course-plan', loadUser, function (req, res) {
//   formAddHelper.fetchCoursePlan(req.body.key).then((response) => {
//     res.send({ data: response })
//   })
// });

// router.post('/faculty-course-plan-new-add', loadUser, function (req, res) {
//   let user = req.session.user
//   let id = req.body.id
//   if (req.body.key === 'true') {
//     formAddHelper.addCoursePlan(req.body).then((response) => {
//       res.redirect("/faculty-course-plan")
//     })
//   }
//   else {
//     formAddHelper.fetchCredits(id).then((response) => {
//       let credits = response.credits
//       res.render('users/facultyCoursePlanNewAdd', { user, id, credits })
//     })
//   }
// });

// router.post('/faculty-course-plan-update', loadUser, function (req, res) {
//   let user = req.session.user
//   let id = req.body.id
//   let introDisplayFlag = false
//   if (req.body.key === 'true') {
//     formAddHelper.updateCoursePlan(req.body).then((response) => {
//       res.redirect(url.format({
//         pathname: "/faculty-course-plan",
//         query: {
//           "default": "true",
//           "id": id
//         }
//       }))
//     })
//   }
//   else if (req.body.key === 'fetch') {
//     formAddHelper.coursePlanFreeze(id).then((confirmedTopics) => {
//       res.send(confirmedTopics)
//     })
//   }
//   else {
//     formAddHelper.fetchCoursePlan(req.body.id).then((response) => {
//       let coursePlan = response.coursePlan
//       let topics = []
//       let week = "W" + req.body.week
//       if (week === "W1") {
//         introDisplayFlag = true
//       }

//       let title = coursePlan["W" + req.body.week]
//       let secondTitle = coursePlan["W" + req.body.week + "-" + 1]

//       let i = 2
//       while (true) {
//         if (coursePlan["W" + req.body.week + "-" + i] == null) {
//           break
//         }
//         else {
//           topics.push({ title: coursePlan["W" + req.body.week + "-" + i], index: i, week: week })
//           i++
//         }
//       }
//       let rowspan = topics.length + 1
//       res.render('users/facultyCoursePlanUpdate', { user, id, week, introDisplayFlag, topics, title, secondTitle, rowspan })
//     })
//   }
// });


// router.get('/reports-view', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.adminReportsViewInitialData().then((response) => {
//     let editorsList = response.editors
//     let degreeList = response.degree
//     let courseList = response.courses
//     let semesters = response.semesters.sort()
//     res.render('admin/reportsView', { user, editorsList, degreeList, courseList, semesters })
//   })
// });

// router.post('/reports-view', loadUser, function (req, res) {
//   reportDisplayHelpers.displayReport(req.body.semester).then((data) => {
//     res.send(data)
//   })
// });


// router.post('/detail-report-view', loadUser, function (req, res) {
//   if (req.body.flag == "true") {
//     let user = req.session.user
//     let id = req.body.id
//     res.render('admin/detailReportView', { user, id })
//   }
//   else {
//     reportDisplayHelpers.displayDetailReport(req.body.id).then((response) => {
//       res.send(response)
//     })
//   }
// });

// router.post('/degree-list', loadUser, function (req, res) {
//   formAddHelper.degreeList().then((data) => {
//     res.send(data)
//   })
// });

// router.get('/coordinator-reports', loadUser, function (req, res) {
//   let user = req.session.user
//   formAddHelper.coordinatorReportsViewInitialData().then((response) => {
//     let semesters = response.semesters.sort()
//     res.render('users/coordinatorsReportsView', { user, semesters })
//   })
// });

// router.post('/coordinator-reports', loadUser, function (req, res) {
//   reportDisplayHelpers.displayCoordinatorReport(req.body.semester, req.body.degree).then((data) => {
//     res.send(data)
//   })
// });

// router.get('/admin-shedule-view', loadUser, function (req, res) {
//   let user = req.session.user
//   res.render('admin/adminSheduleView', { user })
// });

// router.post('/admin-shedule-view', loadUser, function (req, res) {
//   if (req.body.flag) {
//     formAddHelper.fetchAdminSheduleView(req.body.studioName).then((response) => {
//       res.send({ response })
//     })
//   }
// });

// router.post('/faculty-shedule-view', loadUser, function (req, res) {
//   if (req.body.flag) {
//     formAddHelper.fetchFacultySheduleView(req.body.studioName).then((response) => {
//       res.send({ response })
//     })
//   }
// });

// router.get('/admin-shedule-booking', loadUser, function (req, res) {
//   let user = req.session.user
//   res.render('admin/adminSheduleBooking', { user })
// });

// router.post("/admin-shedule-booking", loadUser, (req, res) => {
//   let user = req.session.user
//   let facultyId = req.body.facultyId
//   let facultyName = req.body.facultyName
//   if (req.body.flag == '1') {
//     formAddHelper.updateShedule(req.body.studio, req.body.day, req.body.timeSlot, facultyId, facultyName).then((response) => {
//       res.send({});
//     })
//   }
//   else if (req.body.flag == '2') {
//     formAddHelper.fetchBookingShedule(req.body.studio, req.body.day).then((response) => {
//       res.send({ data: response })
//     })
//   }
//   else if (req.body.flag == '3') {
//     formAddHelper.faculties().then((response) => {
//       res.send({ data: response })
//     })
//   }
//   else if (req.body.flag == '4') {
//     formAddHelper.fetchSlotCancellationEmail(req.body.facultyId).then((response) => {
//       const htmlText = `
//     <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
//     <div style="margin:50px auto;width:70%;padding:20px 0">
//     <div style="border-bottom:1px solid #eee">
//       <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">VITOL</a>
//     </div>
//     <p style="font-size:1.1em">Dear ${req.body.facultyName},</p>
//     <p>Slot <b>${req.body.detailSlot}</b> booked by  <b>${req.body.facultyName}  ${req.body.facultyId} </b>was cancelled due to the 
//          <br>Reason : <b>${req.body.reason}</b>.<br> Cancelled by <b>${user.facultyName}  ${user.facultyId}</b>.</p>
//     <h4>Course name: ${response.courseName}<br>Degree :  ${response.degree}<br>Studio :  ${req.body.detailStudio}<br>Day :  ${req.body.detailDay}</h4>
//     <p>Note: This is auto generated mail no need to reply</p>

//     <p style="font-size:0.9em;">Regards,<br />VITOL</p>
//     <hr style="border:none;border-top:1px solid #eee" />
//     <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
//     </div>
//     </div>
//     </div>`

//       var mailOptions = {
//         from: '"VITOL" <noreply.vitol@vit.ac.in>',
//         to: response.facultyEmail,
//         cc: 'production.vitol@vit.ac.in, asstdir3.vitol@vit.ac.in',
//         subject: 'Slot Cancellation',
//         html: htmlText
//       };

//       transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//           console.log(error);
//         } else {
//           console.log('Email sent: ' + info.response);
//         }
//       })
//     })
//     formAddHelper.deleteShedule(req.body, user.facultyId).then((response) => {
//       res.send({})
//     })

//   }
//   else if (req.body.flag == '5') {
//     formAddHelper.reserveSlot(req.body.studio, req.body.day, req.body.timeSlot, req.body.reason, req.body.organization, user.facultyId, req.body.date).then((response) => {
//       res.send(response);
//     })
//   }
//   else if (req.body.flag == '6') {
//     formAddHelper.deleteSlotReservation(req.body, user.facultyId).then((response) => {
//       res.send(response)
//     })
//   }
//   else { }
// })

// router.get('/pre-shedule-booking', loadUser, function (req, res) {
//   let user = req.session.user
//   res.render('users/preSheduleBooking', { user })
// });

// router.post("/pre-shedule-booking", loadUser, (req, res) => {
//   let user = req.session.user
//   let facultyId = req.body.facultyId
//   let facultyName = req.body.facultyName
//   if (req.body.flag == '1') {
//     formAddHelper.updateShedule(req.body.studio, req.body.day, req.body.timeSlot, facultyId, facultyName).then((response) => {
//       res.send({});
//     })
//   }
//   else if (req.body.flag == '2') {
//     formAddHelper.fetchBookingShedule(req.body.studio, req.body.day).then((response) => {
//       res.send({ data: response })
//     })
//   }
//   else if (req.body.flag == '3') {
//     formAddHelper.faculties().then((response) => {
//       res.send({ data: response })
//     })
//   }
//   else if (req.body.flag == '4') {
//     formAddHelper.fetchSlotCancellationEmail(req.body.facultyId).then((response) => {
//       const htmlText = `
//     <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
//     <div style="margin:50px auto;width:70%;padding:20px 0">
//     <div style="border-bottom:1px solid #eee">
//       <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">VITOL</a>
//     </div>
//     <p style="font-size:1.1em">Dear ${req.body.facultyName},</p>
//     <p>Slot <b>${req.body.detailSlot}</b> booked by  <b>${req.body.facultyName}  ${req.body.facultyId} </b>was cancelled due to the 
//          <br>Reason : <b>${req.body.reason}</b>.<br> Cancelled by <b>${user.facultyName}  ${user.facultyId}</b>.</p>
//     <h4>Course name: ${response.courseName}<br>Degree :  ${response.degree}<br>Studio :  ${req.body.detailStudio}<br>Day :  ${req.body.detailDay}</h4>
//     <p>Note: This is auto generated mail no need to reply</p>

//     <p style="font-size:0.9em;">Regards,<br />VITOL</p>
//     <hr style="border:none;border-top:1px solid #eee" />
//     <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
//     </div>
//     </div>
//     </div>`

//       var mailOptions = {
//         from: '"VITOL" <noreply.vitol@vit.ac.in>',
//         to: response.facultyEmail,
//         cc: 'production.vitol@vit.ac.in, asstdir3.vitol@vit.ac.in',
//         subject: 'Slot Cancellation',
//         html: htmlText
//       };

//       transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//           console.log(error);
//         } else {
//           console.log('Email sent: ' + info.response);
//         }
//       })
//     })
//     formAddHelper.deleteShedule(req.body, user.facultyId).then((response) => {
//       res.send({})
//     })
//   }
//   else if (req.body.flag == '5') {
//     formAddHelper.reserveSlot(req.body.studio, req.body.day, req.body.timeSlot, req.body.reason, req.body.organization, user.facultyId, req.body.date).then((response) => {
//       res.send(response);
//     })
//   }
//   else if (req.body.flag == '6') {
//     formAddHelper.deleteSlotReservation(req.body, user.facultyId).then((response) => {
//       res.send(response)
//     })
//   }
//   else { }
// })

// router.get('/faculty-courses', loadUser, function (req, res) {
//   res.render('users/facultyCourses')
// });

// router.get('/pre-status-updation', loadUser, function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayPreProducerStatusReport(user).then((courses) => {
//     res.render('users/preStatusUpdation', { user, courses })
//   })
// });

// router.post('/pre-status-updation', loadUser, function (req, res) {
//   let id = req.body.course
//   reportDisplayHelpers.updatePreCourseStatus(id).then((response) => {
//     res.redirect('/pre-status-updation')
//   })
// });

// router.get('/post-status-updation', loadUser, function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayPostProducerStatusReport(user.facultyName).then((courses) => {
//     res.render('users/postStatusUpdation', { courses, user })
//   })
// });

// router.get('/admin-confirmations', loadUser, function (req, res) {
//   let user = req.session.user
//   reportDisplayHelpers.displayReport().then((data) => {
//     for (let i = 0; i < data.length; i++) {
//       if (data[i].status == "Pending Confirmation") {
//         data[i].pending = true
//         data[i].completed = false
//       } else if (data[i].status == "Confirmed") {
//         data[i].pending = false
//         data[i].completed = true
//       } else if (data[i].status == "Denied") {
//         data[i].denied = true
//       } else { }
//     }
//     res.render('admin/confirmations', { user, data })
//   })
// });

// router.post('/post-status-updation', loadUser, function (req, res) {
//   let id = req.body.course
//   reportDisplayHelpers.updatePostCourseStatus(id).then((response) => {
//     res.redirect('/post-status-updation')
//   })
// });
// const util = require('util');
// const exec = util.promisify(require('child_process').exec);

// router.post('/generate-db-backup', loadUser, async function (req, res) {
//   let comm = 'mongodump --db vitol --gzip --archive=' + __dirname + "/MongoDBBackup/" + new Date().getTime() + ".gz"
//   const { stdout, stderr } = await exec(comm);
//   console.log('stdout:', stdout);
//   console.log('stderr:', stderr);
//   res.send("1")
// })

// const nodeCron = require("node-cron")
// const job = nodeCron.schedule("0 */30 * * * *", async function () {
//   let comm = 'mongodump --db vitol --gzip --archive=' + __dirname + "/MongoDBBackup/CronJob/" + new Date().getTime() + ".gz"
//   console.log(new Date().toLocaleString())
//   const { stdout, stderr } = await exec(comm);
// });

// router.get("/faculty-slot-booking", loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.fetchFacultyHomePageSheduleView(user.facultyId).then((booking) => {
//     res.render("users/facultySlotBooking", { user, booking })
//   })
// })

// router.post("/faculty-slot-booking", loadUser, (req, res) => {
//   let user = req.session.user
//   let facultyId = user.facultyId
//   let facultyName = user.facultyName
//   if (req.body.flag == '1') {
//     formAddHelper.updateShedule(req.body.studio, req.body.day, req.body.timeSlot, facultyId, facultyName).then((response) => {
//       res.send({});
//     })
//   }
//   else if (req.body.flag == '2') {
//     formAddHelper.fetchBookingShedule(req.body.studio, req.body.day).then((response) => {
//       res.send({ data: response })
//     })
//   }
//   else if (req.body.flag == '3') {
//     try {
//       req.body.facultyId = facultyId
//       let displayStudioNames = { "mainStudio": "Main Studio", "virtualStudio": "Virtual Studio", "vgbStudio": "VGB Studio" }
//       let displayDays = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday" }
//       req.body.detailStudio = displayStudioNames[req.body.studio]
//       req.body.detailDay = displayDays[req.body.day]
//       req.body.facultyName = facultyName
//       formAddHelper.fetchSlotCancellationEmail(facultyId).then((response) => {
//         const htmlText = `
//     <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
//     <div style="margin:50px auto;width:70%;padding:20px 0">
//     <div style="border-bottom:1px solid #eee">
//       <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">VITOL</a>
//     </div>
//     <p style="font-size:1.1em">Dear ${facultyName},</p>
//     <p>Slot <b>${req.body.detailSlot}</b> booked by  <b>${facultyName}  ${facultyId} </b>was cancelled due to the 
//          <br>Reason : <b>${req.body.reason}</b>.<br> Cancelled by <b>${facultyName}  ${facultyId}</b>.</p>
//     <h4>Course name: ${response.courseName}<br>Degree :  ${response.degree}<br>Studio :  ${req.body.detailStudio}<br>Day :  ${req.body.detailDay}</h4>
//     <p>Note: This is auto generated mail no need to reply</p>

//     <p style="font-size:0.9em;">Regards,<br />VITOL</p>
//     <hr style="border:none;border-top:1px solid #eee" />
//     <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
//     </div>
//     </div>
//     </div>`

//         var mailOptions = {
//           from: '"VITOL" <noreply.vitol@vit.ac.in>',
//           to: user.email,
//           cc: 'production.vitol@vit.ac.in, asstdir3.vitol@vit.ac.in',
//           subject: 'Slot Cancellation',
//           html: htmlText
//         };

//         transporter.sendMail(mailOptions, function (error, info) {
//           if (error) {
//             console.log(error);
//           } else {
//             console.log('Email sent: ' + info.response);
//           }
//         })
//       })
//       formAddHelper.deleteShedule(req.body, user.facultyId).then((response) => {
//         res.send({ status: true })
//       })
//     }
//     catch (err) {
//       console.log(err)
//       res.send({ status: false })
//     }
//   }
//   else { }
// })

// router.post('/post-production-reshoot', loadUser, function (req, res) {
//   if (req.body.for == "initialFetch") {
//     console.log("initial fetch")
//     formAddHelper.postProductionReshoot(req.body).then((response) => {
//       res.send(response)
//     })
//   }
//   else {
//     formAddHelper.postProductionDeniedTopicReshoot(req.body).then((response) => {
//       res.send(response)
//     })
//   }
// });

// router.get("/pre-production-history", loadUser, (req, res) => {
//   let user = req.session.user
//   formAddHelper.preProductionReshootView(user.facultyName).then((response) => {
//     let reshootCourses = response.data
//     let courses = response.display
//     res.render("users/preProductionHistory", { user, reshootCourses, courses })
//   })
// })

// router.post("/pre-production-history", loadUser, (req, res) => {
//   if (req.body.flag == '1') {
//     formAddHelper.preProductionReshootDetails(req.body.id).then((courseDetails) => {
//       res.send({ courseDetails: courseDetails })
//     })
//   }
//   else if (req.body.flag == '2') {
//     formAddHelper.preProductionReshootResolve(req.body.id, req.body.date).then((status) => {
//       res.send({ status: status })
//     })
//   }
// })

// router.post('/export-to-excel', loadUser, function (req, res) {
//   let user = req.session.user.facultyId
//   let data = req.body.data
//   const workSheet = XLSX.utils.json_to_sheet(data);
//   const workBook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workBook, workSheet, "Report")
//   XLSX.write(workBook, { bookType: 'xlsx', type: "buffer" })
//   let path = "tempFiles/Report" + uuid() + ".xlsx"
//   XLSX.writeFile(workBook, path)
//   res.send({ path: path, facultyId: user })
// })

// router.post('/delete-file', function (req, res) {
//   console.log("dfdsfdsfdsfds")
//   console.log(req.body)
//   fs.unlinkSync(req.body.path)
//   res.send({})
// })

// router.post('/import-from-excel', function (req, res) {
//   try {
//     const bookData = XLSX.readFile('sem2.xlsx')
//     const sheetRaw = bookData.Sheets["Sheet2"]
//     let data = XLSX.utils.sheet_to_json(sheetRaw, { raw: true })
//     let c = 1
//     let courePlan = {}

//     let weeks = 0
//     for (var i = 0; i < data.length - 10; i++) {
//       if (i == 0) {
//         continue
//       }
//       if (data[i]["Week"].split("-").length == 1) {
//         let index = data[i]["Week"].trim()
//         if (data[i]["Topic Name"]) {
//           let title = data[i]["Topic Name"].trim()
//           courePlan[index] = title
//         }
//         else {
//           courePlan[index] = ""
//         }
//         c = 1
//         weeks++
//       }
//       else {
//         let index = data[i]["Week"].split("-")[0] + "-" + c
//         if (data[i]["Topic Name"]) {
//           let title = data[i]["Topic Name"].trim()
//           courePlan[index] = title
//         }
//         else {
//           courePlan[index] = ""
//         }
//         c++
//       }
//     }
//     courePlan["weeks"] = weeks

//     let postTopics = {}
//     let individualStatus = {}
//     let confirmedTimestamp = {}
//     let postCompletedMinutes = 0
//     let postCompletedSeconds = 0
//     for (var i = 0; i < data.length - 10; i++) {
//       if (Object.keys(data[i]).length <= 2) { }
//       else {
//         let temp = {}
//         temp["videoLink"] = data[i]["Youtube Link"]
//         temp["postPath"] = data[i]["Synology Path_1"]
//         temp["duration"] = data[i]["Mins_1"] + ":" + data[i]["Sec_1"]
//         postCompletedMinutes = postCompletedMinutes + parseInt(data[i]["Mins_1"])
//         postCompletedSeconds = postCompletedSeconds + parseInt(data[i]["Sec_1"])
//         temp["timestamp"] = new Date(data[i]["Edited Date"])
//         temp["remarks"] = "Nil"
//         postTopics[data[i]["Week"].split("-")[0] + "-" + data[i]["Week"].split("-")[1].split("S")[1]] = temp
//         individualStatus[data[i]["Week"].split("-")[0] + "-" + data[i]["Week"].split("-")[1].split("S")[1]] = "confirmed"
//         confirmedTimestamp[data[i]["Week"].split("-")[0] + "-" + data[i]["Week"].split("-")[1].split("S")[1]] = new Date(new Date().getTime())
//       }
//     }

//     postCompletedMinutes = postCompletedMinutes + Math.floor(postCompletedSeconds / 60)
//     postCompletedSeconds = postCompletedSeconds % 60

//     let renderedMinutes = postCompletedMinutes
//     let renderedSeconds = postCompletedSeconds

//     let preTopics = {}
//     let recordedDates = []
//     for (var i = 0; i < data.length - 10; i++) {
//       if (Object.keys(data[i]).length <= 3) { }
//       else {
//         let date = data[i]["Recorded Date"]
//         if (!recordedDates.includes(date)) {
//           recordedDates.push(date)
//         }
//         preTopics[data[i]["Week"].split("-")[0] + "-" + data[i]["Week"].split("-")[1].split("S")[1]] = date
//       }
//     }

//     let preTopicDetails = {}
//     for (var i = 0; i < recordedDates.length; i++) {
//       let d = recordedDates[i].split("-")
//       preTopicDetails[recordedDates[i]] = {
//         minutesRecorded: 0,
//         secondsRecorded: 0,
//         noOfVideosRecorded: 0,
//         preRemarks: "Nil",
//         preProductionLastEdited: new Date(d[1] + "-" + d[0] + "-" + d[2]),
//         paths: []
//       }
//     }

//     let preCompletedMinutes = 0
//     let preCompletedSeconds = 0
//     for (var i = 0; i < data.length - 10; i++) {
//       if (Object.keys(data[i]).length <= 3) { }
//       else {
//         let temp = preTopicDetails[data[i]["Recorded Date"]]
//         temp.minutesRecorded = temp.minutesRecorded + parseInt(data[i]["Mins"])
//         temp.secondsRecorded = temp.secondsRecorded + parseInt(data[i]["Sec"])
//         temp.noOfVideosRecorded = temp.noOfVideosRecorded + 1
//         temp.paths.push(data[i]["Synology Path"] + "  " + data[i]["Mins"] + ":" + data[i]["Sec"])

//         preCompletedMinutes = preCompletedMinutes + parseInt(data[i]["Mins"])
//         preCompletedSeconds = preCompletedSeconds + parseInt(data[i]["Sec"])
//       }
//     }

//     preCompletedMinutes = preCompletedMinutes + Math.floor(preCompletedSeconds / 60)
//     preCompletedSeconds = preCompletedSeconds % 60

//     for (var i = 0; i < data.length - 10; i++) {
//       if (Object.keys(data[i]).length <= 3) { }
//       else {
//         let temp = preTopicDetails[data[i]["Recorded Date"]]
//         temp.minutesRecorded = temp.minutesRecorded + Math.floor(temp.secondsRecorded / 60)
//         temp.secondsRecorded = temp.secondsRecorded % 60
//       }
//     }

//     let courseName = data[data.length - 10]["Topic Name"]
//     let courseId = data[data.length - 9]["Topic Name"]
//     let facultyName = data[data.length - 8]["Topic Name"]
//     let facultyId = data[data.length - 7]["Topic Name"]
//     let facultyNo = data[data.length - 6]["Topic Name"]
//     let editorName = data[data.length - 5]["Topic Name"]
//     let degree = data[data.length - 4]["Topic Name"]
//     let credits = data[data.length - 3]["Topic Name"]
//     let durationTarget = data[data.length - 2]["Topic Name"]
//     let semester = data[data.length - 1]["Topic Name"]
//     let preProducerName = "VASAN"

//     courseName = courseName.trim()
//     courseId = courseId.trim()
//     facultyName = facultyName.trim()
//     editorName = editorName.trim()
//     degree = degree.trim()

//     let courseCreatedTime = new Date(new Date().getTime())

//     let importedData = {
//       "courseName": courseName,
//       "courseId": courseId,
//       "semester": semester,
//       "degree": degree,
//       "credits": credits,
//       "durationTarget": durationTarget,
//       "editorName": editorName,
//       "facultyName": facultyName,
//       "facultyId": facultyId,
//       "facultyPhoneNumber": facultyNo,
//       "courseCreatedTime": courseCreatedTime,
//       "recordedDates": recordedDates,
//       "preTopicsCompleted": preTopics,
//       "postTopicsCompleted": postTopics,
//       "individualStatus": individualStatus,
//       "statusDenied": {},
//       "files": {},
//       "postCompletedMinutes": postCompletedMinutes,
//       "postCompletedSeconds": postCompletedSeconds,
//       "totalCompletedRenderedMinutes": renderedMinutes,
//       "totalCompletedRenderedSeconds": renderedSeconds,
//       "status": "Production",
//       "preCompletedMinutes": preCompletedMinutes,
//       "preCompletedSeconds": preCompletedSeconds,
//       "coursePlan": courePlan,
//       "preProducerName": preProducerName,
//       "postTopicsHistory": {},
//       "deniedHistory": {},
//       "reshoots": {},
//       "reshootHistory": {},
//       "confirmedTimestamp": confirmedTimestamp
//     }

//     let preKeys = Object.keys(preTopicDetails)
//     for (var i = 0; i < preKeys.length; i++) {
//       importedData[preKeys[i]] = preTopicDetails[preKeys[i]]
//     }

//     res.send({ status: true, importedData: importedData })
//   }
//   catch (error) {
//     res.send({ status: false })
//     console.log(error)
//   }
// })


// router.post('/DB-upload-Excel', loadUser, function (req, res) {
//   formAddHelper.uploadExcelToDB(req.body.importedData).then((response) => {
//     res.send(response)
//   })
// });

// function timestamp() {
//   var currentTime = new Date();
//   let sample = currentTime.setMinutes(currentTime.getMinutes() + 330);
//   return new Date(sample)
// }

// router.get('/faculty-course-plan-file-upload', loadUser, function (req, res) {
//   let user = req.session.user
//   //res.render('users/coursePlanFileUpload',{user})
// });

// router.post('/faculty-course-plan-file-upload', loadUser, function (req, res) {
//   let user = req.session.user
//   let id = req.body.id
//   let week = req.body.week
//   let weekTopic = req.body.weekTopic
//   formAddHelper.fetchFilesForUpdatePage(id).then((response) => {
//     let files = response.files
//     let requirredFiles = {}
//     let keys = ["file", "quiz", "webLink"]
//     let flags = {}
//     for (var i = 0; i < 6; i++) {
//       if (files[week + "-" + keys[i]]) {
//         requirredFiles[keys[i]] = files[week + "-" + keys[i]]
//         flags[keys[i]] = true
//       }
//     }
//     res.render('users/coursePlanFileUpload', { user, id, week, weekTopic, requirredFiles, flags })
//   })
// });

// /*
// router.post('/faculty-course-plan-file-upload', loadUser, function (req, res) {
//   let user = req.session.user
//   let id = req.body.id
//   let week = req.body.week
//   let weekTopic = req.body.weekTopic
//   formAddHelper.fetchFilesForUpdatePage(id).then((response) => {
//     let files = response.files
//     let requirredFiles = {}
//     let keys = ["file1", "file2", "file3", "file4", "quiz", "webLink"]
//     let flags = {}
//     for (var i = 0; i < 6; i++) {
//       if (files[week + "-" + keys[i]]) {
//         requirredFiles[keys[i]] = files[week + "-" + keys[i]]
//         flags[keys[i]] = true
//       }
//     }
//     res.render('users/coursePlanFileUpload', { user, id, week, weekTopic, requirredFiles, flags })
//   })
// });
// */

// router.post("/delete-filePath-from-Db", (req, res) => {
//   formAddHelper.deleteFilePathFromDb(req.body.id, req.body.key).then((response) => {
//     res.send({ key: true })
//   })
// })
// const multiupload = upload.fields([
//   { name: "file", maxCount: 1 },
//   { name: "quiz", maxCount: 1 },
//   { name: "webLink", maxCount: 1 }
// ])

// /*
// const multiupload = upload.fields([
//   { name: "file1", maxCount: 1 },
//   { name: "file2", maxCount: 1 },
//   { name: "file3", maxCount: 1 },
//   { name: "file4", maxCount: 1 },
//   { name: "quiz", maxCount: 1 },
// ])
// */

// router.post('/file-upload', multiupload, (req, res, err) => {
//   formAddHelper.coursePlanFileUpload(req.files, req.body).then((response) => {
//     res.redirect(url.format({
//       pathname: "/faculty-course-plan",
//       query: {
//         "default": "true",
//         "id": req.body.id
//       }
//     }))
//   })
// })

// router.post("/delete", (req, res) => {
//   let flag = req.body.flags
//   let path = req.body.paths
//   let keys = Object.keys(path)
//   for (var i = 0; i < keys.length; i++) {
//     if (flag[keys[i]] == true) {
//       fs.unlinkSync(path[keys[i]]);
//     }
//   }
//   res.send({ key: true })
// })
//var path = require('path');
router.use('/Files', express.static('./Files'))
router.use('/tempFiles', express.static('./tempFiles'))
//router.use('/Files', express.static(path.join(__dirname,'Files')))

module.exports = router;








