
const mongoose = require('mongoose');

// const Document=require("../models/Document.js")

// Configure multer for handling file uploads

// Handle file uploads and store data in MongoDB

const express = require("express");
const { requireAuth } = require("../midleware/auth")

const { checkAdmin } = require("../midleware/admin");
const router = express.Router();

// controllers
const { contacpageCreate, contacpageData, createTeam, allTeam,
     deleteSingeteam,ReviewCreate,Review } = require("../controlar/data.js");

// router.post("/homepage",HomePageCarusel);
router.post("/contacpage", contacpageCreate)
router.get("/conctact-page", contacpageData);
router.post("/team-create", requireAuth, checkAdmin, createTeam);
router.get("/team-member", allTeam);
router.delete("/team-member-delete/:_id", requireAuth, checkAdmin, deleteSingeteam);
router.post("//create-review",requireAuth,ReviewCreate);
router.get("/review",Review);
module.exports = router;
