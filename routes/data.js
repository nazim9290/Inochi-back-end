const express = require("express");
const { requireAuth } = require("../middleware/auth")

const { checkAdmin } = require("../middleware/admin");
const indexnow = require("../helpers/indexnow");
const router = express.Router();

// EN: IndexNow pings for the public pages these resources feed. Fire-and-forget.
// BN: এই resource-গুলো যেসব public page চালায় তাদের জন্য IndexNow ping। Fire-and-forget।
const pingTeam = indexnow.pingIndexNow(() => ['/about/team']);
const pingSeminars = indexnow.pingIndexNow(() => ['/seminars']);
const pingBrands = indexnow.pingIndexNow(() => ['/partner-schools']);

// controllers
const { contacpageCreate,
     contacpageData,
     createTeam,
     updateTeam,
     allTeam,
     deleteSingeteam,
     ReviewCreate, Review
     , createSeminar,
     updateSeminar,
     allSeminer,
     deleteSingeSeminer,
     AddVideoPlaylist,
     getAllPlaylist,
     AllBrand,
     getAllBrand,
     updateBrand,
     deleteSingeBrandByID,

} = require("../controllers/data.js");

// router.post("/homepage",HomePageCarusel);
router.post("/contacpage", contacpageCreate)
router.get("/conctact-page", contacpageData);
router.post("/team-create", requireAuth, checkAdmin, pingTeam, createTeam);
router.put("/team-member-update/:id", requireAuth, checkAdmin, pingTeam, updateTeam);
router.get("/team-member", allTeam);
router.delete("/team-member-delete/:_id", requireAuth, checkAdmin, deleteSingeteam);
router.post("//create-review", requireAuth, ReviewCreate);
router.get("/review", Review);
// sesion create:
router.post("/seminar-create", requireAuth, checkAdmin, pingSeminars, createSeminar);
router.put("/seminar-update/:id", requireAuth, checkAdmin, pingSeminars, updateSeminar);
router.get("/seminar", allSeminer);
router.delete("/seminar-delete/:_id", requireAuth, checkAdmin, deleteSingeSeminer);
// video add
router.post("/add-video", requireAuth, checkAdmin,AddVideoPlaylist);
router.get("/video-playlist",getAllPlaylist);
// EN: Brand (partner school) CRUD. Old DELETE used a typo ":is" — kept here
//     in case any cached client still hits it, but the new ":id" form is canonical.
// BN: Brand (partner school) CRUD। পুরাতন DELETE-এ typo ":is" ছিল — cached
//     client থাকলে কাজ করার জন্য রাখা, কিন্তু নতুন ":id" form-ই canonical।
router.post("/brand", requireAuth, checkAdmin, pingBrands, AllBrand);
router.get("/all-brand", getAllBrand);
router.put("/brand/:id", requireAuth, checkAdmin, pingBrands, updateBrand);
router.delete("/brand/:id", requireAuth, checkAdmin, deleteSingeBrandByID);
router.delete("/brand-delete/:id", requireAuth, checkAdmin, deleteSingeBrandByID);
module.exports = router;
