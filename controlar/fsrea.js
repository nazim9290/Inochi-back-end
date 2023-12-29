// const {Router}=require("express");
// const router=Router()

// module.exports =router;
const multer = require('multer');

const upload=multer({
    dest:"./uploads"    ,
    
    });
// upload.single("")
module.exports=upload;