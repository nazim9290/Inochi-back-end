// route/subscriberRoute.js

const express = require("express");

const { checkAdmin } = require("../midleware/admin");
const router = express.Router();

// controllers
const {contacpageCreate ,contacpageData } = require("../controlar/data.js");

// router.post("/homepage",HomePageCarusel);
router.post("/contacpage",contacpageCreate)
router.get("/conctact-page",contacpageData)
module.exports = router;
