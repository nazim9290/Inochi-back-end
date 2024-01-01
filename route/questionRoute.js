const express = require("express")
const {
    createQuestion,
    getAllQuestions,
    updateQuestion,
    deleteQuestion,
    totalPosts,
    singleQuestion,
    getQuestionByVocabulary,
    getQuestionByGrammer,
    getQuestionByKanji,
    getQuestionByReading,
    getQuestionByFullOne,
    getQuestionByFullTwo
}
    = require('../controlar/questonControlar');
const router = express.Router();
router.post("/create-question", createQuestion);
router.get("/get-all-posts", getAllQuestions);
router.get('/total-posts', totalPosts);
// single post:
router.get("/single-post/:_id", singleQuestion)

// get question by catagory:
router.get("/catagories/vocabulary/", getQuestionByVocabulary);
router.get("/catagories/grammar/", getQuestionByGrammer);
router.get("/catagories/kanji/", getQuestionByKanji);
router.get("catagories/reading", getQuestionByReading);
router.get("catagories/one", getQuestionByFullOne);
router.get("catagories/two", getQuestionByFullTwo);
// 

router.put("/update-question/:_id", updateQuestion)
router.delete("/delete-question/:_id", deleteQuestion);
module.exports = router;
