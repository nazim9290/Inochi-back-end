const express = require("express")
const { requireAuth } = require("../middleware/auth")
const router = express.Router();
const { checkAdmin } = require("../middleware/admin");
const { checkStudent } = require("../middleware/student.js")
// controllers
const formidable = require("express-formidable")
const { register, login, currentUser, createStudentdetails, getAllStudents,
  upDateProfile, uploadImage
  , allFree, userRole, AllStudent,
  BookSeminer,
  getBranchA,
  getBranchB,
  BookSeminerGet,
  deleteBookSeminer,
} = require("../controllers/userAuth.js");
// EN: Cloudinary upload — was previously open, letting anyone burn through
//     the Cloudinary quota with anonymous uploads. Locked to authenticated
//     users (admin-only would be tighter but the public site doesn't use this).
// BN: Cloudinary upload — আগে open ছিল, যেকেউ anonymous upload করে
//     Cloudinary quota শেষ করতে পারত। এখন authenticated user only।
router.post(
  "/upload-image-file",
  requireAuth,
  formidable({ maxFileSize: 5 * 1024 * 1024 }),
  uploadImage
);

router.post("/register", register);
// router.post("/seminer-book",BookSeminer)
router.post("/seminer-book", BookSeminer)

router.post("/login", login);
router.get('/profile', requireAuth, currentUser);
router.post("/create-student/:id", requireAuth, checkAdmin, createStudentdetails);
router.get("/all-student", requireAuth, checkAdmin, getAllStudents);
router.get("/all-guset", requireAuth, checkAdmin, allFree);
router.get("/all-students", requireAuth, checkAdmin, AllStudent);
router.get("/all-students/brancha", requireAuth, checkAdmin, getBranchA);
router.get("/all-students/branchb", requireAuth, checkAdmin, getBranchB);
router.get("/all-seminer-booking", requireAuth, checkAdmin, BookSeminerGet);
router.delete("/seminer-book/:id", requireAuth, checkAdmin, deleteBookSeminer);
// EN: Profile-update was previously open — any caller could rewrite any
//     user's profile by ID. Now requires a valid token; the controller
//     should also verify req.user.id === req.params.id || admin.
// BN: /profile-update আগে open ছিল — যে কেউ যেকোনো user-এর profile
//     overwrite করতে পারত। এখন token লাগবে; controller-এ
//     req.user.id === req.params.id || admin check আছে।
router.put("/profile-update/:id", requireAuth, upDateProfile);
router.put("/change-role/:id", requireAuth, checkAdmin, userRole);
module.exports = router;




