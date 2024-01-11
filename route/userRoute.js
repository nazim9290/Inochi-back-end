const  express =require("express")
const {requireAuth} =require("../midleware/auth")
const router = express.Router();
const {checkAdmin}=require("../midleware/admin") ;
const {checkStudent}=require("../midleware/student.js")
// controllers
const formidable=require("express-formidable")
const {register,login,currentUser, createStudentdetails, getAllStudents,
  upDateProfile,uploadImage}=require("../controlar/userAuth.js");
router.post(
  "/upload-image-file",
  formidable({ maxFileSize: 5 * 1024 * 1024 }),
  uploadImage
);

router.post("/register",register);
router.post("/login",login);
router.get('/profile', requireAuth, currentUser);
router.post("/create-student/:id",requireAuth,checkAdmin,createStudentdetails);
router.get("/all-student",getAllStudents)
router.put("/profile-update/:id",upDateProfile)
module.exports = router;
