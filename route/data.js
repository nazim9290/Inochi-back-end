// route/subscriberRoute.js

const express = require("express");
const {requireAuth} =require("../midleware/auth")

const { checkAdmin } = require("../midleware/admin");
const router = express.Router();

// controllers
const {contacpageCreate ,contacpageData ,createTeam,allTeam,deleteSingeteam} = require("../controlar/data.js");

// router.post("/homepage",HomePageCarusel);
router.post("/contacpage",contacpageCreate)
router.get("/conctact-page",contacpageData);
router.post("/team-create",requireAuth,checkAdmin,createTeam);
router.get("/team-member",allTeam);
router.delete("/team-member-delete/:_id",requireAuth,checkAdmin,deleteSingeteam)
module.exports = router;
