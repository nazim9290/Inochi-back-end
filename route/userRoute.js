const express = require("express")
const { requireAuth } = require("../midleware/auth")
const router = express.Router();
const { checkAdmin } = require("../midleware/admin");
const { checkStudent } = require("../midleware/student.js")
// controllers
const formidable = require("express-formidable")
const { register, login, currentUser, createStudentdetails, getAllStudents,
  upDateProfile, uploadImage
  , allFree, userRole,AllStudent
} = require("../controlar/userAuth.js");
router.post(
  "/upload-image-file",
  formidable({ maxFileSize: 5 * 1024 * 1024 }),
  uploadImage
);

router.post("/register", register);
router.post("/login", login);
router.get('/profile', requireAuth, currentUser);
router.post("/create-student/:id", requireAuth, checkAdmin, createStudentdetails);
router.get("/all-student", requireAuth, checkAdmin, getAllStudents);
router.get("/all-guset", requireAuth, checkAdmin, allFree);
router.get("/all-student", requireAuth, checkAdmin, AllStudent)

router.put("/profile-update/:id", upDateProfile);
router.put("/change-role/:id", requireAuth, checkAdmin, userRole);
module.exports = router;
