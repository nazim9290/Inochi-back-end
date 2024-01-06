const  express =require("express")
const {requireAuth} =require("../midleware/auth")
const router = express.Router();
const {checkAdmin}=require("../midleware/admin") ;
const {checkStudent}=require("../midleware/student.js")
// controllers

const {register,login,currentUser, createStudentdetails, getAllStudents,upDateProfile}=require("../controlar/userAuth.js");


router.post("/register",register);
router.post("/login",login);
router.get('/profile', requireAuth, currentUser);
router.post("/create-student/:id",requireAuth,checkAdmin,createStudentdetails);
router.get("/all-student",getAllStudents)
router.put("/profile-update",requireAuth,upDateProfile)
module.exports = router;